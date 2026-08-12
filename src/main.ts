import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { loadConfig } from './config/configuration';

async function bootstrap() {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.enableShutdownHooks();

  await app.listen(config.PORT);
  logger.log(
    { port: config.PORT, env: config.NODE_ENV },
    `GraphQL ready at http://localhost:${config.PORT}/graphql`,
  );
}

bootstrap().catch((error) => {
  console.error(
    JSON.stringify({
      level: 'error',
      msg: 'Failed to start application',
      err: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
});
