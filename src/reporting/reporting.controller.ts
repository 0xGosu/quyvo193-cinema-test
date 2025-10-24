import { Controller, Get } from '@nestjs/common';
import { ReportingService } from './reporting.service';

@Controller('report')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('')
  getReport() {
    return this.reportingService.getReport();
  }
}
