import { Perfil } from '@prisma/client';

export const RECURSO = {
  TAREFA: 'tarefa',
  USUARIO: 'usuario',
  NIVEL_HIERARQUICO: 'nivel_hierarquico',
  TENANT: 'tenant',
  AUDITORIA: 'auditoria',
} as const;

export type Recurso = (typeof RECURSO)[keyof typeof RECURSO];

export const ACAO = {
  CRIAR: 'criar',
  LER: 'ler',
  EDITAR: 'editar',
  CONCLUIR: 'concluir',
  ALTERAR_STATUS: 'alterar_status',
  EXCLUIR: 'excluir',
  ATIVAR: 'ativar',
  DESATIVAR: 'desativar',
} as const;

export type Acao = (typeof ACAO)[keyof typeof ACAO];

export const MODELO_CASBIN = `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = r.sub == p.sub && r.obj == p.obj && r.act == p.act
`;

export const POLITICAS: readonly (readonly [Perfil, Recurso, Acao])[] = [
  [Perfil.colaborador, RECURSO.TAREFA, ACAO.CRIAR],
  [Perfil.colaborador, RECURSO.TAREFA, ACAO.LER],
  [Perfil.colaborador, RECURSO.TAREFA, ACAO.EDITAR],
  [Perfil.colaborador, RECURSO.TAREFA, ACAO.ALTERAR_STATUS],
  [Perfil.colaborador, RECURSO.TAREFA, ACAO.CONCLUIR],
  [Perfil.colaborador, RECURSO.USUARIO, ACAO.LER],
  [Perfil.colaborador, RECURSO.NIVEL_HIERARQUICO, ACAO.LER],

  [Perfil.gestor, RECURSO.TAREFA, ACAO.CRIAR],
  [Perfil.gestor, RECURSO.TAREFA, ACAO.LER],
  [Perfil.gestor, RECURSO.TAREFA, ACAO.EDITAR],
  [Perfil.gestor, RECURSO.TAREFA, ACAO.ALTERAR_STATUS],
  [Perfil.gestor, RECURSO.TAREFA, ACAO.CONCLUIR],
  [Perfil.gestor, RECURSO.TAREFA, ACAO.EXCLUIR],
  [Perfil.gestor, RECURSO.USUARIO, ACAO.LER],
  [Perfil.gestor, RECURSO.NIVEL_HIERARQUICO, ACAO.LER],

  [Perfil.administrador_tenant, RECURSO.TAREFA, ACAO.CRIAR],
  [Perfil.administrador_tenant, RECURSO.TAREFA, ACAO.LER],
  [Perfil.administrador_tenant, RECURSO.TAREFA, ACAO.EDITAR],
  [Perfil.administrador_tenant, RECURSO.TAREFA, ACAO.ALTERAR_STATUS],
  [Perfil.administrador_tenant, RECURSO.TAREFA, ACAO.CONCLUIR],
  [Perfil.administrador_tenant, RECURSO.TAREFA, ACAO.EXCLUIR],
  [Perfil.administrador_tenant, RECURSO.USUARIO, ACAO.CRIAR],
  [Perfil.administrador_tenant, RECURSO.USUARIO, ACAO.LER],
  [Perfil.administrador_tenant, RECURSO.USUARIO, ACAO.EDITAR],
  [Perfil.administrador_tenant, RECURSO.USUARIO, ACAO.ATIVAR],
  [Perfil.administrador_tenant, RECURSO.USUARIO, ACAO.DESATIVAR],
  [Perfil.administrador_tenant, RECURSO.NIVEL_HIERARQUICO, ACAO.CRIAR],
  [Perfil.administrador_tenant, RECURSO.NIVEL_HIERARQUICO, ACAO.LER],
  [Perfil.administrador_tenant, RECURSO.NIVEL_HIERARQUICO, ACAO.EDITAR],
  [Perfil.administrador_tenant, RECURSO.NIVEL_HIERARQUICO, ACAO.EXCLUIR],
  [Perfil.administrador_tenant, RECURSO.AUDITORIA, ACAO.LER],

  [Perfil.administrador_plataforma, RECURSO.TENANT, ACAO.CRIAR],
  [Perfil.administrador_plataforma, RECURSO.TENANT, ACAO.LER],
  [Perfil.administrador_plataforma, RECURSO.TENANT, ACAO.ATIVAR],
  [Perfil.administrador_plataforma, RECURSO.TENANT, ACAO.DESATIVAR],
  [Perfil.administrador_plataforma, RECURSO.USUARIO, ACAO.LER],
  [Perfil.administrador_plataforma, RECURSO.USUARIO, ACAO.CRIAR],
  [Perfil.administrador_plataforma, RECURSO.USUARIO, ACAO.EDITAR],
  [Perfil.administrador_plataforma, RECURSO.USUARIO, ACAO.ATIVAR],
  [Perfil.administrador_plataforma, RECURSO.USUARIO, ACAO.DESATIVAR],
  [Perfil.administrador_plataforma, RECURSO.NIVEL_HIERARQUICO, ACAO.CRIAR],
  [Perfil.administrador_plataforma, RECURSO.NIVEL_HIERARQUICO, ACAO.LER],
  [Perfil.administrador_plataforma, RECURSO.AUDITORIA, ACAO.LER],
];
