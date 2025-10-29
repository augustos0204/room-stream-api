import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Reusable DTO for :id route parameters
 *
 * Use this DTO when you need to validate route parameters with an ID.
 *
 * @example
 * ```typescript
 * @Get(':id')
 * getResource(@Param() params: IdParamDto) {
 *   return this.service.findById(params.id);
 * }
 * ```
 */
export class IdParamDto {
  @ApiProperty({
    description: 'Resource ID',
    example: 'room_1234567890_abc123def',
  })
  @IsString()
  @IsNotEmpty()
  id: string;
}
