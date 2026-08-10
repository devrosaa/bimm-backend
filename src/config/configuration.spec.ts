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
    });

    expect(config.PORT).toBe(4000);
    expect(config.INGEST_CONCURRENCY).toBe(5);
    expect(config.INGEST_MAKE_LIMIT).toBe(10);
    expect(config.INGEST_ON_BOOT).toBe(true);
    expect(config.NODE_ENV).toBe('development');
  });

  it('fails fast on missing database url', () => {
    expect(() => loadConfig({ ...base, DATABASE_URL: '' })).toThrow(
      /Invalid configuration/,
    );
  });
});
