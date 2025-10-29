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
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';
import { EventsService } from '../events/events.service';
import {
  JoinRoomDto,
  LeaveRoomDto,
  SendMessageDto,
  UpdateParticipantNameDto,
  GetRoomInfoDto,
} from './dto';

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
export class RoomGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('RoomGateway');

  constructor(
    private readonly roomService: RoomService,
    private readonly eventsService: EventsService,
  ) {}

  afterInit() {
    const apiKeyStatus = process.env.API_KEY ? 'enabled' : 'disabled';
    this.logger.log(
      `Room Gateway inicializado no namespace ${process.env.WEBSOCKET_NAMESPACE || '/ws/rooms'} (API Key auth: ${apiKeyStatus})`,
    );
  }

  handleConnection(client: Socket) {
    // Validate API key if configured
    const API_KEY = process.env.API_KEY;

    if (API_KEY) {
      const apiKey: string | undefined =
        (client.handshake.auth?.apiKey as string) ||
        (client.handshake.headers['x-api-key'] as string) ||
        (client.handshake.query?.apiKey as string);

      if (!apiKey || apiKey !== API_KEY) {
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

  handleDisconnect(client: Socket) {
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
    @ConnectedSocket() client: Socket,
  ): void {
    const { roomId, participantName } = data;
    const room = this.roomService.getRoom(roomId);

    if (!room) {
      client.emit('error', { message: 'Sala não encontrada x1' });
      return;
    }

    // Join no Socket.IO room
    client.join(roomId) as void;

    // Adicionar ao serviço
    this.roomService.joinRoom(roomId, client.id, participantName || null);

    // Notificar outros usuários na sala
    client.to(roomId).emit('userJoined', {
      clientId: client.id,
      participantName: participantName || null,
      roomId: room.id,
      roomName: room.name,
      participantCount: room.participants.length,
    });

    // Confirmar entrada para o cliente
    client.emit('joinedRoom', {
      roomId: room.id,
      roomName: room.name,
      participants: this.roomService.getParticipantsWithNames(roomId),
      recentMessages: room.messages.slice(-10), // Últimas 10 mensagens
    });

    this.logger.log(`Cliente ${client.id} entrou na sala: ${roomId}`);
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
    @ConnectedSocket() client: Socket,
  ): void {
    const { roomId, message } = data;

    // Adicionar mensagem ao serviço
    const roomMessage = this.roomService.addMessage(roomId, client.id, message);

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
    @ConnectedSocket() client: Socket,
  ): void {
    const { roomId, participantName } = data;

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
}
