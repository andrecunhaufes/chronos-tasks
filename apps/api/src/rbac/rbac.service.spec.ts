import { Perfil } from '@prisma/client';
import { beforeAll, describe, expect, it } from 'vitest';
import { ACAO, RECURSO } from './politicas';
import { RbacService } from './rbac.service';

describe('RbacService', () => {
  const rbac = new RbacService();

  beforeAll(async () => {
    await rbac.onModuleInit();
  });

  it('permite que qualquer perfil de tenant crie tarefas', async () => {
    for (const perfil of [Perfil.colaborador, Perfil.gestor, Perfil.administrador_tenant]) {
      expect(await rbac.permite(perfil, RECURSO.TAREFA, ACAO.CRIAR)).toBe(true);
    }
  });

  it('restringe cadastro de usuários ao administrador do tenant', async () => {
    expect(await rbac.permite(Perfil.administrador_tenant, RECURSO.USUARIO, ACAO.CRIAR)).toBe(true);
    expect(await rbac.permite(Perfil.gestor, RECURSO.USUARIO, ACAO.CRIAR)).toBe(false);
    expect(await rbac.permite(Perfil.colaborador, RECURSO.USUARIO, ACAO.CRIAR)).toBe(false);
  });

  it('restringe provisionamento de tenants ao administrador da plataforma', async () => {
    expect(await rbac.permite(Perfil.administrador_plataforma, RECURSO.TENANT, ACAO.CRIAR)).toBe(
      true,
    );
    expect(await rbac.permite(Perfil.administrador_tenant, RECURSO.TENANT, ACAO.CRIAR)).toBe(false);
    expect(await rbac.permite(Perfil.gestor, RECURSO.TENANT, ACAO.CRIAR)).toBe(false);
  });

  it('restringe gestão de níveis hierárquicos ao administrador do tenant', async () => {
    expect(
      await rbac.permite(Perfil.administrador_tenant, RECURSO.NIVEL_HIERARQUICO, ACAO.CRIAR),
    ).toBe(true);
    expect(await rbac.permite(Perfil.gestor, RECURSO.NIVEL_HIERARQUICO, ACAO.CRIAR)).toBe(false);
  });

  it('não concede exclusão de tarefa ao colaborador', async () => {
    expect(await rbac.permite(Perfil.colaborador, RECURSO.TAREFA, ACAO.EXCLUIR)).toBe(false);
    expect(await rbac.permite(Perfil.gestor, RECURSO.TAREFA, ACAO.EXCLUIR)).toBe(true);
  });
});
