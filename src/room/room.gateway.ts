import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import {
  Logger,
  UsePipes,
  ValidationPipe,
  UseFilters,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';
import { EventsService } from '../events/events.service';
import { SupabaseService } from '../supabase/supabase.service';
import { User } from '@supabase/supabase-js';
import {
  JoinRoomDto,
  LeaveRoomDto,
  SendMessageDto,
  UpdateParticipantNameDto,
  GetRoomInfoDto,
} from './dto';
import { WsExceptionFilter } from '../common/filters/websocket-exception.filter';

// Estende o Socket para incluir dados do usuário autenticado
interface AuthenticatedSocket extends Socket {
  data: {
    user?: User;
    validationTimer?: NodeJS.Timeout; // Timer para validação periódica do token
  };
}

@WebSocketGateway({
  namespace: process.env.WEBSOCKET_NAMESPACE || '/ws/rooms', // Namespace específico para salas
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['*'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@UseFilters(new WsExceptionFilter())
export class RoomGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('RoomGateway');

  // Intervalo de validação do token (em milissegundos)
  // Padrão: 5 minutos
  private readonly TOKEN_VALIDATION_INTERVAL =
    parseInt(process.env.TOKEN_VALIDATION_INTERVAL || '300000', 10);

  constructor(
    @Inject(forwardRef(() => RoomService))
    private readonly roomService: RoomService,
    private readonly eventsService: EventsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  afterInit() {
    const apiKeyStatus = process.env.API_KEY ? 'enabled' : 'disabled';
    const supabaseStatus = this.supabaseService.isEnabled()
      ? 'enabled'
      : 'disabled';
    this.logger.log(
      `Room Gateway inicializado no namespace ${process.env.WEBSOCKET_NAMESPACE || '/ws/rooms'} \nAPI Key auth: ${apiKeyStatus};\nSupabase auth: ${supabaseStatus};`,
    );
  }

  async handleConnection(client: AuthenticatedSocket) {
    const API_KEY = process.env.API_KEY;

    if (API_KEY) {
      const apiKey: string | undefined =
        (client.handshake.auth?.apiKey as string) ||
        (client.handshake.headers['x-api-key'] as string) ||
        (client.handshake.query?.apiKey as string);

      if (apiKey === API_KEY) {
        const namespace = client.nsp.name;
        this.eventsService.emitMetricsEvent('metrics:client-connected', {
          clientId: client.id,
          namespace,
          timestamp: new Date(),
        });
        this.logger.log(
          `Cliente conectado no namespace ${namespace}: ${client.id}`,
        );
        return;
      }
    }

    if (this.supabaseService.isEnabled()) {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(
          `WebSocket connection rejected: missing Supabase token from ${client.handshake.address}`,
        );
        client.emit('error', {
          message:
            'Authentication failed: Missing Supabase token. Provide it via auth.token or Authorization header.',
        });
        client.disconnect();
        return;
      }

      const user = await this.supabaseService.validateToken(token);

      if (!user) {
        this.logger.warn(
          `WebSocket connection rejected: invalid Supabase token from ${client.handshake.address}`,
        );
        client.emit('error', {
          message: 'Authentication failed: Invalid or expired Supabase token.',
        });
        client.disconnect();
        return;
      }

      client.data.user = user;

      this.logger.log(
        `User authenticated via Supabase: ${user.id} (${user.email})`,
      );

      // Iniciar validação periódica do token Supabase
      this.startTokenValidation(client);

      const namespace = client.nsp.name;
      this.eventsService.emitMetricsEvent('metrics:client-connected', {
        clientId: client.id,
        namespace,
        timestamp: new Date(),
      });
      this.logger.log(
        `Cliente conectado no namespace ${namespace}: ${client.id}`,
      );
      return;
    }

    if (API_KEY) {
      this.logger.warn(
        `WebSocket connection rejected: invalid or missing API key from ${client.handshake.address}`,
      );
      client.emit('error', {
        message:
          'Authentication failed: Invalid or missing API key. Provide it via auth.apiKey, x-api-key header, or apiKey query parameter',
      });
      client.disconnect();
      return;
    }

    const namespace = client.nsp.name;
    this.eventsService.emitMetricsEvent('metrics:client-connected', {
      clientId: client.id,
      namespace,
      timestamp: new Date(),
    });
    this.logger.log(
      `Cliente conectado no namespace ${namespace}: ${client.id}`,
    );
  }

  /**
   * Extrai token JWT da conexão WebSocket
   * Verifica: auth.token, Authorization header
   */
  private extractToken(client: Socket): string | null {
    // 1. Verificar auth.token (recomendado)
    const authToken = client.handshake.auth?.token as string;
    if (authToken) {
      return authToken;
    }

    // 2. Verificar Authorization header
    const authHeader = client.handshake.headers.authorization as string;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  /**
   * Inicia a validação periódica do token Supabase
   * Valida o token a cada intervalo configurado e desconecta se expirado
   */
  private startTokenValidation(client: AuthenticatedSocket): void {
    if (!client.data.user) {
      return; // Não há usuário Supabase para validar
    }

    const userId = client.data.user.id;
    const userEmail = client.data.user.email;

    this.logger.debug(
      `Iniciando validação periódica do token para usuário ${userId} a cada ${this.TOKEN_VALIDATION_INTERVAL / 1000}s`,
    );

    // Validar token periodicamente
    const validationTimer = setInterval(async () => {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(
          `Token não encontrado para usuário ${userId}, desconectando`,
        );
        this.stopTokenValidation(client);
        client.emit('error', {
          message: 'Token not found. Please reconnect with a valid token.',
        });
        client.disconnect();
        return;
      }

      const user = await this.supabaseService.validateToken(token);

      if (!user) {
        this.logger.warn(
          `Token expirado ou inválido para usuário ${userId} (${userEmail}), desconectando`,
        );
        this.stopTokenValidation(client);
        client.emit('tokenExpired', {
          message: 'Your session has expired. Please log in again.',
          userId: userId,
        });
        client.disconnect();
        return;
      }

      this.logger.debug(
        `Token validado com sucesso para usuário ${userId} (${userEmail})`,
      );
    }, this.TOKEN_VALIDATION_INTERVAL);

    // Armazenar o timer no client.data para limpeza posterior
    client.data.validationTimer = validationTimer;
  }

  /**
   * Para a validação periódica do token
   */
  private stopTokenValidation(client: AuthenticatedSocket): void {
    if (client.data.validationTimer) {
      clearInterval(client.data.validationTimer);
      client.data.validationTimer = undefined;
      this.logger.debug(
        `Validação periódica do token parada para cliente ${client.id}`,
      );
    }
  }

  /**
   * Extracts minimal Supabase user data from authenticated socket
   * @param client - Authenticated socket client
   * @returns SupabaseUserData if user is authenticated, null otherwise
   */
  private extractSupabaseUserData(client: AuthenticatedSocket) {
    const user = client.data?.user;
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || null,
      name: user.user_metadata?.name || null,
    };
  }

  handleDisconnect(client: AuthenticatedSocket) {
    // Parar validação periódica do token se estiver ativa
    this.stopTokenValidation(client);

    const namespace = client.nsp.name;
    this.eventsService.emitMetricsEvent('metrics:client-disconnected', {
      clientId: client.id,
      namespace,
      timestamp: new Date(),
    });
    this.logger.log(
      `Cliente desconectado do namespace ${namespace}: ${client.id}`,
    );

    // Remove o cliente de todas as salas ao desconectar
    const rooms = this.roomService.getAllRooms();
    rooms.forEach((room) => {
      if (room.participants.includes(client.id)) {
        const participantName = this.roomService.getParticipantName(
          room.id,
          client.id,
        );
        this.roomService.leaveRoom(room.id, client.id);
        client.to(room.id).emit('userLeft', {
          clientId: client.id,
          participantName,
          roomId: room.id,
          roomName: room.name,
          participantCount: room.participants.length,
        });
      }
    });
  }

  @SubscribeMessage('joinRoom')
  @UsePipes(new ValidationPipe({ transform: true }))
  handleJoinRoom(
    @MessageBody() data: JoinRoomDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    const { roomId, participantName } = data;
    const room = this.roomService.getRoom(roomId);

    if (!room) {
      client.emit('error', { message: 'Sala não encontrada x1' });
      return;
    }

    // Se usuário está autenticado via Supabase, usar dados do Supabase
    const user = client.data?.user;
    const displayName = user
      ? user.email || user.user_metadata?.name || 'User'
      : participantName || null;

    // Extract Supabase user data
    const supabaseUserData = this.extractSupabaseUserData(client);

    // Join no Socket.IO room
    client.join(roomId) as void;

    // Adicionar ao serviço
    this.roomService.joinRoom(roomId, client.id, displayName, supabaseUserData);

    // Notificar outros usuários na sala
    client.to(roomId).emit('userJoined', {
      clientId: client.id,
      participantName: displayName,
      roomId: room.id,
      roomName: room.name,
      participantCount: room.participants.length,
      supabaseUser: supabaseUserData || undefined,
    });

    // Confirmar entrada para o cliente
    client.emit('joinedRoom', {
      roomId: room.id,
      roomName: room.name,
      participants: this.roomService.getParticipantsWithNames(roomId),
      recentMessages: room.messages.slice(-10), // Últimas 10 mensagens
    });

    this.logger.log(
      `Cliente ${client.id} ${user ? `(Supabase user: ${user.id})` : '(anonymous)'} entrou na sala: ${roomId}`,
    );
  }

  @SubscribeMessage('leaveRoom')
  @UsePipes(new ValidationPipe({ transform: true }))
  handleLeaveRoom(
    @MessageBody() data: LeaveRoomDto,
    @ConnectedSocket() client: Socket,
  ): void {
    const { roomId } = data;

    // Leave no Socket.IO room
    client.leave(roomId) as void;

    // Remover do serviço
    const success = this.roomService.leaveRoom(roomId, client.id);

    if (success) {
      const room = this.roomService.getRoom(roomId);

      // Notificar outros usuários na sala
      const participantName = this.roomService.getParticipantName(
        roomId,
        client.id,
      );
      client.to(roomId).emit('userLeft', {
        clientId: client.id,
        participantName,
        roomId: roomId,
        roomName: room?.name,
        participantCount: room?.participants.length || 0,
      });

      // Confirmar saída para o cliente
      client.emit('leftRoom', { roomId });

      this.logger.log(`Cliente ${client.id} saiu da sala: ${roomId}`);
    }
  }

  @SubscribeMessage('sendMessage')
  @UsePipes(new ValidationPipe({ transform: true }))
  handleSendMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    const { roomId, message } = data;

    // Extract Supabase user data
    const supabaseUserData = this.extractSupabaseUserData(client);

    // Adicionar mensagem ao serviço
    const roomMessage = this.roomService.addMessage(
      roomId,
      client.id,
      message,
      supabaseUserData,
    );

    if (!roomMessage) {
      client.emit('error', { message: 'Não foi possível enviar a mensagem' });
      return;
    }

    // Enviar mensagem para todos os usuários na sala
    this.server.to(roomId).emit('newMessage', {
      id: roomMessage.id,
      clientId: roomMessage.clientId,
      message: roomMessage.message,
      timestamp: roomMessage.timestamp,
      roomId: roomId,
      supabaseUser: roomMessage.supabaseUser || undefined,
    });

    this.logger.log(
      `Mensagem enviada na sala ${roomId} por ${client.id}: ${message}`,
    );
  }

  @SubscribeMessage('getRoomInfo')
  @UsePipes(new ValidationPipe({ transform: true }))
  handleGetRoomInfo(
    @MessageBody() data: GetRoomInfoDto,
    @ConnectedSocket() client: Socket,
  ): void {
    const { roomId } = data;
    const room = this.roomService.getRoom(roomId);

    if (!room) {
      client.emit('error', { message: 'Sala não encontrada x2' });
      return;
    }

    client.emit('roomInfo', {
      id: room.id,
      name: room.name,
      participantCount: room.participants.length,
      participants: this.roomService.getParticipantsWithNames(roomId),
      messageCount: room.messages.length,
      createdAt: room.createdAt,
    });
  }

  @SubscribeMessage('updateParticipantName')
  @UsePipes(new ValidationPipe({ transform: true }))
  handleUpdateParticipantName(
    @MessageBody() data: UpdateParticipantNameDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    const { roomId, participantName } = data;

    // Se usuário está autenticado via Supabase, não permitir atualização de nome
    const user = client.data?.user;
    if (user) {
      client.emit('error', {
        message:
          'Não é possível atualizar o nome de usuários autenticados.',
      });
      this.logger.warn(
        `Tentativa de atualizar nome bloqueada para usuário autenticado: ${user.id}`,
      );
      return;
    }

    const success = this.roomService.updateParticipantName(
      roomId,
      client.id,
      participantName,
    );

    if (success) {
      // Notificar outros usuários na sala sobre a atualização do nome
      client.to(roomId).emit('participantNameUpdated', {
        clientId: client.id,
        participantName,
        roomId,
      });

      // Confirmar atualização para o cliente
      client.emit('participantNameUpdated', {
        clientId: client.id,
        participantName,
        roomId,
      });

      this.logger.log(
        `Nome do participante ${client.id} atualizado para: ${participantName || 'sem nome'}`,
      );
    } else {
      client.emit('error', { message: 'Não foi possível atualizar o nome' });
    }
  }

  /**
   * Broadcast room deletion to all clients in the room
   * Called by RoomService when a room is deleted
   */
  broadcastRoomDeleted(roomId: string, roomName: string): void {
    this.server.to(roomId).emit('roomDeleted', {
      roomId,
      roomName,
      message: `A sala "${roomName}" foi deletada`,
    });

    this.logger.log(
      `Broadcast de deleção enviado para sala ${roomId} (${roomName})`,
    );
  }
}
