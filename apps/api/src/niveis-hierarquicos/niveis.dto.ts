import { z } from 'zod';
import { nomeNivelSchema } from '../common/validacao/esquemas-comuns';

export const criarNivelSchema = z.object({
  nome: nomeNivelSchema,
  profundidade: z
    .number()
    .int('A profundidade deve ser um número inteiro')
    .min(1, 'A profundidade deve ser maior ou igual a 1'),
});

export const atualizarNivelSchema = criarNivelSchema
  .partial()
  .refine((dados) => dados.nome !== undefined || dados.profundidade !== undefined, {
    message: 'Informe ao menos um campo para atualização',
  });

export type CriarNivelDto = z.infer<typeof criarNivelSchema>;
export type AtualizarNivelDto = z.infer<typeof atualizarNivelSchema>;
