import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAffirmationDto {
  @ApiProperty({
    description: 'The inspirational quote text',
    example:
      'Believe in yourself and all that you are. Know that there is something inside you that is greater than any obstacle.',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Quote must be at least 10 characters long' })
  @MaxLength(1000, { message: 'Quote must not exceed 1000 characters' })
  quote: string;

  @ApiProperty({
    description: 'The author of the quote',
    example: 'Christian D. Larson',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Author name must not exceed 100 characters' })
  author: string;

  @ApiProperty({
    description: 'URL of the background image for the affirmation',
    example:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: 'Background image must be a valid URL' })
  backgroundImage: string;
}
