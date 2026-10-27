-- CreateEnum
CREATE TYPE "StatusRegistro" AS ENUM ('ativo', 'inativo');

-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('colaborador', 'gestor', 'administrador_tenant', 'administrador_plataforma');

-- CreateEnum
CREATE TYPE "Prioridade" AS ENUM ('baixa', 'media', 'alta', 'urgente');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "status" "StatusRegistro" NOT NULL,
    "data_criacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "administrador_criador_id" UUID NOT NULL,
    "data_ultima_ativacao" TIMESTAMPTZ(6),
    "data_ultima_desativacao" TIMESTAMPTZ(6),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "niveis_hierarquicos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "profundidade" INTEGER NOT NULL,
    "data_criacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criador_id" UUID NOT NULL,
    "data_ultima_edicao" TIMESTAMPTZ(6),
    "ultimo_editor_id" UUID,

    CONSTRAINT "niveis_hierarquicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nome_completo" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "nivel_hierarquico_id" UUID NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "status" "StatusRegistro" NOT NULL,
    "data_criacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criador_id" UUID,
    "data_ultima_edicao" TIMESTAMPTZ(6),
    "ultimo_editor_id" UUID,
    "data_ultima_ativacao" TIMESTAMPTZ(6),
    "data_ultima_desativacao" TIMESTAMPTZ(6),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarefas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "titulo" VARCHAR(255) NOT NULL,
    "descricao" TEXT,
    "responsavel_id" UUID NOT NULL,
    "criador_id" UUID NOT NULL,
    "prioridade" "Prioridade" NOT NULL,
    "status" VARCHAR(60) NOT NULL,
    "data_limite" DATE,
    "data_criacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_ultima_edicao" TIMESTAMPTZ(6),
    "ultimo_editor_id" UUID,
    "data_conclusao" TIMESTAMPTZ(6),
    "data_exclusao" TIMESTAMPTZ(6),

    CONSTRAINT "tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_status_tarefas" (
    "id" UUID NOT NULL,
    "tarefa_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "status_anterior" VARCHAR(60) NOT NULL,
    "status_novo" VARCHAR(60) NOT NULL,
    "data_transicao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executor_id" UUID NOT NULL,

    CONSTRAINT "historico_status_tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_recuperacao_senha" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "data_criacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_expiracao" TIMESTAMPTZ(6) NOT NULL,
    "data_uso" TIMESTAMPTZ(6),

    CONSTRAINT "tokens_recuperacao_senha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trilha_auditoria" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "executor_id" UUID,
    "tipo_operacao" VARCHAR(120) NOT NULL,
    "recurso_tipo" VARCHAR(60) NOT NULL,
    "recurso_id" UUID,
    "resultado" VARCHAR(30) NOT NULL,
    "motivo" VARCHAR(255),
    "dados_antes" JSONB,
    "dados_depois" JSONB,
    "endereco_ip" VARCHAR(60),
    "data_ocorrencia" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trilha_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "idx_tenants_status" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "idx_tenants_data_criacao" ON "tenants"("data_criacao");

-- CreateIndex
CREATE INDEX "idx_niveis_tenant_profundidade" ON "niveis_hierarquicos"("tenant_id", "profundidade");

-- CreateIndex
CREATE UNIQUE INDEX "idx_niveis_tenant_nome" ON "niveis_hierarquicos"("tenant_id", "nome");

-- CreateIndex
CREATE INDEX "idx_usuarios_tenant_status" ON "usuarios"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "idx_usuarios_tenant_nivel_hierarquico" ON "usuarios"("tenant_id", "nivel_hierarquico_id");

-- CreateIndex
CREATE INDEX "idx_usuarios_data_criacao" ON "usuarios"("data_criacao");

-- CreateIndex
CREATE UNIQUE INDEX "idx_usuarios_tenant_email" ON "usuarios"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "idx_tarefas_tenant_status" ON "tarefas"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "idx_tarefas_tenant_responsavel" ON "tarefas"("tenant_id", "responsavel_id");

-- CreateIndex
CREATE INDEX "idx_tarefas_tenant_data_limite" ON "tarefas"("tenant_id", "data_limite");

-- CreateIndex
CREATE INDEX "idx_tarefas_tenant_prioridade" ON "tarefas"("tenant_id", "prioridade");

-- CreateIndex
CREATE INDEX "idx_tarefas_data_criacao" ON "tarefas"("data_criacao");

-- CreateIndex
CREATE INDEX "idx_historico_tarefa_id" ON "historico_status_tarefas"("tarefa_id");

-- CreateIndex
CREATE INDEX "idx_historico_tenant_data_transicao" ON "historico_status_tarefas"("tenant_id", "data_transicao");

-- CreateIndex
CREATE INDEX "idx_historico_tenant_executor" ON "historico_status_tarefas"("tenant_id", "executor_id");

-- CreateIndex
CREATE INDEX "idx_historico_data_transicao" ON "historico_status_tarefas"("data_transicao");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_recuperacao_senha_token_hash_key" ON "tokens_recuperacao_senha"("token_hash");

-- CreateIndex
CREATE INDEX "idx_tokens_recuperacao_usuario" ON "tokens_recuperacao_senha"("usuario_id");

-- CreateIndex
CREATE INDEX "idx_tokens_recuperacao_expiracao" ON "tokens_recuperacao_senha"("data_expiracao");

-- CreateIndex
CREATE INDEX "idx_auditoria_tenant_data" ON "trilha_auditoria"("tenant_id", "data_ocorrencia");

-- CreateIndex
CREATE INDEX "idx_auditoria_executor" ON "trilha_auditoria"("executor_id");

-- CreateIndex
CREATE INDEX "idx_auditoria_operacao" ON "trilha_auditoria"("tipo_operacao");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_administrador_criador_id_fkey" FOREIGN KEY ("administrador_criador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "niveis_hierarquicos" ADD CONSTRAINT "niveis_hierarquicos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "niveis_hierarquicos" ADD CONSTRAINT "niveis_hierarquicos_criador_id_fkey" FOREIGN KEY ("criador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "niveis_hierarquicos" ADD CONSTRAINT "niveis_hierarquicos_ultimo_editor_id_fkey" FOREIGN KEY ("ultimo_editor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_nivel_hierarquico_id_fkey" FOREIGN KEY ("nivel_hierarquico_id") REFERENCES "niveis_hierarquicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_criador_id_fkey" FOREIGN KEY ("criador_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_ultimo_editor_id_fkey" FOREIGN KEY ("ultimo_editor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_criador_id_fkey" FOREIGN KEY ("criador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_ultimo_editor_id_fkey" FOREIGN KEY ("ultimo_editor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status_tarefas" ADD CONSTRAINT "historico_status_tarefas_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "tarefas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status_tarefas" ADD CONSTRAINT "historico_status_tarefas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status_tarefas" ADD CONSTRAINT "historico_status_tarefas_executor_id_fkey" FOREIGN KEY ("executor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_recuperacao_senha" ADD CONSTRAINT "tokens_recuperacao_senha_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trilha_auditoria" ADD CONSTRAINT "trilha_auditoria_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trilha_auditoria" ADD CONSTRAINT "trilha_auditoria_executor_id_fkey" FOREIGN KEY ("executor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
