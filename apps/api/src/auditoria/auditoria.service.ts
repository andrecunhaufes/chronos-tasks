import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CAMPOS_SENSIVEIS_REDIGIDOS,
  EventoAuditoria,
  SEVERIDADE,
  Severidade,
} from './eventos-auditoria';

export type RegistroAuditoria = {
  evento: EventoAuditoria;
  recursoTipo: string;
  recursoId?: string | null;
  tenantId?: string | null;
  executorId?: string | null;
  resultado: 'sucesso' | 'negado' | 'falha';
  motivo?: string | null;
  dadosAntes?: Record<string, unknown> | null;
  dadosDepois?: Record<string, unknown> | null;
  enderecoIp?: string | null;
  correlationId?: string | null;
};

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger('auditoria');

  constructor(private readonly prisma: PrismaService) {}

  async registrar(registro: RegistroAuditoria): Promise<void> {
    const severidade = this.classificarSeveridade(registro);
    const dadosAntes = this.redigir(registro.dadosAntes);
    const dadosDepois = this.redigir(registro.dadosDepois);

    this.logger.log({
      event_type: registro.evento,
      tenant_id: registro.tenantId,
      executor_id: registro.executorId,
      resource_type: registro.recursoTipo,
      resource_id: registro.recursoId,
      status: registro.resultado,
      severity: severidade,
      correlation_id: registro.correlationId,
    });

    await this.prisma.trilhaAuditoria.create({
      data: {
        tenantId: registro.tenantId ?? null,
        executorId: registro.executorId ?? null,
        tipoOperacao: registro.evento,
        recursoTipo: registro.recursoTipo,
        recursoId: registro.recursoId ?? null,
        resultado: registro.resultado,
        motivo: registro.motivo ?? null,
        dadosAntes: (dadosAntes ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        dadosDepois: (dadosDepois ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        enderecoIp: registro.enderecoIp ?? null,
      },
    });
  }

  private classificarSeveridade(registro: RegistroAuditoria): Severidade {
    if (registro.resultado === 'sucesso') return SEVERIDADE.INFO;
    if (registro.resultado === 'negado') return SEVERIDADE.AVISO;
    return SEVERIDADE.CRITICO;
  }

  private redigir(dados?: Record<string, unknown> | null): Record<string, unknown> | null {
    if (!dados) return null;

    return Object.fromEntries(
      Object.entries(dados).map(([chave, valor]) =>
        CAMPOS_SENSIVEIS_REDIGIDOS.includes(chave) ? [chave, '[REDIGIDO]'] : [chave, valor],
      ),
    );
  }
}
