import { Prioridade } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { ehAtrasada, ehCritica } from './destaque-tarefa';
import { STATUS_TAREFA } from './status-tarefa';

const DIA_MS = 24 * 60 * 60 * 1000;
const AGORA = new Date('2026-08-11T12:00:00.000Z');

describe('ehCritica', () => {
  it('destaca apenas prioridades alta e urgente', () => {
    expect(ehCritica(Prioridade.alta)).toBe(true);
    expect(ehCritica(Prioridade.urgente)).toBe(true);
    expect(ehCritica(Prioridade.media)).toBe(false);
    expect(ehCritica(Prioridade.baixa)).toBe(false);
  });
});

describe('ehAtrasada', () => {
  it('não destaca tarefa sem prazo', () => {
    expect(ehAtrasada(null, STATUS_TAREFA.A_FAZER, AGORA)).toBe(false);
  });

  it('não destaca tarefa concluída com prazo vencido', () => {
    const vencida = new Date(AGORA.getTime() - 5 * DIA_MS);
    expect(ehAtrasada(vencida, STATUS_TAREFA.CONCLUIDO, AGORA)).toBe(false);
  });

  it('destaca tarefa ativa com prazo vencido', () => {
    const vencida = new Date(AGORA.getTime() - DIA_MS);
    expect(ehAtrasada(vencida, STATUS_TAREFA.EM_ANDAMENTO, AGORA)).toBe(true);
  });

  it('não destaca tarefa que vence hoje', () => {
    const hoje = new Date('2026-08-11T00:00:00.000Z');
    expect(ehAtrasada(hoje, STATUS_TAREFA.A_FAZER, AGORA)).toBe(false);
  });

  it('não destaca tarefa com prazo futuro', () => {
    const futura = new Date(AGORA.getTime() + 3 * DIA_MS);
    expect(ehAtrasada(futura, STATUS_TAREFA.A_FAZER, AGORA)).toBe(false);
  });
});
