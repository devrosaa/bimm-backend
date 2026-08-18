import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { Make } from './models/make.model';
import { MakesService } from './makes.service';

@Resolver(() => Make)
export class MakesResolver {
  constructor(private readonly makesService: MakesService) {}

  @Query(() => [Make], { name: 'makes' })
  makes(
    @Args('makeId', { type: () => String, nullable: true }) makeId?: string,
    @Args('makeName', { type: () => String, nullable: true }) makeName?: string,
    @Args('limit', { type: () => Int, defaultValue: 50 }) limit?: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset?: number,
  ): Promise<Make[]> {
    return this.makesService.findAll({ makeId, makeName, limit, offset });
  }

  @Query(() => Make, { name: 'make', nullable: true })
  make(
    @Args('makeId', { type: () => String }) makeId: string,
  ): Promise<Make | null> {
    return this.makesService.findOne(makeId);
  }
}
