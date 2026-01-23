import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UseGuards,
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
import {
  CreateRoomDto,
  RoomIdDto,
  RoomResponseDto,
  RoomMessagesResponseDto,
  RoomParticipantsResponseDto,
  DeleteRoomResponseDto,
} from './dto';
import type { MessageResponse } from '../common/interfaces';
import type { AuthenticatedRequest } from '../common/interfaces';
import { RoomSerializerInterceptor } from '../common/interceptors/room-serializer.interceptor';
import { Public } from '../common/decorators/public.decorator';
import { RoomAccessGuard } from '../common/guards/room-access.guard';

@ApiTags('rooms')
@Controller('rooms')
@UseInterceptors(RoomSerializerInterceptor)
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chat room' })
  @ApiBody({ type: CreateRoomDto })
  @ApiResponse({
    status: 201,
    description: 'Room successfully created',
    type: RoomResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid room name' })
  async createRoom(
    @Req() req: AuthenticatedRequest,
    @Body() createRoomDto: CreateRoomDto,
  ): Promise<Room> {
    // Validation is now automatic via global ValidationPipe
    const createdBy = req.user?.id || null;
    return this.roomService.createRoom(createRoomDto.name.trim(), createdBy);
  }

  @Get()
  @Public()
  @UseGuards(RoomAccessGuard)
  @ApiOperation({ summary: 'Get all chat rooms' })
  @ApiResponse({
    status: 200,
    description: 'List of all rooms',
    type: [RoomResponseDto],
  })
  async getAllRooms(@Req() req: AuthenticatedRequest): Promise<Room[]> {
    const applicationId = req.application?.id;
    if (applicationId) {
      return this.roomService.getRoomsForApplication(applicationId);
    }
    return this.roomService.getAllRooms();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific room by ID' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Room found', type: RoomResponseDto })
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
  @ApiResponse({ status: 200, description: 'Room deleted successfully', type: DeleteRoomResponseDto })
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
    type: RoomMessagesResponseDto,
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
    type: RoomParticipantsResponseDto,
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
