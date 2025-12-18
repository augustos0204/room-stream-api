import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new application
 */
export class CreateApplicationDto {
  @ApiProperty({
    description: 'Name of the application',
    example: 'My Mobile App',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Application name is required' })
  @MaxLength(255, { message: 'Name must be at most 255 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the application',
    example: 'Mobile app for customer support',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description must be at most 1000 characters' })
  description?: string;
}
