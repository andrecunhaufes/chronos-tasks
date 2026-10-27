import { Perfil } from '@prisma/client';
import { z } from 'zod';
import {
  emailSchema,
  nomeCompletoSchema,
  paginacaoSchema,
  uuidSchema,
} from '../common/validacao/esquemas-comuns';

export const criarUsuarioSchema = z.object({
  nome_completo: nomeCompletoSchema,
  email: emailSchema,
  nivel_hierarquico_id: uuidSchema,
  perfil: z.nativeEnum(Perfil).default(Perfil.colaborador),
  tenant_id: uuidSchema.optional(),
});

export const atualizarUsuarioSchema = z
  .object({
    nome_completo: nomeCompletoSchema.optional(),
    email: emailSchema.optional(),
    nivel_hierarquico_id: uuidSchema.optional(),
    perfil: z.nativeEnum(Perfil).optional(),
  })
  .refine((dados) => Object.keys(dados).length > 0, {
    message: 'Informe ao menos um campo para atualização',
  });

export const listarUsuariosSchema = paginacaoSchema.extend({
  status: z.enum(['ativo', 'inativo']).optional(),
  nivel_hierarquico_id: uuidSchema.optional(),
  busca: z.string().trim().max(255).optional(),
});

export type CriarUsuarioDto = z.infer<typeof criarUsuarioSchema>;
export type AtualizarUsuarioDto = z.infer<typeof atualizarUsuarioSchema>;
export type ListarUsuariosDto = z.infer<typeof listarUsuariosSchema>;
