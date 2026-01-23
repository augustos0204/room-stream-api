import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoomApplicationService } from './room-application.service';
import {
  ApplicationRoomListItemDto,
  CreateRoomApplicationDto,
  RoomApplicationListItemDto,
  RoomIdDto,
} from './dto';
import type { AuthenticatedRequest } from '../common/interfaces';
import { RoomSerializerInterceptor } from '../common/interceptors/room-serializer.interceptor';

function getUserId(req: { user?: { id: string } }): string {
  if (!req.user?.id) {
    throw new UnauthorizedException('User not authenticated');
  }
  return req.user.id;
}

@ApiTags('rooms')
@ApiBearerAuth()
@Controller('rooms')
export class RoomApplicationsController {
  constructor(private readonly roomApplicationService: RoomApplicationService) {}

  @Post(':id/applications')
  @ApiOperation({ summary: 'Associate an application with a room' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiBody({ type: CreateRoomApplicationDto })
  @ApiResponse({ status: 201, description: 'Application associated' })
  async addApplicationToRoom(
    @Req() req: AuthenticatedRequest,
    @Param() params: RoomIdDto,
    @Body() dto: CreateRoomApplicationDto,
  ): Promise<void> {
    const userId = getUserId(req);
    await this.roomApplicationService.addApplicationToRoom(
      userId,
      params.id,
      dto.applicationId,
    );
  }

  @Get(':id/applications')
  @ApiOperation({ summary: 'List applications associated with a room' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({
    status: 200,
    description: 'Applications linked to the room',
    type: [RoomApplicationListItemDto],
  })
  async listRoomApplications(
    @Req() req: AuthenticatedRequest,
    @Param() params: RoomIdDto,
  ): Promise<RoomApplicationListItemDto[]> {
    const userId = getUserId(req);
    return this.roomApplicationService.listApplicationsForRoom(userId, params.id);
  }

  @Delete(':id/applications/:applicationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove application from a room' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiParam({ name: 'applicationId', description: 'Application UUID' })
  @ApiResponse({ status: 204, description: 'Association removed' })
  async removeApplicationFromRoom(
    @Req() req: AuthenticatedRequest,
    @Param('id') roomId: string,
    @Param('applicationId') applicationId: string,
  ): Promise<void> {
    const userId = getUserId(req);
    await this.roomApplicationService.removeApplicationFromRoom(
      userId,
      roomId,
      applicationId,
    );
  }
}

@ApiTags('applications')
@ApiBearerAuth()
@Controller('applications')
@UseInterceptors(RoomSerializerInterceptor)
export class ApplicationRoomsController {
  constructor(
    private readonly roomApplicationService: RoomApplicationService,
  ) {}

  @Get(':id/rooms')
  @ApiOperation({ summary: 'List rooms associated with an application' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'Rooms linked to the application',
    type: [ApplicationRoomListItemDto],
  })
  async listApplicationRooms(
    @Req() req: AuthenticatedRequest,
    @Param('id') applicationId: string,
  ): Promise<ApplicationRoomListItemDto[]> {
    const userId = getUserId(req);
    return this.roomApplicationService.listRoomAssociationsForApplicationByUser(
      userId,
      applicationId,
    );
  }
}
