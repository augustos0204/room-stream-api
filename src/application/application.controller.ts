import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ApplicationService } from './application.service';
import {
  CreateApplicationDto,
  UpdateApplicationDto,
  ApplicationResponseDto,
  ApplicationListItemDto,
} from './dto';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';

/**
 * Helper to extract user ID from request
 * Throws UnauthorizedException if user is not authenticated
 */
function getUserId(req: { user?: { id: string } }): string {
  if (!req.user?.id) {
    throw new UnauthorizedException('User not authenticated');
  }
  return req.user.id;
}

@ApiTags('applications')
@ApiBearerAuth()
@Controller('application')
@UseGuards(SupabaseAuthGuard)
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new application' })
  @ApiResponse({
    status: 201,
    description: 'Application created successfully',
    type: ApplicationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Req() req,
    @Body() dto: CreateApplicationDto,
  ): Promise<ApplicationResponseDto> {
    const userId = getUserId(req);
    const application = await this.applicationService.create(userId, dto);
    return this.applicationService.toResponse(application);
  }

  @Get()
  @ApiOperation({ summary: 'List all applications for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'List of applications',
    type: [ApplicationListItemDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Req() req): Promise<ApplicationListItemDto[]> {
    const userId = getUserId(req);
    const applications = await this.applicationService.findAllByUser(userId);
    return applications.map((app) => this.applicationService.toListItem(app));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific application by ID' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'Application details',
    type: ApplicationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async findOne(
    @Req() req,
    @Param('id') id: string,
  ): Promise<ApplicationResponseDto> {
    const userId = getUserId(req);
    const application = await this.applicationService.findOne(userId, id);
    return this.applicationService.toResponse(application);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an application' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'Application updated successfully',
    type: ApplicationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
  ): Promise<ApplicationResponseDto> {
    const userId = getUserId(req);
    const application = await this.applicationService.update(userId, id, dto);
    return this.applicationService.toResponse(application);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an application' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({ status: 204, description: 'Application deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async delete(@Req() req, @Param('id') id: string): Promise<void> {
    const userId = getUserId(req);
    await this.applicationService.delete(userId, id);
  }

  @Post(':id/regenerate-key')
  @ApiOperation({ summary: 'Regenerate the API key for an application' })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'API key regenerated successfully',
    type: ApplicationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async regenerateKey(
    @Req() req,
    @Param('id') id: string,
  ): Promise<ApplicationResponseDto> {
    const userId = getUserId(req);
    const application = await this.applicationService.regenerateKey(userId, id);
    return this.applicationService.toResponse(application);
  }
}
