import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import { FormularioSenha } from '@/componentes/FormularioSenha';
import { Aviso, AvisoSucesso, Botao, Campo, Entrada, Etiqueta, Selecao } from '@/componentes/ui';
import { usarSessao } from '@/hooks/usarSessao';
import { extrairMensagemErro } from '@/servicos/api';
import { niveis, usuarios } from '@/servicos/recursos';

const esquema = z.object({
  nome_completo: z.string().trim().min(1).max(255),
  email: z.string().trim().min(1).email(),
  nivel_hierarquico_id: z.string().uuid(),
});

type Formulario = z.infer<typeof esquema>;

export function PaginaPerfilUsuario(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id?: string }>();
  const clienteQuery = useQueryClient();
  const { usuario: sessaoUsuario, temPerfil } = usarSessao();

  const usuarioId = id ?? sessaoUsuario?.id ?? '';
  const podeEditar = temPerfil('administrador_tenant');
  const [erro, definirErro] = useState<string | null>(null);
  const [sucesso, definirSucesso] = useState<string | null>(null);

  const { data: usuario } = useQuery({
    queryKey: ['usuario', usuarioId],
    queryFn: () => usuarios.obter(usuarioId),
    enabled: usuarioId !== '',
  });

  const { data: listaNiveis } = useQuery({
    queryKey: ['niveis'],
    queryFn: niveis.listar,
    enabled: podeEditar,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    values: usuario
      ? {
          nome_completo: usuario.nome_completo,
          email: usuario.email,
          nivel_hierarquico_id: usuario.nivel_hierarquico_id,
        }
      : undefined,
  });

  const atualizar = useMutation({
    mutationFn: (dados: Formulario) => usuarios.atualizar(usuarioId, dados),
    onSuccess: async () => {
      definirSucesso(t('usuarios.usuarioAtualizado'));
      definirErro(null);
      await clienteQuery.invalidateQueries({ queryKey: ['usuario', usuarioId] });
    },
    onError: (falha) => definirErro(extrairMensagemErro(falha)),
  });

  if (!usuario) return <p className="text-sm text-slate-500">{t('app.carregando')}</p>;

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/users"
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('app.voltar')}
      </Link>

      {erro ? <Aviso mensagem={erro} /> : null}
      {sucesso ? <AvisoSucesso mensagem={sucesso} /> : null}

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{usuario.nome_completo}</h1>
        <Etiqueta tom={usuario.status === 'ativo' ? 'sucesso' : 'neutro'}>
          {t(`statusRegistro.${usuario.status}`)}
        </Etiqueta>
        <Etiqueta>{t(`perfilUsuario.${usuario.perfil}`)}</Etiqueta>
      </header>

      {podeEditar ? (
        <form
          className="flex max-w-lg flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4"
          onSubmit={handleSubmit((dados) => atualizar.mutate(dados))}
        >
          <Campo rotulo={t('usuarios.nomeCompleto')} erro={errors.nome_completo?.message}>
            <Entrada maxLength={255} {...register('nome_completo')} />
          </Campo>

          <Campo rotulo={t('usuarios.email')} erro={errors.email?.message}>
            <Entrada type="email" {...register('email')} />
          </Campo>

          <Campo
            rotulo={t('usuarios.nivelHierarquico')}
            erro={errors.nivel_hierarquico_id?.message}
          >
            <Selecao {...register('nivel_hierarquico_id')}>
              {listaNiveis?.map((nivel) => (
                <option key={nivel.id} value={nivel.id}>
                  {nivel.nome}
                </option>
              ))}
            </Selecao>
          </Campo>

          <div className="flex justify-end">
            <Botao type="submit" disabled={atualizar.isPending}>
              {t('app.salvar')}
            </Botao>
          </div>
        </form>
      ) : (
        <dl className="grid max-w-lg gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">
              {t('usuarios.email')}
            </dt>
            <dd className="text-sm text-slate-800">{usuario.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">
              {t('usuarios.nivelHierarquico')}
            </dt>
            <dd className="text-sm text-slate-800">{usuario.nivel_hierarquico_nome}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">
              {t('usuarios.cadastradoEm')}
            </dt>
            <dd className="text-sm text-slate-800">
              {new Date(usuario.data_criacao).toLocaleDateString(i18n.language)}
            </dd>
          </div>
        </dl>
      )}

      {usuarioId === sessaoUsuario?.id ? <FormularioSenha /> : null}
    </div>
  );
}
