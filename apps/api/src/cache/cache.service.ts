import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { MetricasService } from '../observabilidade/metricas.service';
import { REDIS } from '../redis/redis.module';

// TTLs e backends definidos no ASSET 23752 (definition.optimizations).
export const CACHE = {
  LISTAGEM_TAREFAS: { prefixo: 'tarefas:lista', ttlSegundos: 300, backend: 'memoria' },
  USUARIOS_ATIVOS: { prefixo: 'usuarios:ativos', ttlSegundos: 600, backend: 'memoria' },
  CONFIG_TENANT: { prefixo: 'tenant:config', ttlSegundos: 1800, backend: 'memoria' },
  FILTROS_TAREFAS: { prefixo: 'tarefas:filtro', ttlSegundos: 120, backend: 'redis' },
} as const;

export type EntradaCache = (typeof CACHE)[keyof typeof CACHE];

const TAMANHO_MAXIMO_MEMORIA = 1000;

type Registro = { valor: unknown; expiraEm: number };

@Injectable()
export class CacheService {
  // Map preserva ordem de inserção: reinserir no acesso implementa a evicção LRU.
  private readonly memoria = new Map<string, Registro>();

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly metricas: MetricasService,
  ) {}

  async obter<T>(entrada: EntradaCache, chave: string, produzir: () => Promise<T>): Promise<T> {
    const chaveCompleta = `${entrada.prefixo}:${chave}`;

    const emCache =
      entrada.backend === 'redis'
        ? await this.lerRedis<T>(chaveCompleta)
        : this.lerMemoria<T>(chaveCompleta);

    if (emCache !== undefined) {
      this.metricas.cacheAcertos.inc({ cache: entrada.prefixo });
      return emCache;
    }

    this.metricas.cacheErros.inc({ cache: entrada.prefixo });
    const valor = await produzir();

    if (entrada.backend === 'redis') {
      await this.redis.set(chaveCompleta, JSON.stringify(valor), 'EX', entrada.ttlSegundos);
    } else {
      this.gravarMemoria(chaveCompleta, valor, entrada.ttlSegundos);
    }

    return valor;
  }

  async invalidar(entrada: EntradaCache, prefixoChave: string): Promise<void> {
    const alvo = `${entrada.prefixo}:${prefixoChave}`;

    for (const chave of this.memoria.keys()) {
      if (chave.startsWith(alvo)) this.memoria.delete(chave);
    }

    if (entrada.backend === 'redis') {
      const chaves = await this.redis.keys(`${alvo}*`);
      if (chaves.length > 0) await this.redis.del(...chaves);
    }
  }

  // Toda alteração em tarefa invalida os caches derivados do tenant (ASSET 23752).
  async invalidarTarefasDoTenant(tenantId: string): Promise<void> {
    await this.invalidar(CACHE.LISTAGEM_TAREFAS, tenantId);
    await this.invalidar(CACHE.FILTROS_TAREFAS, tenantId);
  }

  private lerMemoria<T>(chave: string): T | undefined {
    const registro = this.memoria.get(chave);
    if (!registro) return undefined;

    if (registro.expiraEm < Date.now()) {
      this.memoria.delete(chave);
      return undefined;
    }

    this.memoria.delete(chave);
    this.memoria.set(chave, registro);
    return registro.valor as T;
  }

  private gravarMemoria(chave: string, valor: unknown, ttlSegundos: number): void {
    if (this.memoria.size >= TAMANHO_MAXIMO_MEMORIA) {
      const maisAntiga = this.memoria.keys().next().value;
      if (maisAntiga !== undefined) this.memoria.delete(maisAntiga);
    }

    this.memoria.set(chave, { valor, expiraEm: Date.now() + ttlSegundos * 1000 });
  }

  private async lerRedis<T>(chave: string): Promise<T | undefined> {
    const bruto = await this.redis.get(chave);
    return bruto === null ? undefined : (JSON.parse(bruto) as T);
  }
}
