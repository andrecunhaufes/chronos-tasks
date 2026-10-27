import { Controller, Get, Header, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { RotaPublica } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS } from '../redis/redis.module';
import { MetricasService } from './metricas.service';

@Controller()
export class ObservabilidadeController {
  constructor(
    private readonly metricas: MetricasService,
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Get('metrics')
  @RotaPublica()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async coletarMetricas(): Promise<string> {
    return this.metricas.coletar();
  }

  @Get('health')
  @RotaPublica()
  async verificarSaude(): Promise<object> {
    const [banco, cache] = await Promise.all([this.checarBanco(), this.checarCache()]);
    const saudavel = banco && cache;

    return {
      status: saudavel ? 'ok' : 'degradado',
      dependencias: {
        banco_de_dados: banco ? 'ok' : 'indisponivel',
        cache: cache ? 'ok' : 'indisponivel',
      },
    };
  }

  private async checarBanco(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async checarCache(): Promise<boolean> {
    try {
      return (await this.redis.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
