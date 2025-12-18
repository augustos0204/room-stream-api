import {
  IsString,
  IsOptional,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating an application
 */
export class UpdateApplicationDto {
  @ApiPropertyOptional({
    description: 'Name of the application',
    example: 'My Updated App',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Name must be at most 255 characters' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of the application',
    example: 'Updated description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description must be at most 1000 characters' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the application is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
