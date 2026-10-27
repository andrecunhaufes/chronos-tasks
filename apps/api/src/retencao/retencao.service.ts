import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ScheduledTask, schedule } from 'node-cron';
import { PrismaService } from '../prisma/prisma.service';

// Parâmetros do ASSET 23881: agendamento `0 2 * * *` e retention_days_default = 90.
const AGENDAMENTO = '0 2 * * *';
const DIAS_RETENCAO_PADRAO = 90;
const DIA_EM_MS = 24 * 60 * 60 * 1000;

export type ResultadoRetencao = {
  correlationId: string;
  iniciadoEm: string;
  concluidoEm: string;
  tokensRecuperacaoRemovidos: number;
  tarefasExcluidasElegiveis: number;
};

@Injectable()
export class RetencaoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('retencao');
  private tarefa?: ScheduledTask;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.tarefa = schedule(AGENDAMENTO, () => {
      void this.executar('agendado');
    });
  }

  onModuleDestroy(): void {
    this.tarefa?.stop();
  }

  async executar(origem: 'agendado' | 'manual'): Promise<ResultadoRetencao> {
    const correlationId = randomUUID();
    const iniciadoEm = new Date();
    const corte = new Date(iniciadoEm.getTime() - DIAS_RETENCAO_PADRAO * DIA_EM_MS);

    this.logger.log({ correlation_id: correlationId, origem, corte }, 'Retenção iniciada');

    // Tokens de recuperação já expirados ou usados não têm valor de auditoria: o evento
    // password_recovery_requested permanece na trilha.
    const tokens = await this.prisma.tokenRecuperacaoSenha.deleteMany({
      where: { OR: [{ dataExpiracao: { lt: iniciadoEm } }, { dataUso: { not: null } }] },
    });

    // O ASSET 23881 prevê purga após a retenção, mas o ASSET 23773 define o histórico de
    // status como permanente e ele referencia a tarefa por chave estrangeira. Apagar a
    // tarefa exigiria apagar o histórico, então aqui apenas se contabiliza o que passou do
    // período — a remoção física depende de resolver essa contradição na especificação.
    const tarefasElegiveis = await this.prisma.tarefa.count({
      where: { dataExclusao: { lt: corte } },
    });

    const concluidoEm = new Date();
    const resultado: ResultadoRetencao = {
      correlationId,
      iniciadoEm: iniciadoEm.toISOString(),
      concluidoEm: concluidoEm.toISOString(),
      tokensRecuperacaoRemovidos: tokens.count,
      tarefasExcluidasElegiveis: tarefasElegiveis,
    };

    this.logger.log({ correlation_id: correlationId, origem, ...resultado }, 'Retenção concluída');
    return resultado;
  }
}
