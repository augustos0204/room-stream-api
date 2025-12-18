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
import { ApplicationService } from '../application/application.service';
import { User } from '@supabase/supabase-js';
import {
  JoinRoomDto,
  LeaveRoomDto,
  SendMessageDto,
  UpdateParticipantNameDto,
  GetRoomInfoDto,
} from './dto';
import { WsExceptionFilter } from '../common/filters/websocket-exception.filter';

/**
 * Data structure for application connection
 */
interface ApplicationData {
  id: string;
  name: string;
  createdBy: string;
}

// Estende o Socket para incluir dados do usuário autenticado ou aplicação
interface AuthenticatedSocket extends Socket {
  data: {
    user?: User;
    application?: ApplicationData; // Dados da aplicação conectada
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
    private readonly applicationService: ApplicationService,
  ) {}

  afterInit() {
    const apiKeyStatus = process.env.API_KEY ? 'enabled' : 'disabled';
    const supabaseStatus = this.supabaseService.isEnabled()
      ? 'enabled'
      : 'disabled';
    this.logger.log(
      `Room Gateway inicializado no namespace ${process.env.WEBSOCKET_NAMESPACE || '/ws/rooms'} \nAPI Key auth: ${apiKeyStatus};\nSupabase auth: ${supabaseStatus};\nApplication auth: enabled;`,
    );
  }

