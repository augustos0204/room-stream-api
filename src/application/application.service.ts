import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateApplicationDto, UpdateApplicationDto } from './dto';
import { randomBytes } from 'crypto';

/**
 * Interface for Application entity from database
 */
export interface Application {
  id: string;
  name: string;
  description: string | null;
  key: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

@Injectable()
export class ApplicationService {
  private readonly logger = new Logger(ApplicationService.name);
  private readonly TABLE_NAME = 'applications';

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Generates a secure API key for an application
   * Format: app_{64 random hex characters}
   */
  private generateApiKey(): string {
    const randomPart = randomBytes(32).toString('hex');
    return `app_${randomPart}`;
  }

  /**
   * Masks an API key for display (shows only last 8 characters)
   */
  private maskApiKey(key: string): string {
    if (key.length <= 12) return key;
    return '••••••••' + key.slice(-8);
  }

  /**
   * Creates a new application
   */
  async create(
    userId: string,
    dto: CreateApplicationDto,
  ): Promise<Application> {
    const client = this.supabaseService.getClient();
    if (!client) {
      throw new InternalServerErrorException('Supabase is not configured');
    }

    const apiKey = this.generateApiKey();

    const { data, error } = await client
      .from(this.TABLE_NAME)
      .insert({
        name: dto.name,
        description: dto.description || null,
        key: apiKey,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create application: ${error.message}`);
      throw new InternalServerErrorException('Failed to create application');
    }

    this.logger.log(`Application created: ${data.id} by user ${userId}`);
    return data;
  }

  /**
   * Lists all applications for a user
   */
  async findAllByUser(userId: string): Promise<Application[]> {
    const client = this.supabaseService.getClient();
    if (!client) {
      throw new InternalServerErrorException('Supabase is not configured');
    }

    const { data, error } = await client
      .from(this.TABLE_NAME)
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to list applications: ${error.message}`);
      throw new InternalServerErrorException('Failed to list applications');
    }

    return data || [];
  }

  /**
   * Gets a single application by ID
   */
  async findOne(userId: string, id: string): Promise<Application> {
    const client = this.supabaseService.getClient();
    if (!client) {
      throw new InternalServerErrorException('Supabase is not configured');
    }

    const { data, error } = await client
      .from(this.TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Application not found');
    }

    if (data.created_by !== userId) {
      throw new ForbiddenException('You do not have access to this application');
    }

    return data;
  }

  /**
   * Updates an application
   */
  async update(
    userId: string,
    id: string,
    dto: UpdateApplicationDto,
  ): Promise<Application> {
    // First check if user owns the application
    await this.findOne(userId, id);

    const client = this.supabaseService.getClient();
    if (!client) {
      throw new InternalServerErrorException('Supabase is not configured');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;

    const { data, error } = await client
      .from(this.TABLE_NAME)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update application: ${error.message}`);
      throw new InternalServerErrorException('Failed to update application');
    }

    this.logger.log(`Application updated: ${id}`);
    return data;
  }

  /**
   * Deletes an application
   */
  async delete(userId: string, id: string): Promise<void> {
    // First check if user owns the application
    await this.findOne(userId, id);

    const client = this.supabaseService.getClient();
    if (!client) {
      throw new InternalServerErrorException('Supabase is not configured');
    }

    const { error } = await client
      .from(this.TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete application: ${error.message}`);
      throw new InternalServerErrorException('Failed to delete application');
    }

    this.logger.log(`Application deleted: ${id}`);
  }

  /**
   * Regenerates the API key for an application
   */
  async regenerateKey(userId: string, id: string): Promise<Application> {
    // First check if user owns the application
    await this.findOne(userId, id);

    const client = this.supabaseService.getClient();
    if (!client) {
      throw new InternalServerErrorException('Supabase is not configured');
    }

    const newApiKey = this.generateApiKey();

    const { data, error } = await client
      .from(this.TABLE_NAME)
      .update({ key: newApiKey })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to regenerate API key: ${error.message}`);
      throw new InternalServerErrorException('Failed to regenerate API key');
    }

    this.logger.log(`API key regenerated for application: ${id}`);
    return data;
  }

  /**
   * Validates an API key and returns the application if valid
   */
  async validateApiKey(apiKey: string): Promise<Application | null> {
    const client = this.supabaseService.getClient();
    if (!client) {
      return null;
    }

    const { data, error } = await client
      .from(this.TABLE_NAME)
      .select('*')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Transforms application for list response (masks API key)
   */
  toListItem(app: Application) {
    return {
      id: app.id,
      name: app.name,
      description: app.description,
      keyPreview: this.maskApiKey(app.key),
      createdAt: app.created_at,
      isActive: app.is_active,
    };
  }

  /**
   * Transforms application for full response
   */
  toResponse(app: Application) {
    return {
      id: app.id,
      name: app.name,
      description: app.description,
      key: app.key,
      createdBy: app.created_by,
      createdAt: app.created_at,
      updatedAt: app.updated_at,
      isActive: app.is_active,
    };
  }
}
