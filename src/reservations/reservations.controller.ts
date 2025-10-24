import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { GetUserId } from '../common/decorators/user-id.decorator';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  create(
    @Body() createReservationDto: CreateReservationDto,
    @GetUserId() userId: string, // Simple auth
  ) {
    return this.reservationsService.create(createReservationDto, userId);
  }

  @Post(':id/confirm')
  confirm(@Param('id', ParseUUIDPipe) id: string, @GetUserId() userId: string) {
    return this.reservationsService.confirm(id);
  }

  @Delete(':id')
  cancel(@Param('id', ParseUUIDPipe) id: string, @GetUserId() userId: string) {
    return this.reservationsService.cancel(id, userId);
  }
}
