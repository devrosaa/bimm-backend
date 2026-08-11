export type VehicleTypeDto = {
  typeId: string;
  typeName: string;
};

export type MakeDto = {
  makeId: string;
  makeName: string;
  vehicleTypes: VehicleTypeDto[];
};

export class XmlParseError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'XmlParseError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export class TransformError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'TransformError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}
