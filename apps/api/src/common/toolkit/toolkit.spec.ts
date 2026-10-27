import { describe, expect, it } from 'vitest';
import {
  calculateSessionExpirationTime,
  formatDateForDisplay,
  isDateOverdue,
  isSessionExpired,
} from './temporal';
import {
  calculatePasswordComplexityScore,
  generateTenantSlug,
  normalizeHierarchyLevelName,
  sanitizeTaskTitle,
  validateEmail,
  validatePasswordComplexity,
  validateTenantSlug,
} from './texto';

const AGORA = new Date('2026-08-11T12:00:00.000Z');
const DIA_MS = 24 * 60 * 60 * 1000;

describe('isDateOverdue', () => {
  it('considera vencida a data anterior à referência', () => {
    expect(isDateOverdue(new Date(AGORA.getTime() - DIA_MS), AGORA)).toBe(true);
  });

  it('não considera vencida a data do próprio dia', () => {
    expect(isDateOverdue(new Date('2026-08-11T23:00:00.000Z'), AGORA)).toBe(false);
  });

  it('não considera vencida a data futura', () => {
    expect(isDateOverdue(new Date(AGORA.getTime() + DIA_MS), AGORA)).toBe(false);
  });
});

describe('formatDateForDisplay', () => {
  it('formata conforme o locale informado', () => {
    const data = new Date('2026-08-11T12:00:00.000Z');
    expect(formatDateForDisplay(data, 'pt-BR')).not.toBe(formatDateForDisplay(data, 'en-US'));
  });
});

describe('sessão', () => {
  it('calcula a expiração somando os minutos informados', () => {
    const antes = Date.now();
    const expiracao = calculateSessionExpirationTime(480);
    expect(expiracao.getTime()).toBeGreaterThanOrEqual(antes + 480 * 60 * 1000);
  });

  it('identifica sessão expirada e sessão válida', () => {
    expect(isSessionExpired(new Date(AGORA.getTime() - 1), AGORA)).toBe(true);
    expect(isSessionExpired(new Date(AGORA.getTime() + 1), AGORA)).toBe(false);
  });
});

describe('validateEmail', () => {
  it('aceita endereços com TLD', () => {
    expect(validateEmail('usuario@dominio.com')).toBe(true);
    expect(validateEmail('nome.sobrenome+tag@sub.dominio.com.br')).toBe(true);
  });

  it('rejeita endereços sem TLD ou malformados', () => {
    expect(validateEmail('usuario@dominio')).toBe(false);
    expect(validateEmail('sem-arroba.com')).toBe(false);
    expect(validateEmail('@dominio.com')).toBe(false);
  });
});

describe('slug de tenant', () => {
  it('valida o padrão de 3 a 50 caracteres', () => {
    expect(validateTenantSlug('acme')).toBe(true);
    expect(validateTenantSlug('ab')).toBe(false);
    expect(validateTenantSlug('Acme')).toBe(false);
    expect(validateTenantSlug('a'.repeat(51))).toBe(false);
  });

  it('gera slug a partir do nome da organização', () => {
    expect(generateTenantSlug('Acme Soluções Ltda.')).toBe('acme-solucoes-ltda');
    expect(generateTenantSlug('  Órgão  Público  ')).toBe('orgao-publico');
  });
});

describe('normalização de texto', () => {
  it('colapsa espaços e respeita o limite do título', () => {
    expect(sanitizeTaskTitle('  Preparar   relatório  ')).toBe('Preparar relatório');
    expect(sanitizeTaskTitle('a'.repeat(300))).toHaveLength(255);
  });

  it('normaliza o nome do nível hierárquico', () => {
    expect(normalizeHierarchyLevelName('  Gestor   de Equipe ')).toBe('Gestor de Equipe');
  });
});

describe('complexidade de senha', () => {
  it('pontua uma classe de caractere por critério atendido', () => {
    expect(calculatePasswordComplexityScore('abc')).toBe(1);
    expect(calculatePasswordComplexityScore('abcdefgh')).toBe(2);
    expect(calculatePasswordComplexityScore('Chronos@2026')).toBe(5);
  });

  it('exige todos os critérios por padrão', () => {
    expect(validatePasswordComplexity('Chronos@2026')).toBe(true);
    expect(validatePasswordComplexity('chronos2026')).toBe(false);
    expect(validatePasswordComplexity('Chronos2026', 4)).toBe(true);
  });
});
