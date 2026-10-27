# Chronos Tasks

Plataforma web multi-tenant de gerenciamento de tarefas com visualização em lista e Kanban.

Implementação dos requisitos do projeto 4118, cuja especificação completa está em `docs/`.

## Subir o ambiente

```bash
docker compose up -d                      # PostgreSQL 16 + Redis 7
pnpm install
```

### 1. Gerar o `.env` com o par de chaves

`JWT_PRIVATE_KEY` e `JWT_PUBLIC_KEY` são lidas **inline**, com as quebras de linha escapadas
como `\n` e o valor entre aspas duplas — apontar para o caminho de um `.pem` não funciona.

Rode de dentro de `apps/api`. O comando gera o par e grava o `.env` já no formato certo,
sem depender de `openssl` no PATH (no PowerShell ele costuma não estar). Funciona igual
nos dois shells porque não há barra invertida para o shell processar — `JSON.stringify`
produz o valor entre aspas com `\n` escapado:

```
node -e "const{generateKeyPairSync}=require('node:crypto'),fs=require('node:fs'),LF=String.fromCharCode(10);const{privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});fs.writeFileSync('.env',['NODE_ENV=development','PORT=3000','DATABASE_URL=postgresql://chronos:chronos@localhost:5432/chronos?schema=public&connection_limit=20&pool_timeout=10','REDIS_URL=redis://localhost:6379','JWT_PRIVATE_KEY='+JSON.stringify(privateKey.trim()),'JWT_PUBLIC_KEY='+JSON.stringify(publicKey.trim()),'EMAIL_API_KEY=re_troque_por_sua_chave_resend','EMAIL_REMETENTE=nao-responda@chronos.local','APP_URL_BASE=http://localhost:5173','LOG_LEVEL=info','OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317','SEED_ADMIN_EMAIL=admin@chronos.local','SEED_ADMIN_PASSWORD=Chronos@2026',''].join(LF))"
```

Prefere `openssl`? No Git Bash (o PowerShell não traz `openssl` nem `awk`), gere os `.pem`
e converta cada um para uma linha só antes de colar no `.env` entre aspas duplas:

```bash
openssl genpkey -algorithm RSA -out jwt-private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in jwt-private.pem -out jwt-public.pem

awk '{printf "%s\\\\n", $0}' jwt-private.pem   # saída em uma linha, com \n literal
awk '{printf "%s\\\\n", $0}' jwt-public.pem
```

`apps/api/.env.example` serve de referência dos campos. **Copiar por cima do `.env`
(`cp .env.example .env`) apaga as chaves já geradas** e a API passa a responder 500 no login
com `secretOrPrivateKey must be an asymmetric key`.

### 2. Migrar, semear e subir

```bash
pnpm --filter @chronos/api prisma:generate
pnpm --filter @chronos/api prisma:deploy
pnpm --filter @chronos/api seed          # cria o administrador da plataforma

pnpm dev                                  # API em :3000, web em :5173
```

O seed cria o único usuário que não pode ser criado pela API — o administrador da plataforma
(`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`). A partir dele: provisione um tenant, crie o
administrador daquele tenant, e o restante do ciclo roda pela interface.

## Comandos

| Ação | Comando |
|---|---|
| Desenvolvimento (API + web) | `pnpm dev` |
| Build de tudo | `pnpm build` |
| Portão completo | `pnpm check:all` (lint + tipos + testes) |
| Lint | `pnpm lint` |
| Formatação | `pnpm format` / `pnpm format:check` |
| Testes unitários | `pnpm --filter @chronos/api test` |
| Um teste só | `pnpm --filter @chronos/api exec vitest run src/rbac/rbac.service.spec.ts` |
| Tipos do frontend | `pnpm --filter @chronos/web type-check` |
| Nova migração | `pnpm --filter @chronos/api prisma:migrate` |

Estes exigem serviços de pé (`docker compose up -d`) e o seed aplicado:

| Ação | Comando |
|---|---|
| Testes de integração (Supertest) | `pnpm --filter @chronos/api test:integracao` |
| Tenant determinístico para E2E | `pnpm --filter @chronos/api exec tsx prisma/seed-e2e.ts` |
| Testes end-to-end (Playwright) | `pnpm --filter @chronos/web exec playwright test` |
| Volume para teste de carga | `pnpm --filter @chronos/api seed:carga` |
| Teste de carga (k6) | `pnpm --filter @chronos/api test:carga` |

O E2E precisa da API e do Vite rodando. O teste de carga usa um tenant próprio (`carga`,
`admin@carga.local`) com 10 000 tarefas e 100 usuários, separado do tenant `e2e` para não
interferir na contagem de cartões do Kanban.

## Estrutura

```
apps/api/    NestJS + Prisma + PostgreSQL + Redis (BullMQ, cache, rate limit)
apps/web/    React + Vite + Tailwind + TanStack Query + React Router
docs/        Especificação-fonte (169 artefatos + 11 094 referências)
```

## Perfis e permissões

| Perfil | Pode |
|---|---|
| `colaborador` | criar tarefas; editar e mover apenas as próprias ou atribuídas a si |
| `gestor` | tudo de tarefas do tenant, inclusive excluir; ver usuários |
| `administrador_tenant` | + cadastrar/editar/ativar/desativar usuários e níveis hierárquicos |
| `administrador_plataforma` | provisionar, ativar e desativar organizações; bootstrap de usuários |

Autorização é resolvida por Casbin (`apps/api/src/rbac/politicas.ts`) e reforçada em serviço:
todo acesso a dado é escopado por `tenant_id`, e o `AutenticacaoGuard` rejeita usuário inativo,
tenant inativo e sessão revogada em toda requisição.

## Segurança

- Senhas: argon2id (m=64MiB, t=3, p=4), mínimo 8 caracteres com maiúscula, minúscula, número e símbolo.
- Sessão: JWT RS256, access token de 1h, refresh de 7 dias, revogação por `jti`, por usuário e por
  tenant no Redis. O token carrega `emitido_ms` porque `iat` só tem resolução de segundos.
- Login: 5 tentativas por e-mail e por IP em 15 minutos; recuperação de senha: 3 por hora.
- Recuperação: token aleatório de 256 bits, guardado apenas como hash SHA-256, expira em 30 min,
  invalida os anteriores, é consumido no uso e derruba todas as sessões ativas.
- Isolamento: recurso de outro tenant responde 403 com mensagem própria; inexistente responde 404.
- Dados pessoais: e-mail é mascarado fora de contexto administrativo; o nome permanece visível
  porque a atribuição de responsável depende dele.
- Cabeçalhos: CSP, HSTS (1 ano), `nosniff`, `DENY` e `Referrer-Policy` em toda resposta.
- Auditoria: 18 tipos de evento em `trilha_auditoria`, imutável por trigger, com campos sensíveis
  redigidos antes da gravação.

## Observabilidade

`GET /health` (banco + cache) e `GET /metrics` (Prometheus) são públicos. Logs são JSON estruturado
via Pino carregando os 8 campos obrigatórios do schema (`logger_name`, `tenant_id`, `user_id`,
`request_id`, `trace_id` entre eles), com `authorization`, senhas e tokens redigidos. Traces saem
por OTLP na 4317 com amostragem de 10%; erros 5xx vão ao Sentry quando `SENTRY_DSN` está definido.

Um job diário às 2h (`node-cron`) aplica a política de retenção; o disparo manual fica em
`POST /api/maintenance/retention`, restrito ao administrador da plataforma.
