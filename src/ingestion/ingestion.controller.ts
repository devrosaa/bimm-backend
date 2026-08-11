import { Controller, HttpCode, Post } from '@nestjs/common';
import { IngestionService } from './ingestion.service';

@Controller('admin')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('ingest')
  @HttpCode(200)
  async ingest() {
    const result = await this.ingestionService.ingest();
    return {
      status: 'ok',
      ...result,
    };
  }
}
