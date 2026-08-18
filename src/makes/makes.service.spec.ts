import { MakesService } from './makes.service';

describe('MakesService', () => {
  it('applies default limit and offset', async () => {
    const prisma = {
      make: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new MakesService(prisma as never);

    await service.findAll();

    expect(prisma.make.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        skip: 0,
      }),
    );
  });

  it('caps limit at 200', async () => {
    const prisma = {
      make: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new MakesService(prisma as never);

    await service.findAll({ limit: 999, offset: 10 });

    expect(prisma.make.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 200,
        skip: 10,
      }),
    );
  });
});
