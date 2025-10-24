import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateShowDto {
  @IsUUID()
  @IsNotEmpty()
  movieId: string;

  @IsUUID()
  @IsNotEmpty()
  screenId: string;

  @IsDateString()
  startTime: string;

  @IsInt()
  @Min(1)
  duration: number; // in minutes

  @IsNumber()
  @Min(0)
  basePrice: number;
}
