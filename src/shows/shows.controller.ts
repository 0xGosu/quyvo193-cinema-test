import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ShowsService } from './shows.service';
import { CreateShowDto } from './dto/create-show.dto';
import { GetShowDto } from './dto/get-show.dto';

@Controller('shows')
export class ShowsController {
  constructor(private readonly showsService: ShowsService) {}

  @Post()
  create(@Body() createShowDto: CreateShowDto) {
    return this.showsService.create(createShowDto);
  }

  @Get()
  findAllOfMovie(@Body() getShowDto: GetShowDto) {
    return this.showsService.findAllOfMovie(getShowDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.showsService.findOne(id);
  }

  @Get(':id/seats')
  getShowSeatsWithStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.showsService.getShowSeatsWithStatus(id);
  }
}
