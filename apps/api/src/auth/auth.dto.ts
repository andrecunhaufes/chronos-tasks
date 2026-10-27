import { z } from 'zod';
import { emailSchema, senhaSchema } from '../common/validacao/esquemas-comuns';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'A senha é obrigatória'),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'O refresh token é obrigatório'),
});

export const solicitarRecuperacaoSchema = z.object({
  email: emailSchema,
});

export const redefinirSenhaSchema = z
  .object({
    token: z.string().min(1, 'O token de recuperação é obrigatório'),
    nova_senha: senhaSchema,
    confirmacao_senha: z.string().min(1, 'A confirmação de senha é obrigatória'),
  })
  .refine((dados) => dados.nova_senha === dados.confirmacao_senha, {
    path: ['confirmacao_senha'],
    message: 'A confirmação de senha deve ser idêntica à nova senha',
  });

export const alterarSenhaSchema = z
  .object({
    senha_atual: z.string().min(1, 'A senha atual é obrigatória'),
    nova_senha: senhaSchema,
    confirmacao_senha: z.string().min(1, 'A confirmação de senha é obrigatória'),
  })
  .refine((dados) => dados.nova_senha === dados.confirmacao_senha, {
    path: ['confirmacao_senha'],
    message: 'A confirmação de senha deve ser idêntica à nova senha',
  });

export type AlterarSenhaDto = z.infer<typeof alterarSenhaSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshDto = z.infer<typeof refreshSchema>;
export type SolicitarRecuperacaoDto = z.infer<typeof solicitarRecuperacaoSchema>;
export type RedefinirSenhaDto = z.infer<typeof redefinirSenhaSchema>;
