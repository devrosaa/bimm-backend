import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { NhtsaClient } from './nhtsa.client';

@Module({
  controllers: [IngestionController],
  providers: [NhtsaClient, IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
