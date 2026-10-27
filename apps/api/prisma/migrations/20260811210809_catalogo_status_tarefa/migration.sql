-- CreateTable
CREATE TABLE "status_tarefa" (
    "id" UUID NOT NULL,
    "chave" VARCHAR(60) NOT NULL,
    "rotulo" VARCHAR(60) NOT NULL,
    "ordem" INTEGER NOT NULL,
    "eh_conclusivo" BOOLEAN NOT NULL DEFAULT false,
    "tenant_id" UUID,
    "data_criacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_tarefa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "status_tarefa_chave_key" ON "status_tarefa"("chave");

-- CreateIndex
CREATE INDEX "idx_status_tarefa_ordem" ON "status_tarefa"("ordem");

-- Colunas fixas do sistema (feature 23628 / ASSET 23773). tenant_id NULL = compartilhada
-- por todos os tenants; a coluna existe para permitir colunas proprias por tenant no futuro.
INSERT INTO "status_tarefa" ("id", "chave", "rotulo", "ordem", "eh_conclusivo", "tenant_id")
VALUES
  (gen_random_uuid(), 'A Fazer',      'A Fazer',      1, false, NULL),
  (gen_random_uuid(), 'Em Andamento', 'Em Andamento', 2, false, NULL),
  (gen_random_uuid(), 'Concluído',    'Concluído',    3, true,  NULL);

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_status_fkey" FOREIGN KEY ("status") REFERENCES "status_tarefa"("chave") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status_tarefas" ADD CONSTRAINT "historico_status_tarefas_status_anterior_fkey" FOREIGN KEY ("status_anterior") REFERENCES "status_tarefa"("chave") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status_tarefas" ADD CONSTRAINT "historico_status_tarefas_status_novo_fkey" FOREIGN KEY ("status_novo") REFERENCES "status_tarefa"("chave") ON DELETE RESTRICT ON UPDATE CASCADE;
