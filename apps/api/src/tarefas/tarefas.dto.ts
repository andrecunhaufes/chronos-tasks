import { Prioridade } from '@prisma/client';
import { z } from 'zod';
import { paginacaoSchema, uuidSchema } from '../common/validacao/esquemas-comuns';
import { sanitizeTaskTitle } from '../common/toolkit/texto';

// O conjunto de status vem do catalogo status_tarefa (ColunasService); aqui so o formato.
const statusSchema = z.string().trim().min(1).max(60);

const tituloSchema = z
  .string()
  .max(255, 'O título da tarefa deve ter no máximo 255 caracteres')
  .transform((valor) => sanitizeTaskTitle(valor))
  .refine((valor) => valor.length > 0, 'O título da tarefa é obrigatório');

const dataLimiteSchema = z.coerce.date({
  invalid_type_error: 'A data limite deve ser uma data válida',
});

const naoPodeSerPassado = (data: Date): boolean => {
  const hoje = new Date();
  const inicioDeHoje = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
  return data.getTime() >= inicioDeHoje;
};

export const criarTarefaSchema = z.object({
  titulo: tituloSchema,
  descricao: z
    .string()
    .trim()
    .max(2000, 'A descrição deve ter no máximo 2000 caracteres')
    .optional(),
  responsavel_id: uuidSchema,
  prioridade: z.nativeEnum(Prioridade),
  status: statusSchema.optional(),
  data_limite: dataLimiteSchema
    .refine(naoPodeSerPassado, 'A data limite não pode ser anterior à data atual')
    .optional(),
});

export const atualizarTarefaSchema = z
  .object({
    titulo: tituloSchema.optional(),
    descricao: z
      .string()
      .trim()
      .max(2000, 'A descrição deve ter no máximo 2000 caracteres')
      .nullable()
      .optional(),
    responsavel_id: uuidSchema.optional(),
    prioridade: z.nativeEnum(Prioridade).optional(),
    data_limite: dataLimiteSchema
      .refine(naoPodeSerPassado, 'A data limite não pode ser anterior à data atual')
      .nullable()
      .optional(),
  })
  .refine((dados) => Object.keys(dados).length > 0, {
    message: 'Informe ao menos um campo para atualização',
  });

export const alterarStatusSchema = z.object({
  status: statusSchema,
});

const textoPesquisaSchema = z
  .string()
  .trim()
  .max(255, 'A pesquisa deve ter no máximo 255 caracteres')
  .regex(/^[\p{L}\p{N}\s-]*$/u, 'A pesquisa aceita apenas letras, números, espaços e hífens');

export const listarTarefasSchema = paginacaoSchema
  .extend({
    status: statusSchema.optional(),
    responsavel_id: uuidSchema.optional(),
    prioridade: z.nativeEnum(Prioridade).optional(),
    data_limite_inicio: z.coerce.date().optional(),
    data_limite_fim: z.coerce.date().optional(),
    pesquisa: textoPesquisaSchema.optional(),
    apenas_atrasadas: z.coerce.boolean().optional(),
    apenas_criticas: z.coerce.boolean().optional(),
  })
  .refine(
    (dados) =>
      dados.data_limite_inicio === undefined ||
      dados.data_limite_fim === undefined ||
      dados.data_limite_inicio.getTime() <= dados.data_limite_fim.getTime(),
    {
      path: ['data_limite_fim'],
      message: 'A data de início deve ser anterior ou igual à data de fim',
    },
  );

export const kanbanSchema = z.object({
  responsavel_id: uuidSchema.optional(),
  prioridade: z.nativeEnum(Prioridade).optional(),
  pesquisa: textoPesquisaSchema.optional(),
});

export type CriarTarefaDto = z.infer<typeof criarTarefaSchema>;
export type AtualizarTarefaDto = z.infer<typeof atualizarTarefaSchema>;
export type AlterarStatusDto = z.infer<typeof alterarStatusSchema>;
export type ListarTarefasDto = z.infer<typeof listarTarefasSchema>;
export type KanbanDto = z.infer<typeof kanbanSchema>;
