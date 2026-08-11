import { NhtsaClient, NhtsaNetworkError } from './nhtsa.client';
import type { AppConfig } from '../config/configuration';

describe('NhtsaClient', () => {
  const config = {
    NHTSA_BASE_URL: 'https://example.test/api/vehicles',
  } as AppConfig;

  const logger = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };

  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('returns XML text on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => '<Response />',
    }) as unknown as typeof fetch;

    const client = new NhtsaClient(config, logger as never);
    await expect(client.fetchMakesXml()).resolves.toBe('<Response />');
  });

  it('wraps non-OK responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }) as unknown as typeof fetch;

    const client = new NhtsaClient(config, logger as never);
    await expect(client.fetchVehicleTypesXml('440')).rejects.toBeInstanceOf(
      NhtsaNetworkError,
    );
  });

  it('wraps network failures', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

    const client = new NhtsaClient(config, logger as never);
    await expect(client.fetchMakesXml()).rejects.toBeInstanceOf(
      NhtsaNetworkError,
    );
  });
});
