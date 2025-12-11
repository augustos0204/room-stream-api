import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { RoomService } from './room.service';
import type {
  Room,
  RoomMessagesResponse,
  RoomParticipantsResponse,
} from './interfaces';
import { CreateRoomDto, RoomIdDto } from './dto';
import type { MessageResponse } from '../common/interfaces';
import { RoomSerializerInterceptor } from '../common/interceptors/room-serializer.interceptor';

@ApiTags('rooms')
@Controller('room')
@UseInterceptors(RoomSerializerInterceptor)
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chat room' })
  @ApiBody({ type: CreateRoomDto })
  @ApiResponse({
    status: 201,
    description: 'Room successfully created',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'Invalid room name' })
  async createRoom(@Body() createRoomDto: CreateRoomDto): Promise<Room> {
    // Validation is now automatic via global ValidationPipe
    return this.roomService.createRoom(createRoomDto.name.trim());
  }

  @Get()
  @ApiOperation({ summary: 'Get all chat rooms' })
  @ApiResponse({
    status: 200,
    description: 'List of all rooms',
    type: [Object],
  })
  async getAllRooms(): Promise<Room[]> {
    return this.roomService.getAllRooms();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific room by ID' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Room found', type: Object })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getRoom(@Param() params: RoomIdDto): Promise<Room> {
    const room = await this.roomService.getRoom(params.id);

    if (!room) {
      throw new HttpException('Sala não encontrada', HttpStatus.NOT_FOUND);
    }

    return room;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a room' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Room deleted successfully' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async deleteRoom(@Param() params: RoomIdDto): Promise<MessageResponse> {
    const deleted = await this.roomService.deleteRoom(params.id);

    if (!deleted) {
      throw new HttpException('Sala não encontrada', HttpStatus.NOT_FOUND);
    }

    return { message: 'Sala deletada com sucesso' };
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get all messages from a room' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({
    status: 200,
    description: 'Room messages retrieved',
    schema: {
      properties: {
        roomId: { type: 'string' },
        roomName: { type: 'string' },
        messages: { type: 'array', items: { type: 'object' } },
        totalMessages: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getRoomMessages(@Param() params: RoomIdDto): Promise<RoomMessagesResponse> {
    const room = await this.roomService.getRoom(params.id);

    if (!room) {
      throw new HttpException('Sala não encontrada', HttpStatus.NOT_FOUND);
    }

    return {
      roomId: room.id,
      roomName: room.name,
      messages: room.messages,
      totalMessages: room.messages.length,
    };
  }

  @Get(':id/participants')
  @ApiOperation({ summary: 'Get all participants in a room' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({
    status: 200,
    description: 'Room participants retrieved',
    schema: {
      properties: {
        roomId: { type: 'string' },
        roomName: { type: 'string' },
        participants: { type: 'array', items: { type: 'object' } },
        participantCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getRoomParticipants(@Param() params: RoomIdDto): Promise<RoomParticipantsResponse> {
    const room = await this.roomService.getRoom(params.id);

    if (!room) {
      throw new HttpException('Sala não encontrada', HttpStatus.NOT_FOUND);
    }

    const participants = await this.roomService.getParticipantsWithNames(params.id);

    return {
      roomId: room.id,
      roomName: room.name,
      participants,
      participantCount: room.participants.length,
    };
  }
}
