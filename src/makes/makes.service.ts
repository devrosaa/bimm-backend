import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Make } from './models/make.model';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

@Injectable()
export class MakesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: {
    makeId?: string;
    makeName?: string;
    limit?: number;
    offset?: number;
  }): Promise<Make[]> {
    const where: Prisma.MakeWhereInput = {};

    if (filters?.makeId) {
      where.makeId = filters.makeId;
    }

    if (filters?.makeName) {
      where.makeName = {
        contains: filters.makeName,
      };
    }

    const take = this.clampLimit(filters?.limit);
    const skip = Math.max(0, filters?.offset ?? 0);

    const rows = await this.prisma.make.findMany({
      where,
      include: { vehicleTypes: true },
      orderBy: { makeName: 'asc' },
      take,
      skip,
    });

    return rows.map((row) => ({
      makeId: row.makeId,
      makeName: row.makeName,
      vehicleTypes: row.vehicleTypes.map((type) => ({
        typeId: type.typeId,
        typeName: type.typeName,
      })),
    }));
  }

  async findOne(makeId: string): Promise<Make | null> {
    const row = await this.prisma.make.findUnique({
      where: { makeId },
      include: { vehicleTypes: true },
    });

    if (!row) {
      return null;
    }

    return {
      makeId: row.makeId,
      makeName: row.makeName,
      vehicleTypes: row.vehicleTypes.map((type) => ({
        typeId: type.typeId,
        typeName: type.typeName,
      })),
    };
  }

  private clampLimit(limit?: number): number {
    if (limit == null || Number.isNaN(limit)) {
      return DEFAULT_LIMIT;
    }
    return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));
  }
}
