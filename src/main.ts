import { NestFactory } from '@nestjs/core';
// import {
//   FastifyAdapter,
//   NestFastifyApplication,
// } from '@nestjs/platform-fastify';

import { AppModule } from './app.module';
import { ConsoleLogger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    // new FastifyAdapter({ logger: true }),
    {
      abortOnError: false,
      logger: new ConsoleLogger({
        json: true,
        timestamp: true,
        logLevels: ['log', 'fatal', 'error', 'warn', 'debug', 'verbose'],
      }),
      cors: true,
    },
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
