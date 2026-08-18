import { IngestionService } from './ingestion.service';
import { NhtsaNetworkError } from './nhtsa.client';

const makesXml = `<?xml version="1.0"?>
<Response>
  <Results>
    <AllVehicleMakes>
      <Make_ID>440</Make_ID>
      <Make_Name>ASTON MARTIN</Make_Name>
    </AllVehicleMakes>
    <AllVehicleMakes>
      <Make_ID>441</Make_ID>
      <Make_Name>TESLA</Make_Name>
    </AllVehicleMakes>
  </Results>
</Response>`;

const typesXml = `<?xml version="1.0"?>
<Response>
  <Results>
    <VehicleTypesForMakeIds>
      <VehicleTypeId>2</VehicleTypeId>
      <VehicleTypeName>Passenger Car</VehicleTypeName>
    </VehicleTypesForMakeIds>
  </Results>
</Response>`;

describe('IngestionService', () => {
  const logger = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };

  function createService(overrides?: {
    fetchMakesXml?: jest.Mock;
    fetchVehicleTypesXml?: jest.Mock;
  }) {
    const nhtsaClient = {
      fetchMakesXml:
        overrides?.fetchMakesXml ?? jest.fn().mockResolvedValue(makesXml),
      fetchVehicleTypesXml:
        overrides?.fetchVehicleTypesXml ??
        jest.fn().mockResolvedValue(typesXml),
    };
    const tx = {
      make: {
        upsert: jest.fn().mockResolvedValue({}),
      },
      vehicleType: {
        deleteMany: jest.fn().mockResolvedValue({}),
        createMany: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      make: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<void>) =>
        fn(tx),
      ),
    };
    const config = {
      INGEST_ON_BOOT: false,
      INGEST_MAKE_LIMIT: 0,
      INGEST_CONCURRENCY: 2,
    };
    const service = new IngestionService(
      nhtsaClient as never,
      prisma as never,
      config as never,
      logger as never,
    );
    return { service, nhtsaClient, prisma, tx };
  }

  it('upserts successful makes and skips failed vehicle-type fetches', async () => {
    const fetchVehicleTypesXml = jest
      .fn()
      .mockImplementation(async (makeId: string) => {
        if (makeId === '441') {
          throw new NhtsaNetworkError('NHTSA request failed for vehicle types');
        }
        return typesXml;
      });
    const { service, tx } = createService({ fetchVehicleTypesXml });

    const result = await service.ingest();

    expect(result.makes).toBe(1);
    expect(result.skipped).toBe(1);
    expect(tx.make.upsert).toHaveBeenCalledTimes(1);
    expect(tx.make.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { makeId: '440' },
      }),
    );
  });

  it('does not persist when getallmakes fails', async () => {
    const { service, prisma } = createService({
      fetchMakesXml: jest
        .fn()
        .mockRejectedValue(new NhtsaNetworkError('NHTSA down')),
    });

    await expect(service.ingest()).rejects.toBeInstanceOf(NhtsaNetworkError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
