import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { CampoSenha } from '@/componentes/CampoSenha';
import { Aviso, Botao, Campo, Entrada } from '@/componentes/ui';
import { extrairMensagemErro } from '@/servicos/api';
import { autenticacao } from '@/servicos/recursos';

const esquema = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(1),
});

type Formulario = z.infer<typeof esquema>;

export function PaginaLogin(): JSX.Element {
  const { t } = useTranslation();
  const navegar = useNavigate();
  const clienteQuery = useQueryClient();
  const [erro, definirErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({ resolver: zodResolver(esquema) });

  const entrar = useMutation({
    mutationFn: (dados: Formulario) => autenticacao.entrar(dados.email, dados.password),
    onSuccess: async () => {
      await clienteQuery.refetchQueries({ queryKey: ['sessao'] });
      navegar('/tasks', { replace: true });
    },
    onError: (falha) => definirErro(extrairMensagemErro(falha)),
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((dados) => {
        definirErro(null);
        entrar.mutate(dados);
      })}
    >
      <h1 className="text-xl font-semibold text-slate-900">{t('login.titulo')}</h1>

      {erro ? <Aviso mensagem={erro} /> : null}

      <Campo
        rotulo={t('login.email')}
        erro={errors.email ? t('login.credenciaisInvalidas') : undefined}
      >
        <Entrada type="email" autoComplete="email" {...register('email')} />
      </Campo>

      <Campo
        rotulo={t('login.senha')}
        erro={errors.password ? t('login.credenciaisInvalidas') : undefined}
      >
        <CampoSenha autoComplete="current-password" {...register('password')} />
      </Campo>

      <Botao type="submit" disabled={isSubmitting || entrar.isPending}>
        {t('login.entrar')}
      </Botao>

      <Link to="/password-recovery" className="text-center text-sm text-sky-600 hover:underline">
        {t('login.esqueciSenha')}
      </Link>
    </form>
  );
}
