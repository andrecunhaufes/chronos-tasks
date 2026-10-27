import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricasService {
  private readonly registro = new Registry();

  readonly requisicoesHttp = new Counter({
    name: 'http_requests_total',
    help: 'Total de requisições HTTP recebidas',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [this.registro],
  });

  readonly duracaoRequisicoes = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duração das requisições HTTP em segundos',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [this.registro],
  });

  readonly tarefasCriadas = new Counter({
    name: 'tarefas_criadas_total',
    help: 'Total de tarefas criadas por tenant',
    labelNames: ['tenant_id'] as const,
    registers: [this.registro],
  });

  readonly cacheAcertos = new Counter({
    name: 'cache_acertos_total',
    help: 'Total de leituras servidas pelo cache',
    labelNames: ['cache'] as const,
    registers: [this.registro],
  });

  readonly cacheErros = new Counter({
    name: 'cache_erros_total',
    help: 'Total de leituras que não encontraram valor em cache',
    labelNames: ['cache'] as const,
    registers: [this.registro],
  });

  readonly autenticacoesFalhas = new Counter({
    name: 'autenticacoes_falhas_total',
    help: 'Total de tentativas de autenticação malsucedidas',
    labelNames: ['motivo'] as const,
    registers: [this.registro],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registro });
  }

  async coletar(): Promise<string> {
    return this.registro.metrics();
  }

  tipoConteudo(): string {
    return this.registro.contentType;
  }
}
