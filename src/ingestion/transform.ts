import { XMLParser, XMLValidator } from 'fast-xml-parser';
import {
  MakeDto,
  TransformError,
  VehicleTypeDto,
  XmlParseError,
} from './types';

const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  isArray: (name) =>
    ['AllVehicleMakes', 'VehicleTypesForMakeIds'].includes(name),
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function parseXml(xml: string): unknown {
  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    throw new XmlParseError('Failed to parse NHTSA XML response', validation);
  }

  try {
    return parser.parse(xml);
  } catch (error) {
    throw new XmlParseError('Failed to parse NHTSA XML response', error);
  }
}

export function parseMakesXml(xml: string): Array<{
  makeId: string;
  makeName: string;
}> {
  const parsed = parseXml(xml) as {
    Response?: {
      Results?: {
        AllVehicleMakes?: Array<{
          Make_ID?: string | number;
          Make_Name?: string;
        }>;
      };
    };
  };

  const rows = asArray(parsed.Response?.Results?.AllVehicleMakes);
  if (rows.length === 0) {
    throw new TransformError('No makes found in NHTSA XML response');
  }

  return rows.map((row, index) => {
    if (row.Make_ID == null || row.Make_Name == null) {
      throw new TransformError(`Invalid make entry at index ${index}`);
    }
    return {
      makeId: String(row.Make_ID),
      makeName: String(row.Make_Name),
    };
  });
}

export function parseVehicleTypesXml(xml: string): VehicleTypeDto[] {
  const parsed = parseXml(xml) as {
    Response?: {
      Results?: {
        VehicleTypesForMakeIds?: Array<{
          VehicleTypeId?: string | number;
          VehicleTypeName?: string;
        }>;
      };
    };
  };

  const rows = asArray(parsed.Response?.Results?.VehicleTypesForMakeIds);

  return rows.map((row, index) => {
    if (row.VehicleTypeId == null || row.VehicleTypeName == null) {
      throw new TransformError(`Invalid vehicle type entry at index ${index}`);
    }
    return {
      typeId: String(row.VehicleTypeId),
      typeName: String(row.VehicleTypeName),
    };
  });
}

export function combineMakeWithTypes(
  make: { makeId: string; makeName: string },
  vehicleTypes: VehicleTypeDto[],
): MakeDto {
  return {
    makeId: make.makeId,
    makeName: make.makeName,
    vehicleTypes,
  };
}
