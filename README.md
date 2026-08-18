# NHTSA Vehicle Makes GraphQL API

NestJS service that pulls NHTSA vPIC XML, converts it to JSON, stores it in SQLite, and serves it over GraphQL.

## Setup

```bash
pnpm install
cp .env.example .env
pnpm exec prisma migrate dev
pnpm run start:dev
```

From a clean install, these should all succeed:

```bash
pnpm test
pnpm run build
pnpm lint
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

Runs migrations on boot. SQLite lives in the `sqlite_data` volume on port `3000`. Default ingest loads the full NHTSA dataset (`INGEST_MAKE_LIMIT=0`).

## Env vars

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test`, or `production` |
| `PORT` | `3000` | HTTP port |
| `DATABASE_URL` | required | Prisma SQLite URL, e.g. `file:./dev.db` |
| `LOG_LEVEL` | `info` | Pino log level |
| `NHTSA_BASE_URL` | `https://vpic.nhtsa.dot.gov/api/vehicles` | NHTSA API base |
| `NHTSA_TIMEOUT_MS` | `15000` | Per-request timeout |
| `NHTSA_RETRY_COUNT` | `2` | Extra retries after the first attempt |
| `INGEST_CONCURRENCY` | `10` | Parallel vehicle-type fetches |
| `INGEST_MAKE_LIMIT` | `0` | Cap makes during ingest (`0` = all) |
| `INGEST_ON_BOOT` | `false` | Ingest when the DB is empty at startup |

Config is validated with Zod on boot.

For a short demo, set `INGEST_MAKE_LIMIT=25`. A full crawl is about 12k makes and takes several minutes.

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
  makes(makeId: String, makeName: String, limit: Int = 50, offset: Int = 0): [Make!]!
  make(makeId: String!): Make
}
```

`limit` defaults to 50 and is capped at 200.

### Examples

```graphql
query FirstPage {
  makes(limit: 50, offset: 0) {
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
  makes(makeName: "TESLA", limit: 20) {
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

1. Fetch `getallmakes?format=XML` (timeout + retries)
2. Parse to `{ makeId, makeName }[]`
3. If `INGEST_MAKE_LIMIT` is greater than 0, slice to that many makes; `0` means the full dataset
4. Fetch `GetVehicleTypesForMakeId/{makeId}?format=xml` with concurrency, timeout, and retries
5. Upsert successful makes and replace only those makes' vehicle types
6. Skip makes whose vehicle-type request still fails; existing rows for those makes stay as they are
7. If the all-makes request fails, ingestion aborts and the database is not written

## Errors

- Network, timeout, and 5xx/429: retried, then `NhtsaNetworkError`
- 4xx (other than 429): fail immediately, no retry
- Bad XML: `XmlParseError`
- Bad payload shape: `TransformError`
- Failed vehicle-type fetches: skipped; valid stored data is not overwritten with empty types
- Failed all-makes fetch: abort, no persist
- DB write failures: logged and rethrown
- Bad config: process exits before listen

## Logging

JSON logs through nestjs-pino. Pretty print in development. Covers startup, retries, ingest skips, request failures, and unexpected errors.

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm run start:dev` | Watch mode |
| `pnpm run build` | Compile to `dist/` |
| `pnpm run start:prod` | Run compiled app |
| `pnpm test` | Unit tests |
| `pnpm lint` | Lint without mutating files |
| `pnpm exec prisma migrate dev` | Local migrations |
