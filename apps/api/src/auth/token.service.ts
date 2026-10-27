import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Usuario } from '@prisma/client';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { PARAMETROS_SEGURANCA } from '../config/configuracao';
import { ErroAplicacao } from '../common/erros/erro-aplicacao';
import { REDIS } from '../redis/redis.module';
import { ParDeTokens, PayloadAccessToken, PayloadRefreshToken } from './tipos';

const PREFIXO_REVOGACAO = 'sessao:revogada:';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async emitirPar(usuario: Usuario): Promise<ParDeTokens> {
    const jti = randomUUID();
    const emitidoMs = Date.now();

    const payloadAcesso: PayloadAccessToken = {
      sub: usuario.id,
      email: usuario.email,
      tenant_id: usuario.tenantId,
      perfil: usuario.perfil,
      nivel_hierarquico_id: usuario.nivelHierarquicoId,
      status: usuario.status,
      tipo: 'access',
      jti,
      emitido_ms: emitidoMs,
    };

    const payloadRenovacao: PayloadRefreshToken = {
      sub: usuario.id,
      tenant_id: usuario.tenantId,
      tipo: 'refresh',
      jti,
      emitido_ms: emitidoMs,
    };

    return {
      access_token: await this.assinar(
        payloadAcesso,
        `${PARAMETROS_SEGURANCA.accessTokenTtlSegundos}s`,
      ),
      refresh_token: await this.assinar(
        payloadRenovacao,
        `${PARAMETROS_SEGURANCA.refreshTokenTtlDias}d`,
      ),
    };
  }

  async verificarAcesso(token: string): Promise<PayloadAccessToken> {
    const payload = await this.verificar<PayloadAccessToken>(token);
    if (payload.tipo !== 'access') throw ErroAplicacao.naoAutorizado();
    return payload;
  }

  async verificarRenovacao(token: string): Promise<PayloadRefreshToken> {
    const payload = await this.verificar<PayloadRefreshToken>(token);
    if (payload.tipo !== 'refresh') throw ErroAplicacao.naoAutorizado();
    return payload;
  }

  async revogar(jti: string): Promise<void> {
    const ttlSegundos = PARAMETROS_SEGURANCA.refreshTokenTtlDias * 24 * 60 * 60;
    await this.redis.set(`${PREFIXO_REVOGACAO}${jti}`, '1', 'EX', ttlSegundos);
  }

  async revogarSessoesDoUsuario(usuarioId: string): Promise<void> {
    const ttlSegundos = PARAMETROS_SEGURANCA.refreshTokenTtlDias * 24 * 60 * 60;
    await this.redis.set(
      `${PREFIXO_REVOGACAO}usuario:${usuarioId}`,
      Date.now().toString(),
      'EX',
      ttlSegundos,
    );
  }

  async revogarSessoesDoTenant(tenantId: string): Promise<void> {
    const ttlSegundos = PARAMETROS_SEGURANCA.refreshTokenTtlDias * 24 * 60 * 60;
    await this.redis.set(
      `${PREFIXO_REVOGACAO}tenant:${tenantId}`,
      Date.now().toString(),
      'EX',
      ttlSegundos,
    );
  }

  async estaRevogado(
    jti: string,
    usuarioId: string,
    tenantId: string,
    emitidoMs: number,
  ): Promise<boolean> {
    const revogadoPorJti = await this.redis.exists(`${PREFIXO_REVOGACAO}${jti}`);
    if (revogadoPorJti === 1) return true;

    const marcas = await this.redis.mget(
      `${PREFIXO_REVOGACAO}usuario:${usuarioId}`,
      `${PREFIXO_REVOGACAO}tenant:${tenantId}`,
    );

    return marcas.some((marca) => marca !== null && emitidoMs < Number(marca));
  }

  private async assinar(payload: object, expiraEm: string): Promise<string> {
    return this.jwt.signAsync(payload, {
      algorithm: PARAMETROS_SEGURANCA.jwtAlgoritmo,
      privateKey: this.config.getOrThrow<string>('JWT_PRIVATE_KEY'),
      issuer: PARAMETROS_SEGURANCA.jwtEmissor,
      audience: PARAMETROS_SEGURANCA.jwtAudiencia,
      expiresIn: expiraEm,
    });
  }

  private async verificar<T extends object>(token: string): Promise<T & { iat?: number }> {
    try {
      return await this.jwt.verifyAsync<T & { iat?: number }>(token, {
        algorithms: [PARAMETROS_SEGURANCA.jwtAlgoritmo],
        publicKey: this.config.getOrThrow<string>('JWT_PUBLIC_KEY'),
        issuer: PARAMETROS_SEGURANCA.jwtEmissor,
        audience: PARAMETROS_SEGURANCA.jwtAudiencia,
      });
    } catch {
      throw ErroAplicacao.naoAutorizado();
    }
  }
}
