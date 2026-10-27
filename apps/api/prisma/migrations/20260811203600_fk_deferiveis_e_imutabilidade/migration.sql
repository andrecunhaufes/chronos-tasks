-- A spec cria uma dependência circular entre as tabelas:
-- tenants.administrador_criador_id -> usuarios.id (fk_tenants_administrador_criador, NOT NULL)
-- usuarios.tenant_id               -> tenants.id  (fk_usuarios_tenant, NOT NULL)
-- Sem adiar a verificação não existe ordem de INSERT que satisfaça ambas no bootstrap.

ALTER TABLE "tenants"
  DROP CONSTRAINT "tenants_administrador_criador_id_fkey";

ALTER TABLE "tenants"
  ADD CONSTRAINT "tenants_administrador_criador_id_fkey"
  FOREIGN KEY ("administrador_criador_id") REFERENCES "usuarios"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "usuarios"
  DROP CONSTRAINT "usuarios_tenant_id_fkey";

ALTER TABLE "usuarios"
  ADD CONSTRAINT "usuarios_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "usuarios"
  DROP CONSTRAINT "usuarios_nivel_hierarquico_id_fkey";

ALTER TABLE "usuarios"
  ADD CONSTRAINT "usuarios_nivel_hierarquico_id_fkey"
  FOREIGN KEY ("nivel_hierarquico_id") REFERENCES "niveis_hierarquicos"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "niveis_hierarquicos"
  DROP CONSTRAINT "niveis_hierarquicos_criador_id_fkey";

ALTER TABLE "niveis_hierarquicos"
  ADD CONSTRAINT "niveis_hierarquicos_criador_id_fkey"
  FOREIGN KEY ("criador_id") REFERENCES "usuarios"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "usuarios"
  DROP CONSTRAINT "usuarios_criador_id_fkey";

ALTER TABLE "usuarios"
  ADD CONSTRAINT "usuarios_criador_id_fkey"
  FOREIGN KEY ("criador_id") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Imutabilidade da trilha de auditoria (política 3 do ASSET-053: enforcement db_constraint).
CREATE OR REPLACE FUNCTION bloquear_alteracao_auditoria() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Registros de auditoria sao imutaveis';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_trilha_auditoria_imutavel
  BEFORE UPDATE OR DELETE ON "trilha_auditoria"
  FOR EACH ROW EXECUTE FUNCTION bloquear_alteracao_auditoria();

-- Imutabilidade do historico de status (regra retention do ASSET 23773).
CREATE TRIGGER trg_historico_status_imutavel
  BEFORE UPDATE ON "historico_status_tarefas"
  FOR EACH ROW EXECUTE FUNCTION bloquear_alteracao_auditoria();
