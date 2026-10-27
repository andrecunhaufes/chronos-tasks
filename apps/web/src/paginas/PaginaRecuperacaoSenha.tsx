import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Aviso, Botao, Campo, Entrada } from '@/componentes/ui';
import { extrairMensagemErro } from '@/servicos/api';
import { autenticacao } from '@/servicos/recursos';

const esquema = z.object({ email: z.string().min(1).email() });
type Formulario = z.infer<typeof esquema>;

export function PaginaRecuperacaoSenha(): JSX.Element {
  const { t } = useTranslation();
  const [mensagem, definirMensagem] = useState<string | null>(null);
  const [erro, definirErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Formulario>({ resolver: zodResolver(esquema) });

  const solicitar = useMutation({
    mutationFn: (dados: Formulario) => autenticacao.solicitarRecuperacao(dados.email),
    onSuccess: (resultado) => definirMensagem(resultado.mensagem),
    onError: (falha) => definirErro(extrairMensagemErro(falha)),
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((dados) => {
        definirErro(null);
        solicitar.mutate(dados);
      })}
    >
      <h1 className="text-xl font-semibold text-slate-900">{t('recuperacao.titulo')}</h1>
      <p className="text-sm text-slate-600">{t('recuperacao.descricao')}</p>

      {erro ? <Aviso mensagem={erro} /> : null}
      {mensagem ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {mensagem}
        </div>
      ) : null}

      <Campo rotulo={t('login.email')} erro={errors.email?.message}>
        <Entrada type="email" autoComplete="email" {...register('email')} />
      </Campo>

      <Botao type="submit" disabled={solicitar.isPending}>
        {t('recuperacao.enviar')}
      </Botao>

      <Link to="/login" className="text-center text-sm text-sky-600 hover:underline">
        {t('recuperacao.voltarLogin')}
      </Link>
    </form>
  );
}
