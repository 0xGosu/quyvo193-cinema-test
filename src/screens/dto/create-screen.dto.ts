import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SeatType } from '../../common/enums/seat-type.enum';

class CreateSeatDto {
  @IsString()
  @IsNotEmpty()
  row: string;

  @IsInt()
  @Min(1)
  number: number;

  @IsEnum(SeatType)
  seatType: SeatType;
}

export class CreateScreenDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSeatDto)
  seats: CreateSeatDto[];
}
