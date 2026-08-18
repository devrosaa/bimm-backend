import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/configuration';

export class NhtsaNetworkError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'NhtsaNetworkError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

@Injectable()
export class NhtsaClient {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @InjectPinoLogger(NhtsaClient.name)
    private readonly logger: PinoLogger,
  ) {}

  async fetchMakesXml(): Promise<string> {
    const url = `${this.config.NHTSA_BASE_URL}/getallmakes?format=XML`;
    return this.getXml(url, 'all makes');
  }

  async fetchVehicleTypesXml(makeId: string): Promise<string> {
    const url = `${this.config.NHTSA_BASE_URL}/GetVehicleTypesForMakeId/${makeId}?format=xml`;
    return this.getXml(url, `vehicle types for make ${makeId}`);
  }

  private async getXml(url: string, label: string): Promise<string> {
    const attempts = this.config.NHTSA_RETRY_COUNT + 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await this.requestOnce(url, label);
      } catch (error) {
        lastError = error;
        const retryable = this.isRetryable(error);
        if (!retryable || attempt >= attempts) {
          break;
        }
        const delayMs = 250 * 2 ** (attempt - 1);
        this.logger.warn(
          { err: error, url, attempt, attempts, delayMs },
          `Retrying NHTSA request for ${label}`,
        );
        await this.sleep(delayMs);
      }
    }

    if (lastError instanceof NhtsaNetworkError) {
      this.logger.error({ err: lastError, url }, lastError.message);
      throw lastError;
    }

    const wrapped = new NhtsaNetworkError(
      `NHTSA network error while fetching ${label}`,
      lastError,
    );
    this.logger.error({ err: wrapped, url }, wrapped.message);
    throw wrapped;
  }

  private async requestOnce(url: string, label: string): Promise<string> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.config.NHTSA_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new NhtsaNetworkError(
          `NHTSA request failed for ${label}: HTTP ${response.status}`,
          { status: response.status },
        );
      }
      return await response.text();
    } catch (error) {
      if (error instanceof NhtsaNetworkError) {
        throw error;
      }
      if (this.isTimeout(error)) {
        throw new NhtsaNetworkError(
          `NHTSA request timed out for ${label}`,
          error,
        );
      }
      throw new NhtsaNetworkError(
        `NHTSA network error while fetching ${label}`,
        error,
      );
    }
  }

  private isTimeout(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error.name === 'TimeoutError' || error.name === 'AbortError')
    );
  }

  private isRetryable(error: unknown): boolean {
    if (!(error instanceof NhtsaNetworkError)) {
      return true;
    }
    const cause = (error as Error & { cause?: { status?: number } }).cause;
    const status = cause?.status;
    if (typeof status === 'number') {
      return status >= 500 || status === 429;
    }
    return true;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
