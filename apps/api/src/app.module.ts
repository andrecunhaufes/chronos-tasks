import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { trace } from '@opentelemetry/api';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { AutenticacaoGuard } from './auth/autenticacao.guard';
import { AutorizacaoGuard } from './auth/autorizacao.guard';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { CabecalhosSegurancaMiddleware } from './common/http/cabecalhos-seguranca.middleware';
import { FiltroExcecao } from './common/erros/filtro-excecao';
import { EnvelopeInterceptor } from './common/http/envelope.interceptor';
import { validarAmbiente } from './config/configuracao';
import { CriptoModule } from './cripto/cripto.module';
import { EmailModule } from './email/email.module';
import { NiveisModule } from './niveis-hierarquicos/niveis.module';
import { MetricasInterceptor } from './observabilidade/metricas.interceptor';
import { ObservabilidadeModule } from './observabilidade/observabilidade.module';
import { PrismaModule } from './prisma/prisma.module';
import { RbacModule } from './rbac/rbac.module';
import { RedisModule } from './redis/redis.module';
import { RetencaoModule } from './retencao/retencao.module';
import { TarefasModule } from './tarefas/tarefas.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validarAmbiente }),
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (requisicao) => (requisicao.headers['x-request-id'] as string) ?? randomUUID(),
        // Campos obrigatórios e proibidos do schema de log do ASSET 23633.
        customProps: (requisicao) => {
          const usuario = (requisicao as { usuario?: { id: string; tenantId: string } }).usuario;
          return {
            logger_name: 'chronos-api',
            request_id: (requisicao as { id?: string }).id ?? null,
            trace_id: trace.getActiveSpan()?.spanContext().traceId ?? null,
            tenant_id: usuario?.tenantId ?? null,
            user_id: usuario?.id ?? null,
          };
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.nova_senha',
            'req.body.confirmacao_senha',
            'req.body.token',
            'req.body.refresh_token',
            'auth_token',
            'session_token',
            'credit_card',
            '*.password',
            '*.auth_token',
            '*.session_token',
            '*.credit_card',
          ],
          censor: '[REDIGIDO]',
        },
        autoLogging: true,
      },
    }),
    PrismaModule,
    RedisModule,
    CriptoModule,
    CacheModule,
    AuditoriaModule,
    RbacModule,
    ObservabilidadeModule,
    EmailModule,
    AuthModule,
    NiveisModule,
    UsuariosModule,
    TenantsModule,
    TarefasModule,
    RetencaoModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: FiltroExcecao },
    { provide: APP_GUARD, useClass: AutenticacaoGuard },
    { provide: APP_GUARD, useClass: AutorizacaoGuard },
    { provide: APP_INTERCEPTOR, useClass: MetricasInterceptor },
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumidor: MiddlewareConsumer): void {
    consumidor.apply(CabecalhosSegurancaMiddleware).forRoutes('*');
  }
}
