import { api, requisitar, sessao } from './api';
import {
  ColunaKanban,
  ColunaStatus,
  NivelHierarquico,
  Paginado,
  Prioridade,
  StatusTarefa,
  Tarefa,
  TarefaDetalhada,
  Tenant,
  Usuario,
  UsuarioAutenticado,
} from './tipos';

export type FiltrosTarefa = {
  status?: StatusTarefa;
  responsavel_id?: string;
  prioridade?: Prioridade;
  data_limite_inicio?: string;
  data_limite_fim?: string;
  pesquisa?: string;
  apenas_atrasadas?: boolean;
  apenas_criticas?: boolean;
  limit?: number;
  cursor?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
};

export const autenticacao = {
  entrar: async (email: string, password: string) => {
    const resultado = await requisitar<{
      access_token: string;
      refresh_token: string;
      user: unknown;
      tenant: unknown;
    }>(() => api.post('/auth/login', { email, password }));

    sessao.gravar(resultado.access_token, resultado.refresh_token);
    return resultado;
  },
  sair: async () => {
    await api.post('/auth/logout').catch(() => undefined);
    sessao.limpar();
  },
  usuarioAtual: () => requisitar<UsuarioAutenticado>(() => api.get('/auth/me')),
  alterarSenha: (senha_atual: string, nova_senha: string, confirmacao_senha: string) =>
    requisitar<{ mensagem: string }>(() =>
      api.post('/auth/change-password', { senha_atual, nova_senha, confirmacao_senha }),
    ),
  solicitarRecuperacao: (email: string) =>
    requisitar<{ mensagem: string }>(() => api.post('/auth/password-recovery', { email })),
  redefinirSenha: (token: string, nova_senha: string, confirmacao_senha: string) =>
    requisitar<{ mensagem: string }>(() =>
      api.post('/auth/password-recovery/reset', { token, nova_senha, confirmacao_senha }),
    ),
};

export const tarefas = {
  listar: (filtros: FiltrosTarefa) =>
    requisitar<Paginado<Tarefa>>(() => api.get('/tasks', { params: filtros })),
  quadroKanban: (filtros: Pick<FiltrosTarefa, 'responsavel_id' | 'prioridade' | 'pesquisa'>) =>
    requisitar<{ colunas: ColunaKanban[] }>(() =>
      api.get('/tasks/kanban/board', { params: filtros }),
    ),
  colunas: () => requisitar<ColunaStatus[]>(() => api.get('/tasks/kanban/columns')),
  obter: (id: string) => requisitar<TarefaDetalhada>(() => api.get(`/tasks/${id}`)),
  criar: (dados: Record<string, unknown>) => requisitar<Tarefa>(() => api.post('/tasks', dados)),
  atualizar: (id: string, dados: Record<string, unknown>) =>
    requisitar<Tarefa>(() => api.put(`/tasks/${id}`, dados)),
  alterarStatus: (id: string, status: StatusTarefa) =>
    requisitar<Tarefa>(() => api.patch(`/tasks/${id}/status`, { status })),
  concluir: (id: string) => requisitar<Tarefa>(() => api.patch(`/tasks/${id}/complete`)),
  reabrir: (id: string) => requisitar<Tarefa>(() => api.post(`/tasks/${id}/reopen`)),
  excluir: (id: string) => requisitar<{ mensagem: string }>(() => api.delete(`/tasks/${id}`)),
};

export const usuarios = {
  listar: (params: Record<string, unknown> = {}) =>
    requisitar<Paginado<Usuario>>(() => api.get('/users', { params })),
  obter: (id: string) => requisitar<Usuario>(() => api.get(`/users/${id}`)),
  criar: (dados: Record<string, unknown>) => requisitar<Usuario>(() => api.post('/users', dados)),
  atualizar: (id: string, dados: Record<string, unknown>) =>
    requisitar<Usuario>(() => api.put(`/users/${id}`, dados)),
  ativar: (id: string) => requisitar<Usuario>(() => api.patch(`/users/${id}/activate`)),
  desativar: (id: string) => requisitar<Usuario>(() => api.patch(`/users/${id}/deactivate`)),
};

export const niveis = {
  listar: () => requisitar<NivelHierarquico[]>(() => api.get('/hierarchical-levels')),
  criar: (dados: { nome: string; profundidade: number }) =>
    requisitar<NivelHierarquico>(() => api.post('/hierarchical-levels', dados)),
  atualizar: (id: string, dados: { nome?: string; profundidade?: number }) =>
    requisitar<NivelHierarquico>(() => api.put(`/hierarchical-levels/${id}`, dados)),
  excluir: (id: string) =>
    requisitar<{ mensagem: string }>(() => api.delete(`/hierarchical-levels/${id}`)),
};

export const tenants = {
  listar: (params: Record<string, unknown> = {}) =>
    requisitar<Paginado<Tenant>>(() => api.get('/tenants', { params })),
  obter: (id: string) => requisitar<Tenant>(() => api.get(`/tenants/${id}`)),
  provisionar: (dados: { nome_organizacao: string; slug_tenant: string }) =>
    requisitar<Tenant>(() => api.post('/tenants', dados)),
  ativar: (id: string) => requisitar<Tenant>(() => api.patch(`/tenants/${id}/activate`)),
  desativar: (id: string) => requisitar<Tenant>(() => api.patch(`/tenants/${id}/deactivate`)),
};
