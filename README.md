# NHTSA Vehicle Makes GraphQL API

NestJS service that pulls NHTSA vPIC XML, converts it to JSON, stores it in SQLite, and serves it over GraphQL.

## Setup

```bash
pnpm install
cp .env.example .env
pnpm exec prisma migrate dev
pnpm run start:dev
```

GraphQL: http://localhost:3000/graphql

Manual ingest:

```bash
curl -X POST http://localhost:3000/admin/ingest
```

## Docker

```bash
docker compose up --build
```

Runs migrations on boot. SQLite lives in the `sqlite_data` volume on port `3000`.

## Env vars

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test`, or `production` |
| `PORT` | `3000` | HTTP port |
| `DATABASE_URL` | required | Prisma SQLite URL, e.g. `file:./dev.db` |
| `LOG_LEVEL` | `info` | Pino log level |
| `NHTSA_BASE_URL` | `https://vpic.nhtsa.dot.gov/api/vehicles` | NHTSA API base |
| `INGEST_CONCURRENCY` | `10` | Parallel vehicle-type fetches |
| `INGEST_MAKE_LIMIT` | `0` | Cap makes during ingest (`0` = all) |
| `INGEST_ON_BOOT` | `false` | Ingest when the DB is empty at startup |

Config is validated with Zod on boot.

## Data model

```json
[
  {
    "makeId": "440",
    "makeName": "ASTON MARTIN",
    "vehicleTypes": [
      { "typeId": "2", "typeName": "Passenger Car" },
      { "typeId": "7", "typeName": "Multipurpose Passenger Vehicle (MPV)" }
    ]
  }
]
```

- `Make`: `makeId` (unique), `makeName`
- `VehicleType`: `typeId`, `typeName`, FK to make (`@@unique([makeId, typeId])`)

## GraphQL schema

```graphql
type VehicleType {
  typeId: String!
  typeName: String!
}

type Make {
  makeId: String!
  makeName: String!
  vehicleTypes: [VehicleType!]!
}

type Query {
  makes(makeId: String, makeName: String): [Make!]!
  make(makeId: String!): Make
}
```

### Examples

```graphql
query AllMakes {
  makes {
    makeId
    makeName
    vehicleTypes {
      typeId
      typeName
    }
  }
}
```

```graphql
query SearchMakes {
  makes(makeName: "TESLA") {
    makeId
    makeName
    vehicleTypes {
      typeId
      typeName
    }
  }
}
```

```graphql
query OneMake {
  make(makeId: "440") {
    makeId
    makeName
    vehicleTypes {
      typeId
      typeName
    }
  }
}
```

## Ingestion

1. Fetch `getallmakes?format=XML`
2. Parse to `{ makeId, makeName }[]`
3. Optionally truncate with `INGEST_MAKE_LIMIT`
4. Fetch `GetVehicleTypesForMakeId/{makeId}?format=xml` with concurrency
5. Combine make + types
6. Wipe + rewrite rows in a transaction

If vehicle types fail for one make, that make is stored with an empty list and the run continues.

For local work, keep `INGEST_MAKE_LIMIT` small. Full NHTSA is huge.

## Errors

- Network: `NhtsaNetworkError`
- Bad XML: `XmlParseError`
- Bad payload shape: `TransformError`
- DB write failures: logged and rethrown
- Bad config: process exits before listen

## Logging

JSON logs through nestjs-pino. Pretty print in development. Covers startup, request/ingest failures, and unexpected errors.

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm run start:dev` | Watch mode |
| `pnpm run build` | Compile to `dist/` |
| `pnpm run start:prod` | Run compiled app |
| `pnpm test` | Unit tests |
| `pnpm exec prisma migrate dev` | Local migrations |
