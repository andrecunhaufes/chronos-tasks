import 'reflect-metadata';
import { encerrarTelemetria, iniciarTelemetria } from './observabilidade/telemetria';
import { iniciarSentry } from './observabilidade/sentry';

iniciarSentry();
iniciarTelemetria();

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { json } from 'express';
import { AppModule } from './app.module';

const TIMEOUT_REQUISICAO_MS = 30_000;

async function iniciar(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.use(json({ limit: '10mb' }));
  app.enableCors({ origin: true, credentials: true });
  app.enableShutdownHooks();

  process.once('SIGTERM', () => void encerrarTelemetria());

  const config = app.get(ConfigService);
  const servidor = await app.listen(config.getOrThrow<number>('PORT'));
  servidor.setTimeout(TIMEOUT_REQUISICAO_MS);
}

void iniciar();
