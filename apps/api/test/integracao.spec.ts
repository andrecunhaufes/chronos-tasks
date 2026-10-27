import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { json } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

// Testes de integração dos handlers exigidos pelo stack_id 732: respostas, status codes
// e isolamento multi-tenant. Depende do banco e do Redis de desenvolvimento e do seed
// `prisma/seed.ts` (administrador da plataforma).
const EMAIL_PLATAFORMA = process.env.SEED_ADMIN_EMAIL ?? 'admin@chronos.local';
const SENHA_PLATAFORMA = process.env.SEED_ADMIN_PASSWORD ?? 'Chronos@2026';

describe('Handlers da API', () => {
  let app: INestApplication;
  let tokenPlataforma: string;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();

    // O AppModule já registra filtro de exceção e interceptor de envelope
    // por APP_FILTER/APP_INTERCEPTOR; registrá-los aqui duplicaria o envelope.
    app = modulo.createNestApplication();
    app.use(json({ limit: '10mb' }));
    await app.init();

    const resposta = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: EMAIL_PLATAFORMA, password: SENHA_PLATAFORMA });

    tokenPlataforma = resposta.body.data.access_token;
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  describe('POST /api/auth/login', () => {
    it('devolve par de tokens e dados do tenant', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: EMAIL_PLATAFORMA, password: SENHA_PLATAFORMA })
        .expect(200);

      expect(resposta.body.data).toHaveProperty('access_token');
      expect(resposta.body.data).toHaveProperty('refresh_token');
      expect(resposta.body.data.tenant).toHaveProperty('slug');
      expect(resposta.body.meta).toHaveProperty('request_id');
    });

    it('recusa credencial inválida com mensagem genérica', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: EMAIL_PLATAFORMA, password: 'Errada@123' })
        .expect(401);

      expect(resposta.body.error.code).toBe('UNAUTHORIZED');
      expect(resposta.body.error.message).toBe('Credenciais inválidas');
    });

    it('valida formato de entrada antes de consultar credenciais', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'sem-formato', password: '' })
        .expect(400);

      expect(resposta.body.error.code).toBe('INVALID_INPUT');
      expect(resposta.body.error.details).toHaveLength(2);
    });
  });

  describe('Autenticação nas rotas protegidas', () => {
    it('recusa requisição sem token', async () => {
      const resposta = await request(app.getHttpServer()).get('/api/tasks').expect(401);
      expect(resposta.headers['www-authenticate']).toContain('Bearer');
    });

    it('recusa token malformado', async () => {
      await request(app.getHttpServer())
        .get('/api/tasks')
        .set('Authorization', 'Bearer nao-e-um-jwt')
        .expect(401);
    });

    it('aceita token válido', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenPlataforma}`)
        .expect(200);
    });
  });

  describe('Autorização por perfil', () => {
    it('bloqueia criação de tarefa pelo administrador da plataforma', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${tokenPlataforma}`)
        .send({
          titulo: 'Tarefa proibida',
          responsavel_id: '00000000-0000-0000-0000-000000000000',
          prioridade: 'alta',
        })
        .expect(403);

      expect(resposta.body.error.code).toBe('FORBIDDEN');
    });

    it('permite provisionamento de tenant pelo administrador da plataforma', async () => {
      const slug = `it-${Date.now().toString(36)}`;

      const resposta = await request(app.getHttpServer())
        .post('/api/tenants')
        .set('Authorization', `Bearer ${tokenPlataforma}`)
        .send({ nome_organizacao: 'Org Integração', slug_tenant: slug })
        .expect(201);

      expect(resposta.body.data.slug_tenant).toBe(slug);
      expect(resposta.body.data.status).toBe('ativo');
    });

    it('recusa slug duplicado com 409', async () => {
      const slug = `dup-${Date.now().toString(36)}`;
      const corpo = { nome_organizacao: 'Org Duplicada', slug_tenant: slug };

      await request(app.getHttpServer())
        .post('/api/tenants')
        .set('Authorization', `Bearer ${tokenPlataforma}`)
        .send(corpo)
        .expect(201);

      const resposta = await request(app.getHttpServer())
        .post('/api/tenants')
        .set('Authorization', `Bearer ${tokenPlataforma}`)
        .send(corpo)
        .expect(409);

      expect(resposta.body.error.details.field).toBe('slug_tenant');
    });
  });

  describe('Envelopes e cabeçalhos', () => {
    it('responde 404 com código estável', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/api/tenants/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tokenPlataforma}`)
        .expect(404);

      expect(resposta.body.error.code).toBe('NOT_FOUND');
    });

    it('aplica os cabeçalhos de segurança em toda resposta', async () => {
      const resposta = await request(app.getHttpServer()).get('/health').expect(200);

      expect(resposta.headers['content-security-policy']).toContain("default-src 'self'");
      expect(resposta.headers['strict-transport-security']).toContain('max-age=31536000');
      expect(resposta.headers['x-content-type-options']).toBe('nosniff');
    });

    it('expõe métricas no formato Prometheus', async () => {
      const resposta = await request(app.getHttpServer()).get('/metrics').expect(200);
      expect(resposta.text).toContain('http_requests_total');
    });
  });
});
