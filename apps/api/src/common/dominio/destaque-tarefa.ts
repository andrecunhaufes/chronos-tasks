import { Prioridade } from '@prisma/client';
import { isDateOverdue } from '../toolkit/temporal';
import { STATUS_TAREFA } from './status-tarefa';

const PRIORIDADES_CRITICAS: readonly Prioridade[] = [Prioridade.alta, Prioridade.urgente];

export function ehCritica(prioridade: Prioridade): boolean {
  return PRIORIDADES_CRITICAS.includes(prioridade);
}

export function ehAtrasada(
  dataLimite: Date | null,
  status: string,
  agora: Date = new Date(),
): boolean {
  if (dataLimite === null) return false;
  if (status === STATUS_TAREFA.CONCLUIDO) return false;
  return isDateOverdue(dataLimite, agora);
}
