import {
  combineMakeWithTypes,
  parseMakesXml,
  parseVehicleTypesXml,
} from './transform';
import { TransformError, XmlParseError } from './types';

const makesXml = `<?xml version="1.0"?>
<Response>
  <Count>2</Count>
  <Message>Response returned successfully</Message>
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

const vehicleTypesXml = `<?xml version="1.0"?>
<Response>
  <Count>2</Count>
  <Message>Response returned successfully</Message>
  <SearchCriteria>Make ID: 440</SearchCriteria>
  <Results>
    <VehicleTypesForMakeIds>
      <VehicleTypeId>2</VehicleTypeId>
      <VehicleTypeName>Passenger Car</VehicleTypeName>
    </VehicleTypesForMakeIds>
    <VehicleTypesForMakeIds>
      <VehicleTypeId>7</VehicleTypeId>
      <VehicleTypeName>Multipurpose Passenger Vehicle (MPV)</VehicleTypeName>
    </VehicleTypesForMakeIds>
  </Results>
</Response>`;

describe('parseMakesXml', () => {
  it('transforms makes XML into JSON objects', () => {
    expect(parseMakesXml(makesXml)).toEqual([
      { makeId: '440', makeName: 'ASTON MARTIN' },
      { makeId: '441', makeName: 'TESLA' },
    ]);
  });

  it('throws when no makes are present', () => {
    const empty = `<Response><Results></Results></Response>`;
    expect(() => parseMakesXml(empty)).toThrow(TransformError);
  });

  it('throws on malformed XML', () => {
    expect(() => parseMakesXml('<Response><unclosed>')).toThrow(XmlParseError);
  });
});

describe('parseVehicleTypesXml', () => {
  it('transforms vehicle type XML into JSON objects', () => {
    expect(parseVehicleTypesXml(vehicleTypesXml)).toEqual([
      { typeId: '2', typeName: 'Passenger Car' },
      {
        typeId: '7',
        typeName: 'Multipurpose Passenger Vehicle (MPV)',
      },
    ]);
  });

  it('returns an empty array when no types exist', () => {
    const empty = `<Response><Results></Results></Response>`;
    expect(parseVehicleTypesXml(empty)).toEqual([]);
  });
});

describe('combineMakeWithTypes', () => {
  it('attaches vehicle types to a make', () => {
    const result = combineMakeWithTypes(
      { makeId: '440', makeName: 'ASTON MARTIN' },
      [
        { typeId: '2', typeName: 'Passenger Car' },
        {
          typeId: '7',
          typeName: 'Multipurpose Passenger Vehicle (MPV)',
        },
      ],
    );

    expect(result).toEqual({
      makeId: '440',
      makeName: 'ASTON MARTIN',
      vehicleTypes: [
        { typeId: '2', typeName: 'Passenger Car' },
        {
          typeId: '7',
          typeName: 'Multipurpose Passenger Vehicle (MPV)',
        },
      ],
    });
  });
});
