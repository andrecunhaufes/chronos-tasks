import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { CampoSenha } from '@/componentes/CampoSenha';
import { Aviso, Botao, Campo } from '@/componentes/ui';
import { extrairMensagemErro } from '@/servicos/api';
import { autenticacao } from '@/servicos/recursos';

const esquema = z
  .object({
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

export function PaginaRedefinirSenha(): JSX.Element {
  const { t } = useTranslation();
  const parametros = useParams<{ token?: string }>();
  const [consulta] = useSearchParams();
  const token = parametros.token ?? consulta.get('token') ?? '';

  const [concluido, definirConcluido] = useState(false);
  const [erro, definirErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Formulario>({ resolver: zodResolver(esquema) });

  const redefinir = useMutation({
    mutationFn: (dados: Formulario) =>
      autenticacao.redefinirSenha(token, dados.nova_senha, dados.confirmacao_senha),
    onSuccess: () => definirConcluido(true),
    onError: (falha) => definirErro(extrairMensagemErro(falha)),
  });

  if (concluido) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {t('recuperacao.sucesso')}
        </div>
        <Link to="/login" className="text-center text-sm text-sky-600 hover:underline">
          {t('recuperacao.voltarLogin')}
        </Link>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((dados) => {
        definirErro(null);
        redefinir.mutate(dados);
      })}
    >
      <h1 className="text-xl font-semibold text-slate-900">{t('recuperacao.tituloRedefinir')}</h1>

      {erro ? (
        <>
          <Aviso mensagem={erro} />
          <Link
            to="/password-recovery"
            className="text-center text-sm text-sky-600 hover:underline"
          >
            {t('recuperacao.solicitarNovo')}
          </Link>
        </>
      ) : null}

      <Campo rotulo={t('recuperacao.novaSenha')} erro={errors.nova_senha?.message}>
        <CampoSenha autoComplete="new-password" {...register('nova_senha')} />
      </Campo>

      <Campo rotulo={t('recuperacao.confirmacaoSenha')} erro={errors.confirmacao_senha?.message}>
        <CampoSenha autoComplete="new-password" {...register('confirmacao_senha')} />
      </Campo>

      <Botao type="submit" disabled={redefinir.isPending}>
        {t('recuperacao.redefinir')}
      </Botao>
    </form>
  );
}
