import { describe, expect, it } from 'vitest';
import { ORDEM_COLUNAS_KANBAN, STATUS_TAREFA, ehConclusao, ehStatusValido } from './status-tarefa';

describe('ehStatusValido', () => {
  it('aceita apenas os três status fixos do sistema', () => {
    expect(ehStatusValido('A Fazer')).toBe(true);
    expect(ehStatusValido('Em Andamento')).toBe(true);
    expect(ehStatusValido('Concluído')).toBe(true);
  });

  it('rejeita valores fora do conjunto permitido', () => {
    expect(ehStatusValido('Arquivado')).toBe(false);
    expect(ehStatusValido('concluido')).toBe(false);
    expect(ehStatusValido('')).toBe(false);
  });
});

describe('ehConclusao', () => {
  it('identifica apenas o status Concluído', () => {
    expect(ehConclusao(STATUS_TAREFA.CONCLUIDO)).toBe(true);
    expect(ehConclusao(STATUS_TAREFA.A_FAZER)).toBe(false);
    expect(ehConclusao(STATUS_TAREFA.EM_ANDAMENTO)).toBe(false);
  });
});

describe('ORDEM_COLUNAS_KANBAN', () => {
  it('expõe as três colunas fixas na ordem do fluxo', () => {
    expect(ORDEM_COLUNAS_KANBAN).toEqual(['A Fazer', 'Em Andamento', 'Concluído']);
  });
});
