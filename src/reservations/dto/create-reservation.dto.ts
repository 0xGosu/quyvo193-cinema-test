import { ArrayMinSize, IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateReservationDto {
  @IsUUID()
  @IsNotEmpty()
  showId: string;

  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  seatIds: string[];
}
