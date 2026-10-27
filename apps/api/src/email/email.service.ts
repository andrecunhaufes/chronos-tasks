import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { REDIS } from '../redis/redis.module';
import { FILA_EMAIL, MensagemRecuperacaoSenha, PARAMETROS_ENVIO_EMAIL } from './email.constantes';

@Injectable()
export class EmailService implements OnModuleDestroy {
  private readonly fila: Queue<MensagemRecuperacaoSenha>;

  constructor(@Inject(REDIS) redis: Redis) {
    this.fila = new Queue<MensagemRecuperacaoSenha>(FILA_EMAIL, { connection: redis });
  }

  async enfileirarRecuperacaoSenha(
    mensagem: Omit<MensagemRecuperacaoSenha, 'tipo'>,
  ): Promise<void> {
    await this.enfileirar({ ...mensagem, tipo: 'recuperacao_senha' });
  }

  async enfileirarBoasVindas(mensagem: Omit<MensagemRecuperacaoSenha, 'tipo'>): Promise<void> {
    await this.enfileirar({ ...mensagem, tipo: 'boas_vindas' });
  }

  private async enfileirar(mensagem: MensagemRecuperacaoSenha): Promise<void> {
    await this.fila.add(mensagem.tipo, mensagem, {
      attempts: PARAMETROS_ENVIO_EMAIL.maxTentativas,
      backoff: { type: 'exponential', delay: PARAMETROS_ENVIO_EMAIL.backoffInicialMs },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.fila.close();
  }
}
