import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { PARAMETROS_SEGURANCA } from '../config/configuracao';
import { ErroAplicacao } from '../common/erros/erro-aplicacao';
import { REDIS } from '../redis/redis.module';

@Injectable()
export class LimiteTentativasService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async garantirLimiteLogin(email: string, enderecoIp: string): Promise<void> {
    const janelaSegundos = PARAMETROS_SEGURANCA.loginRateLimitJanelaMinutos * 60;

    for (const chave of [`login:email:${email.toLowerCase()}`, `login:ip:${enderecoIp}`]) {
      const tentativas = Number((await this.redis.get(chave)) ?? 0);
      if (tentativas >= PARAMETROS_SEGURANCA.loginRateLimitMaxTentativas) {
        const ttl = await this.redis.ttl(chave);
        throw ErroAplicacao.limiteExcedido(ttl > 0 ? ttl : janelaSegundos);
      }
    }
  }

  async registrarFalhaLogin(email: string, enderecoIp: string): Promise<void> {
    const janelaSegundos = PARAMETROS_SEGURANCA.loginRateLimitJanelaMinutos * 60;

    for (const chave of [`login:email:${email.toLowerCase()}`, `login:ip:${enderecoIp}`]) {
      const total = await this.redis.incr(chave);
      if (total === 1) await this.redis.expire(chave, janelaSegundos);
    }
  }

  async limparFalhasLogin(email: string, enderecoIp: string): Promise<void> {
    await this.redis.del(`login:email:${email.toLowerCase()}`, `login:ip:${enderecoIp}`);
  }

  async garantirLimiteRecuperacaoSenha(email: string): Promise<void> {
    const chave = `recuperacao:${email.toLowerCase()}`;
    const tentativas = Number((await this.redis.get(chave)) ?? 0);

    if (tentativas >= PARAMETROS_SEGURANCA.recuperacaoSenhaRateLimitPorHora) {
      const ttl = await this.redis.ttl(chave);
      throw ErroAplicacao.limiteExcedido(ttl > 0 ? ttl : 3600);
    }

    const total = await this.redis.incr(chave);
    if (total === 1) await this.redis.expire(chave, 3600);
  }
}
