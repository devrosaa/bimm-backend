import { Args, Query, Resolver } from '@nestjs/graphql';
import { Make } from './models/make.model';
import { MakesService } from './makes.service';

@Resolver(() => Make)
export class MakesResolver {
  constructor(private readonly makesService: MakesService) {}

  @Query(() => [Make], { name: 'makes' })
  makes(
    @Args('makeId', { type: () => String, nullable: true }) makeId?: string,
    @Args('makeName', { type: () => String, nullable: true }) makeName?: string,
  ): Promise<Make[]> {
    return this.makesService.findAll({ makeId, makeName });
  }

  @Query(() => Make, { name: 'make', nullable: true })
  make(
    @Args('makeId', { type: () => String }) makeId: string,
  ): Promise<Make | null> {
    return this.makesService.findOne(makeId);
  }
}
