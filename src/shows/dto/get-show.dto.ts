import { IsNotEmpty, IsUUID } from 'class-validator';

export class GetShowDto {
  @IsUUID()
  @IsNotEmpty()
  movieId: string;
}
