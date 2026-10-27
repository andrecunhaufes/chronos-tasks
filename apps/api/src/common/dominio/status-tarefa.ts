export const STATUS_TAREFA = {
  A_FAZER: 'A Fazer',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDO: 'Concluído',
} as const;

export type StatusTarefa = (typeof STATUS_TAREFA)[keyof typeof STATUS_TAREFA];

export const STATUS_TAREFA_VALORES: readonly StatusTarefa[] = [
  STATUS_TAREFA.A_FAZER,
  STATUS_TAREFA.EM_ANDAMENTO,
  STATUS_TAREFA.CONCLUIDO,
];

export const ORDEM_COLUNAS_KANBAN: readonly StatusTarefa[] = STATUS_TAREFA_VALORES;

export function ehStatusValido(valor: string): valor is StatusTarefa {
  return (STATUS_TAREFA_VALORES as readonly string[]).includes(valor);
}

export function ehConclusao(status: StatusTarefa): boolean {
  return status === STATUS_TAREFA.CONCLUIDO;
}
