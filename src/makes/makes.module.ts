import { Module } from '@nestjs/common';
import { MakesResolver } from './makes.resolver';
import { MakesService } from './makes.service';

@Module({
  providers: [MakesService, MakesResolver],
})
export class MakesModule {}