  async handleConnection(client: AuthenticatedSocket) {
    const API_KEY = process.env.API_KEY;

    // 1. Check for Application API Key (x-app-key)
    const appKey: string | undefined =
      (client.handshake.auth?.appKey as string) ||
      (client.handshake.headers['x-app-key'] as string) ||
      (client.handshake.query?.appKey as string);

    if (appKey) {
      const application = await this.applicationService.validateApiKey(appKey);
      
      if (application) {
        // Store application data in socket
        client.data.application = {
          id: application.id,
          name: application.name,
          createdBy: application.created_by,
        };

        const namespace = client.nsp.name;
        this.eventsService.emitMetricsEvent('metrics:client-connected', {
          clientId: client.id,
          namespace,
          timestamp: new Date(),
        });
        this.logger.log(
          `Application connected: ${application.name} (${application.id}) on ${namespace}`,
        );
        return;
      } else {
        this.logger.warn(
          `WebSocket connection rejected: invalid x-app-key from ${client.handshake.address}`,
        );
        client.emit('error', {
          message: 'Authentication failed: Invalid or inactive application key.',
        });
        client.disconnect();
        return;
      }
    }

    // 2. Check for global API Key
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

    // 3. Check for Supabase token
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

    // 4. Reject if API_KEY is configured but not provided
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

    // 5. No authentication required (development mode)
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
    // Verificar se Supabase está habilitado antes de iniciar validação
    if (!this.supabaseService.isEnabled()) {
      this.logger.debug(
        'Validação periódica de token não iniciada: Supabase não está configurado',
      );
      return;
    }

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
      // Verificar novamente se Supabase ainda está habilitado
      if (!this.supabaseService.isEnabled()) {
        this.logger.warn(
          'Supabase foi desabilitado durante a validação, parando timer',
        );
        this.stopTokenValidation(client);
        return;
      }

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

  /**
   * Extracts application data from authenticated socket
   * @param client - Authenticated socket client
   * @returns ApplicationData if application is connected, null otherwise
   */
  private extractApplicationData(client: AuthenticatedSocket): ApplicationData | null {
    return client.data?.application || null;
  }

  /**
   * Gets display name for a client (user, application, or anonymous)
   */
  private getClientDisplayName(client: AuthenticatedSocket, participantName?: string): string | null {
    // If connected as application
    const app = client.data?.application;
    if (app) {
      return `[App] ${app.name}`;
    }

    // If connected as Supabase user
    const user = client.data?.user;
    if (user) {
      return user.email || user.user_metadata?.name || 'User';
    }

    // Anonymous user with custom name
    return participantName || null;
  }

  /**
   * Gets the participant key for storage (applicationId, userId, or clientId)
   */
  private getParticipantKey(client: AuthenticatedSocket): string {
    // Application has priority
    if (client.data?.application) {
      return `app_${client.data.application.id}`;
    }
    // Then Supabase user
    if (client.data?.user) {
      return client.data.user.id;
    }
    // Fallback to socket ID
    return client.id;
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    // Parar validação periódica do token se estiver ativa
    this.stopTokenValidation(client);

    const namespace = client.nsp.name;
    this.eventsService.emitMetricsEvent('metrics:client-disconnected', {
      clientId: client.id,
      namespace,
      timestamp: new Date(),
    });

    const application = this.extractApplicationData(client);
    if (application) {
      this.logger.log(
        `Application disconnected: ${application.name} (${application.id})`,
      );
    } else {
      this.logger.log(
        `Cliente desconectado do namespace ${namespace}: ${client.id}`,
      );
    }

    const userId = client.data?.user?.id || null;
    const supabaseUserData = this.extractSupabaseUserData(client);

    // Remove o cliente de todas as salas ao desconectar
    const rooms = await this.roomService.getAllRooms();
    for (const room of rooms) {
      // Check if participant exists using hybrid key
      const participantKey = this.getParticipantKey(client);
      if (room.participants.includes(participantKey)) {
        const participantName = await this.roomService.getParticipantName(
          room.id,
          client.id,
          userId,
        );
        
        const displayName = participantName 
          || application?.name
          || supabaseUserData?.email 
          || null;
          
        await this.roomService.leaveRoom(room.id, client.id, userId);
        client.to(room.id).emit('userLeft', {
          clientId: client.id,
          participantName: displayName,
          roomId: room.id,
          roomName: room.name,
          participantCount: room.participants.length,
          isApplication: !!application,
        });
      }
    }
  }

  @SubscribeMessage('joinRoom')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleJoinRoom(
    @MessageBody() data: JoinRoomDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    const { roomId, participantName } = data;
    const room = await this.roomService.getRoom(roomId);

    if (!room) {
      client.emit('error', { message: 'Sala não encontrada x1' });
      return;
    }

    // Get display name based on connection type
    const displayName = this.getClientDisplayName(client, participantName);

    // Extract data based on connection type
    const supabaseUserData = this.extractSupabaseUserData(client);
    const applicationData = this.extractApplicationData(client);

    // Join no Socket.IO room
    client.join(roomId) as void;

    // Adicionar ao serviço
    await this.roomService.joinRoom(roomId, client.id, displayName, supabaseUserData);

    // Notificar outros usuários na sala
    client.to(roomId).emit('userJoined', {
      clientId: client.id,
      participantName: displayName,
      roomId: room.id,
      roomName: room.name,
      participantCount: room.participants.length,
      supabaseUser: supabaseUserData || undefined,
      application: applicationData || undefined,
      isApplication: !!applicationData,
    });

    // Confirmar entrada para o cliente
    const participants = await this.roomService.getParticipantsWithNames(roomId);
    client.emit('joinedRoom', {
      roomId: room.id,
      roomName: room.name,
      participants,
      recentMessages: room.messages.slice(-10), // Últimas 10 mensagens
    });

    const user = client.data?.user;
    const app = client.data?.application;
    this.logger.log(
      `Cliente ${client.id} ${app ? `(App: ${app.name})` : user ? `(Supabase user: ${user.id})` : '(anonymous)'} entrou na sala: ${roomId}`,
    );
  }

  @SubscribeMessage('leaveRoom')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleLeaveRoom(
    @MessageBody() data: LeaveRoomDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    const { roomId } = data;

    // Extract userId from authenticated socket
    const userId = client.data?.user?.id || null;
    
    // Extract data for display name
    const supabaseUserData = this.extractSupabaseUserData(client);
    const applicationData = this.extractApplicationData(client);

    // Get participant name BEFORE removing from room
    const participantName = await this.roomService.getParticipantName(
      roomId,
      client.id,
      userId,
    );
    
    // Use appropriate fallback for display name
    const displayName = participantName 
      || applicationData?.name
      || supabaseUserData?.email 
      || null;

    // Leave no Socket.IO room
    client.leave(roomId) as void;

    // Remover do serviço
    const success = await this.roomService.leaveRoom(roomId, client.id, userId);

    if (success) {
      const room = await this.roomService.getRoom(roomId);

      // Notificar outros usuários na sala
      client.to(roomId).emit('userLeft', {
        clientId: client.id,
        participantName: displayName,
        roomId: roomId,
        roomName: room?.name,
        participantCount: room?.participants.length || 0,
        isApplication: !!applicationData,
      });

      // Confirmar saída para o cliente
      client.emit('leftRoom', { roomId });

      this.logger.log(`Cliente ${client.id} saiu da sala: ${roomId}`);
    }
  }

  @SubscribeMessage('emit')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleEmit(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    const { roomId, message, event = 'message' } = data;

    // Extract data based on connection type
    const supabaseUserData = this.extractSupabaseUserData(client);
    const applicationData = this.extractApplicationData(client);

    // Adicionar mensagem ao serviço
    const roomMessage = await this.roomService.addMessage(
      roomId,
      client.id,
      message,
      supabaseUserData,
      event,
    );

    if (!roomMessage) {
      client.emit('error', { message: 'Não foi possível enviar o evento' });
      return;
    }

    // Emitir evento customizado para todos os usuários na sala
    this.server.to(roomId).emit(event, {
      id: roomMessage.id,
      clientId: roomMessage.clientId,
      userId: roomMessage.userId,
      event: roomMessage.event,
      message: roomMessage.message,
      timestamp: roomMessage.timestamp,
      roomId: roomId,
      supabaseUser: roomMessage.supabaseUser || undefined,
      application: applicationData || undefined,
      isApplication: !!applicationData,
    });

    this.logger.log(
      `Evento [${event}] emitido na sala ${roomId} por ${applicationData ? `App:${applicationData.name}` : client.id}: ${message}`,
    );
  }

  /**
   * Alias for 'emit' event - backwards compatibility
   * @deprecated Use 'emit' event instead
   */
  @SubscribeMessage('sendMessage')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleSendMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    // Delegate to handleEmit with default event 'message'
    return this.handleEmit({ ...data, event: data.event || 'message' }, client);
  }

  @SubscribeMessage('getRoomInfo')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleGetRoomInfo(
    @MessageBody() data: GetRoomInfoDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { roomId } = data;
    const room = await this.roomService.getRoom(roomId);

    if (!room) {
      client.emit('error', { message: 'Sala não encontrada x2' });
      return;
    }

    const participants = await this.roomService.getParticipantsWithNames(roomId);

    client.emit('roomInfo', {
      id: room.id,
      name: room.name,
      participantCount: room.participants.length,
      participants,
      messageCount: room.messages.length,
      createdAt: room.createdAt,
    });
  }

  @SubscribeMessage('updateParticipantName')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleUpdateParticipantName(
    @MessageBody() data: UpdateParticipantNameDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    const { roomId, participantName } = data;

    // Se é uma aplicação, não permitir atualização de nome
    const app = client.data?.application;
    if (app) {
      client.emit('error', {
        message: 'Aplicações não podem atualizar o nome.',
      });
      return;
    }

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

    // For anonymous users, userId is null
    const success = await this.roomService.updateParticipantName(
      roomId,
      client.id,
      participantName,
      null, // Anonymous users don't have userId
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
