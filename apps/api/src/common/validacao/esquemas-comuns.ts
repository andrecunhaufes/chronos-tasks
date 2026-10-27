import { z } from 'zod';
import { PARAMETROS_SEGURANCA } from '../../config/configuracao';
import {
  normalizeHierarchyLevelName,
  validateEmail,
  validatePasswordComplexity,
  validateTenantSlug,
} from '../toolkit/texto';

export const uuidSchema = z.string().uuid('Deve ser um identificador UUID válido');

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'O endereço de e-mail é obrigatório')
  .max(255, 'O endereço de e-mail deve ter no máximo 255 caracteres')
  .refine(validateEmail, 'O endereço de e-mail deve estar em formato válido');

export const nomeCompletoSchema = z
  .string()
  .trim()
  .min(1, 'O nome completo é obrigatório e não pode conter apenas espaços em branco')
  .max(255, 'O nome completo deve ter no máximo 255 caracteres');

export const slugTenantSchema = z
  .string()
  .trim()
  .refine(
    validateTenantSlug,
    'O identificador deve ter de 3 a 50 caracteres, apenas letras minúsculas, números e hífens',
  );

export const senhaSchema = z
  .string()
  .min(
    PARAMETROS_SEGURANCA.senhaTamanhoMinimo,
    `A senha deve ter no mínimo ${PARAMETROS_SEGURANCA.senhaTamanhoMinimo} caracteres`,
  )
  .max(128, 'A senha deve ter no máximo 128 caracteres')
  .refine(
    (senha) => validatePasswordComplexity(senha),
    'A senha deve conter maiúscula, minúscula, número e caractere especial',
  );

export const nomeNivelSchema = z
  .string()
  .transform((nome) => normalizeHierarchyLevelName(nome))
  .refine((nome) => nome.length > 0, 'O nome do nível hierárquico é obrigatório');

export const paginacaoSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  sort_by: z.string().default('data_criacao'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export type Paginacao = z.infer<typeof paginacaoSchema>;
