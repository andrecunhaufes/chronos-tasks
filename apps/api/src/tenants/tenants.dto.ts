import { z } from 'zod';
import { paginacaoSchema, slugTenantSchema } from '../common/validacao/esquemas-comuns';

export const provisionarTenantSchema = z.object({
  nome_organizacao: z
    .string()
    .trim()
    .min(2, 'O nome da organização deve ter no mínimo 2 caracteres')
    .max(255, 'O nome da organização deve ter no máximo 255 caracteres'),
  slug_tenant: slugTenantSchema,
});

export const listarTenantsSchema = paginacaoSchema.extend({
  status: z.enum(['ativo', 'inativo']).optional(),
  busca: z.string().trim().max(255).optional(),
});

export type ProvisionarTenantDto = z.infer<typeof provisionarTenantSchema>;
export type ListarTenantsDto = z.infer<typeof listarTenantsSchema>;
