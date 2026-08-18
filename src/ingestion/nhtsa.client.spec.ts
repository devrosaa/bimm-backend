import { NhtsaClient, NhtsaNetworkError } from './nhtsa.client';
import type { AppConfig } from '../config/configuration';

describe('NhtsaClient', () => {
  const config = {
    NHTSA_BASE_URL: 'https://example.test/api/vehicles',
    NHTSA_TIMEOUT_MS: 50,
    NHTSA_RETRY_COUNT: 2,
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
    jest.useRealTimers();
  });

  it('returns XML text on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => '<Response />',
    }) as unknown as typeof fetch;

    const client = new NhtsaClient(config, logger as never);
    await expect(client.fetchMakesXml()).resolves.toBe('<Response />');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries retryable failures then succeeds', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '<ok />',
      }) as unknown as typeof fetch;

    const client = new NhtsaClient(config, logger as never);
    await expect(client.fetchMakesXml()).resolves.toBe('<ok />');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('does not retry client errors', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as unknown as typeof fetch;

    const client = new NhtsaClient(config, logger as never);
    await expect(client.fetchVehicleTypesXml('440')).rejects.toBeInstanceOf(
      NhtsaNetworkError,
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('wraps timeouts', async () => {
    const timeout = Object.assign(new Error('aborted'), {
      name: 'TimeoutError',
    });
    global.fetch = jest
      .fn()
      .mockRejectedValue(timeout) as unknown as typeof fetch;

    const client = new NhtsaClient(
      { ...config, NHTSA_RETRY_COUNT: 0 } as AppConfig,
      logger as never,
    );
    await expect(client.fetchMakesXml()).rejects.toMatchObject({
      name: 'NhtsaNetworkError',
      message: expect.stringContaining('timed out'),
    });
  });
});
