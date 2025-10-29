import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
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

@ApiTags('rooms')
@Controller('room')
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
  createRoom(@Body() createRoomDto: CreateRoomDto): Room {
    if (!createRoomDto.name || createRoomDto.name.trim().length === 0) {
      throw new HttpException(
        'Nome da sala é obrigatório',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.roomService.createRoom(createRoomDto.name.trim());
  }

  @Get()
  @ApiOperation({ summary: 'Get all chat rooms' })
  @ApiResponse({
    status: 200,
    description: 'List of all rooms',
    type: [Object],
  })
  getAllRooms(): Room[] {
    return this.roomService.getAllRooms();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific room by ID' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Room found', type: Object })
  @ApiResponse({ status: 404, description: 'Room not found' })
  getRoom(@Param() params: RoomIdDto): Room {
    const room = this.roomService.getRoom(params.id);

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
  deleteRoom(@Param() params: RoomIdDto): MessageResponse {
    const deleted = this.roomService.deleteRoom(params.id);

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
  getRoomMessages(@Param() params: RoomIdDto): RoomMessagesResponse {
    const room = this.roomService.getRoom(params.id);

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
  getRoomParticipants(@Param() params: RoomIdDto): RoomParticipantsResponse {
    const room = this.roomService.getRoom(params.id);

    if (!room) {
      throw new HttpException('Sala não encontrada', HttpStatus.NOT_FOUND);
    }

    return {
      roomId: room.id,
      roomName: room.name,
      participants: this.roomService.getParticipantsWithNames(params.id),
      participantCount: room.participants.length,
    };
  }
}
