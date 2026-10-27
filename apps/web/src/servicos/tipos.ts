export type Perfil = 'colaborador' | 'gestor' | 'administrador_tenant' | 'administrador_plataforma';
export type StatusRegistro = 'ativo' | 'inativo';
export type Prioridade = 'baixa' | 'media' | 'alta' | 'urgente';
// As colunas vem do catalogo do backend (GET /tasks/kanban/columns); o tipo e aberto
// para suportar colunas configuraveis por tenant sem mudar o contrato do frontend.
export type StatusTarefa = string;

export type ColunaStatus = {
  chave: StatusTarefa;
  rotulo: string;
  ordem: number;
  eh_conclusivo: boolean;
};
export const PRIORIDADES: readonly Prioridade[] = ['baixa', 'media', 'alta', 'urgente'];

export type UsuarioAutenticado = {
  id: string;
  nome_completo: string;
  email: string;
  perfil: Perfil;
  status: StatusRegistro;
  nivel_hierarquico: { id: string; nome: string; profundidade: number };
  tenant: { id: string; nome: string; slug: string; status: StatusRegistro };
};

export type Tarefa = {
  id: string;
  tenant_id: string;
  titulo: string;
  descricao: string | null;
  responsavel_id: string;
  responsavel_nome: string;
  criador_id: string;
  prioridade: Prioridade;
  status: StatusTarefa;
  data_limite: string | null;
  data_criacao: string;
  data_ultima_edicao: string | null;
  data_conclusao: string | null;
  destaque_critico: boolean;
  destaque_atrasado: boolean;
};

export type TransicaoStatus = {
  id: string;
  status_anterior: StatusTarefa;
  status_novo: StatusTarefa;
  data_transicao: string;
  executor_id: string;
  executor_nome: string;
};

export type TarefaDetalhada = Tarefa & { historico_status: TransicaoStatus[] };

export type ColunaKanban = {
  status: StatusTarefa;
  rotulo: string;
  ordem: number;
  eh_conclusivo: boolean;
  total: number;
  exibindo: number;
  tarefas: Tarefa[];
};

export type Usuario = {
  id: string;
  nome_completo: string;
  email: string;
  perfil: Perfil;
  nivel_hierarquico_id: string;
  nivel_hierarquico_nome: string;
  status: StatusRegistro;
  data_criacao: string;
  data_ultima_edicao: string | null;
};

export type NivelHierarquico = {
  id: string;
  nome: string;
  profundidade: number;
  data_criacao: string;
  data_ultima_edicao: string | null;
};

export type Tenant = {
  id: string;
  nome_organizacao: string;
  slug_tenant: string;
  status: StatusRegistro;
  data_criacao: string;
  data_ultima_ativacao: string | null;
  data_ultima_desativacao: string | null;
};

export type Paginado<T> = {
  data: T[];
  pagination: { cursor: string; has_more: boolean; total_count: number };
};
