import { Injectable } from '@nestjs/common';
import { StatusTarefa } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const TTL_CACHE_MS = 60_000;

@Injectable()
export class ColunasService {
  private cache: { colunas: StatusTarefa[]; expiraEm: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async listar(tenantId: string): Promise<StatusTarefa[]> {
    if (this.cache && this.cache.expiraEm > Date.now()) {
      return this.filtrarPorTenant(this.cache.colunas, tenantId);
    }

    const colunas = await this.prisma.statusTarefa.findMany({ orderBy: { ordem: 'asc' } });
    this.cache = { colunas, expiraEm: Date.now() + TTL_CACHE_MS };

    return this.filtrarPorTenant(colunas, tenantId);
  }

  async chaves(tenantId: string): Promise<string[]> {
    return (await this.listar(tenantId)).map((coluna) => coluna.chave);
  }

  async ehValida(chave: string, tenantId: string): Promise<boolean> {
    return (await this.chaves(tenantId)).includes(chave);
  }

  async chaveInicial(tenantId: string): Promise<string> {
    return (await this.listar(tenantId))[0].chave;
  }

  async ehConclusivo(chave: string, tenantId: string): Promise<boolean> {
    const coluna = (await this.listar(tenantId)).find((candidata) => candidata.chave === chave);
    return coluna?.ehConclusivo ?? false;
  }

  private filtrarPorTenant(colunas: StatusTarefa[], tenantId: string): StatusTarefa[] {
    const proprias = colunas.filter((coluna) => coluna.tenantId === tenantId);
    return proprias.length > 0 ? proprias : colunas.filter((coluna) => coluna.tenantId === null);
  }
}
