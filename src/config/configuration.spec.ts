import { loadConfig } from './configuration';

describe('loadConfig', () => {
  const base = {
    DATABASE_URL: 'file:./test.db',
    NHTSA_BASE_URL: 'https://vpic.nhtsa.dot.gov/api/vehicles',
  };

  it('applies defaults and coerces numeric values', () => {
    const config = loadConfig({
      ...base,
      PORT: '4000',
      INGEST_CONCURRENCY: '5',
      INGEST_MAKE_LIMIT: '10',
      INGEST_ON_BOOT: 'true',
      NHTSA_TIMEOUT_MS: '8000',
      NHTSA_RETRY_COUNT: '3',
    });

    expect(config.PORT).toBe(4000);
    expect(config.INGEST_CONCURRENCY).toBe(5);
    expect(config.INGEST_MAKE_LIMIT).toBe(10);
    expect(config.INGEST_ON_BOOT).toBe(true);
    expect(config.NHTSA_TIMEOUT_MS).toBe(8000);
    expect(config.NHTSA_RETRY_COUNT).toBe(3);
    expect(config.NODE_ENV).toBe('development');
  });

  it('defaults ingest limit to all makes', () => {
    const config = loadConfig(base);
    expect(config.INGEST_MAKE_LIMIT).toBe(0);
    expect(config.NHTSA_TIMEOUT_MS).toBe(15000);
    expect(config.NHTSA_RETRY_COUNT).toBe(2);
  });

  it('fails fast on missing database url', () => {
    expect(() => loadConfig({ ...base, DATABASE_URL: '' })).toThrow(
      /Invalid configuration/,
    );
  });
});
