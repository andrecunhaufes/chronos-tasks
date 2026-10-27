import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { REDIS } from '../redis/redis.module';
import {
  FILA_EMAIL,
  FILA_EMAIL_DLQ,
  MensagemRecuperacaoSenha,
  PARAMETROS_ENVIO_EMAIL,
} from './email.constantes';
import { ProvedorEmailService } from './provedor-email.service';

@Injectable()
export class EmailWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailWorker.name);
  private worker?: Worker<MensagemRecuperacaoSenha>;
  private readonly dlq: Queue<MensagemRecuperacaoSenha>;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly provedor: ProvedorEmailService,
  ) {
    this.dlq = new Queue<MensagemRecuperacaoSenha>(FILA_EMAIL_DLQ, { connection: redis });
  }

  onModuleInit(): void {
    this.worker = new Worker<MensagemRecuperacaoSenha>(
      FILA_EMAIL,
      async (job) => this.processar(job),
      {
        connection: this.redis,
        concurrency: PARAMETROS_ENVIO_EMAIL.concorrenciaMaxima,
        limiter: { max: PARAMETROS_ENVIO_EMAIL.requisicoesPorMinuto, duration: 60_000 },
        lockDuration: PARAMETROS_ENVIO_EMAIL.visibilidadeMensagemSegundos * 1000,
      },
    );

    this.worker.on('failed', async (job, erro) => {
      if (!job || job.attemptsMade < PARAMETROS_ENVIO_EMAIL.maxTentativas) return;

      this.logger.error({ jobId: job.id, err: erro }, 'Envio esgotou tentativas; movendo para DLQ');
      await this.dlq.add('recuperacao-senha-falhou', job.data);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.dlq.close();
  }

  private async processar(job: Job<MensagemRecuperacaoSenha>): Promise<{ messageId: string }> {
    const chaveIdempotencia = `email:enviado:${job.id}`;

    const jaEnviado = await this.redis.get(chaveIdempotencia);
    if (jaEnviado) return { messageId: jaEnviado };

    const resultado = await this.provedor.enviarRecuperacaoSenha(job.data);

    await this.redis.set(
      chaveIdempotencia,
      resultado.messageId,
      'EX',
      PARAMETROS_ENVIO_EMAIL.visibilidadeMensagemSegundos,
    );

    return resultado;
  }
}
