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
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new NhtsaNetworkError(
          `NHTSA request failed for ${label}: HTTP ${response.status}`,
        );
      }
      return await response.text();
    } catch (error) {
      if (error instanceof NhtsaNetworkError) {
        this.logger.error({ err: error, url }, error.message);
        throw error;
      }
      const wrapped = new NhtsaNetworkError(
        `NHTSA network error while fetching ${label}`,
        error,
      );
      this.logger.error({ err: wrapped, url }, wrapped.message);
      throw wrapped;
    }
  }
}
