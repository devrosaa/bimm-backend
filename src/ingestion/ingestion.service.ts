import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { NhtsaClient } from './nhtsa.client';
import {
  combineMakeWithTypes,
  parseMakesXml,
  parseVehicleTypesXml,
} from './transform';
import type { MakeDto } from './types';

@Injectable()
export class IngestionService implements OnModuleInit {
  private running = false;

  constructor(
    private readonly nhtsaClient: NhtsaClient,
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @InjectPinoLogger(IngestionService.name)
    private readonly logger: PinoLogger,
  ) {}

  async onModuleInit() {
    if (!this.config.INGEST_ON_BOOT) {
      return;
    }

    const count = await this.prisma.make.count();
    if (count > 0) {
      this.logger.info({ count }, 'Skipping boot ingest; database already seeded');
      return;
    }

    try {
      await this.ingest();
    } catch (error) {
      this.logger.error({ err: error }, 'Boot-time ingestion failed');
    }
  }

  async ingest(): Promise<{ makes: number; vehicleTypes: number }> {
    if (this.running) {
      throw new Error('Ingestion already in progress');
    }

    this.running = true;
    const startedAt = Date.now();

    try {
      this.logger.info('Starting NHTSA ingestion');
      const makesXml = await this.nhtsaClient.fetchMakesXml();
      let makes = parseMakesXml(makesXml);

      if (this.config.INGEST_MAKE_LIMIT > 0) {
        makes = makes.slice(0, this.config.INGEST_MAKE_LIMIT);
      }

      const combined = await this.fetchVehicleTypesForMakes(makes);
      const vehicleTypes = await this.persist(combined);

      this.logger.info(
        {
          makes: combined.length,
          vehicleTypes,
          durationMs: Date.now() - startedAt,
        },
        'Ingestion completed',
      );

      return { makes: combined.length, vehicleTypes };
    } catch (error) {
      this.logger.error({ err: error }, 'Ingestion failed');
      throw error;
    } finally {
      this.running = false;
    }
  }

  private async fetchVehicleTypesForMakes(
    makes: Array<{ makeId: string; makeName: string }>,
  ): Promise<MakeDto[]> {
    const concurrency = this.config.INGEST_CONCURRENCY;
    const results: MakeDto[] = [];
    let index = 0;

    const workers = Array.from(
      { length: Math.min(concurrency, makes.length) },
      async () => {
        while (index < makes.length) {
          const current = makes[index++];
          try {
            const xml = await this.nhtsaClient.fetchVehicleTypesXml(
              current.makeId,
            );
            const vehicleTypes = parseVehicleTypesXml(xml);
            results.push(combineMakeWithTypes(current, vehicleTypes));
          } catch (error) {
            this.logger.warn(
              { err: error, makeId: current.makeId },
              'Failed to load vehicle types for make; storing make with empty types',
            );
            results.push(combineMakeWithTypes(current, []));
          }
        }
      },
    );

    await Promise.all(workers);
    return results;
  }

  private async persist(makes: MakeDto[]): Promise<number> {
    let vehicleTypeCount = 0;

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.vehicleType.deleteMany();
        await tx.make.deleteMany();

        for (const make of makes) {
          await tx.make.create({
            data: {
              makeId: make.makeId,
              makeName: make.makeName,
              vehicleTypes: {
                create: make.vehicleTypes.map((type) => ({
                  typeId: type.typeId,
                  typeName: type.typeName,
                })),
              },
            },
          });
          vehicleTypeCount += make.vehicleTypes.length;
        }
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to persist ingested data');
      throw error;
    }

    return vehicleTypeCount;
  }
}
