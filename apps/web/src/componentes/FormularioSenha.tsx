import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { CampoSenha } from '@/componentes/CampoSenha';
import { Aviso, AvisoSucesso, Botao, Campo } from '@/componentes/ui';
import { extrairMensagemErro } from '@/servicos/api';
import { autenticacao } from '@/servicos/recursos';

const esquema = z
  .object({
    senha_atual: z.string().min(1, 'A senha atual é obrigatória'),
    nova_senha: z
      .string()
      .min(8, 'A senha deve ter no mínimo 8 caracteres')
      .regex(/[A-Z]/, 'A senha deve conter ao menos 1 letra maiúscula')
      .regex(/[a-z]/, 'A senha deve conter ao menos 1 letra minúscula')
      .regex(/[0-9]/, 'A senha deve conter ao menos 1 número')
      .regex(/[^A-Za-z0-9]/, 'A senha deve conter ao menos 1 caractere especial'),
    confirmacao_senha: z.string().min(1),
  })
  .refine((dados) => dados.nova_senha === dados.confirmacao_senha, {
    path: ['confirmacao_senha'],
    message: 'A confirmação de senha deve ser idêntica à nova senha',
  });

type Formulario = z.infer<typeof esquema>;

// Alteração de senha pelo próprio usuário (ASSET 23837).
export function FormularioSenha(): JSX.Element {
  const { t } = useTranslation();
  const [erro, definirErro] = useState<string | null>(null);
  const [sucesso, definirSucesso] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Formulario>({ resolver: zodResolver(esquema) });

  const alterar = useMutation({
    mutationFn: (dados: Formulario) =>
      autenticacao.alterarSenha(dados.senha_atual, dados.nova_senha, dados.confirmacao_senha),
    onSuccess: () => {
      definirSucesso(t('recuperacao.senhaAlterada'));
      definirErro(null);
      reset();
    },
    onError: (falha) => definirErro(extrairMensagemErro(falha)),
  });

  return (
    <form
      className="flex max-w-lg flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4"
      onSubmit={handleSubmit((dados) => alterar.mutate(dados))}
    >
      <h2 className="text-sm font-semibold text-slate-700">{t('recuperacao.alterarSenha')}</h2>

      {erro ? <Aviso mensagem={erro} /> : null}
      {sucesso ? <AvisoSucesso mensagem={sucesso} /> : null}

      <Campo rotulo={t('recuperacao.senhaAtual')} erro={errors.senha_atual?.message}>
        <CampoSenha autoComplete="current-password" {...register('senha_atual')} />
      </Campo>

      <Campo rotulo={t('recuperacao.novaSenha')} erro={errors.nova_senha?.message}>
        <CampoSenha autoComplete="new-password" {...register('nova_senha')} />
      </Campo>

      <Campo rotulo={t('recuperacao.confirmacaoSenha')} erro={errors.confirmacao_senha?.message}>
        <CampoSenha autoComplete="new-password" {...register('confirmacao_senha')} />
      </Campo>

      <div className="flex justify-end">
        <Botao type="submit" disabled={alterar.isPending}>
          {t('recuperacao.alterarSenha')}
        </Botao>
      </div>
    </form>
  );
}
