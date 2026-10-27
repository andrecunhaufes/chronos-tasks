import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import {
  Aviso,
  AvisoSucesso,
  Botao,
  Campo,
  Confirmacao,
  Entrada,
  Etiqueta,
  Modal,
  Selecao,
} from '@/componentes/ui';
import { usarSessao } from '@/hooks/usarSessao';
import { extrairMensagemErro } from '@/servicos/api';
import { niveis, usuarios } from '@/servicos/recursos';
import { Perfil, Usuario } from '@/servicos/tipos';

const PERFIS_ATRIBUIVEIS: Perfil[] = ['colaborador', 'gestor', 'administrador_tenant'];

const esquema = z.object({
  nome_completo: z.string().trim().min(1, 'O nome completo é obrigatório').max(255),
  email: z.string().trim().min(1, 'O e-mail é obrigatório').email('E-mail em formato inválido'),
  nivel_hierarquico_id: z.string().uuid('Selecione um nível hierárquico'),
  perfil: z.enum(['colaborador', 'gestor', 'administrador_tenant']),
});

type Formulario = z.infer<typeof esquema>;

export function PaginaUsuarios(): JSX.Element {
  const { t, i18n } = useTranslation();
  const clienteQuery = useQueryClient();
  const { temPerfil } = usarSessao();
  const podeGerenciar = temPerfil('administrador_tenant');

  const [modalAberto, definirModalAberto] = useState(false);
  const [aDesativar, definirADesativar] = useState<Usuario | null>(null);
  const [erro, definirErro] = useState<string | null>(null);
  const [sucesso, definirSucesso] = useState<string | null>(null);

  const { data: lista } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => usuarios.listar({ limit: 100 }),
  });
  const { data: listaNiveis } = useQuery({ queryKey: ['niveis'], queryFn: niveis.listar });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { perfil: 'colaborador' },
  });

  const invalidar = (): Promise<void> =>
    clienteQuery.invalidateQueries({ queryKey: ['usuarios'] }).then(() => undefined);

  const criar = useMutation({
    mutationFn: (dados: Formulario) => usuarios.criar(dados),
    onSuccess: async () => {
      definirModalAberto(false);
      definirSucesso(t('usuarios.conviteEnviado'));
      reset();
      await invalidar();
    },
    onError: (falha) => definirErro(extrairMensagemErro(falha)),
  });

  const alternarStatus = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      ativo ? usuarios.desativar(id) : usuarios.ativar(id),
    onSuccess: async (_resultado, variaveis) => {
      definirSucesso(
        variaveis.ativo ? t('usuarios.usuarioDesativado') : t('usuarios.usuarioAtivado'),
      );
      definirErro(null);
      await invalidar();
    },
    onError: (falha) => definirErro(extrairMensagemErro(falha)),
  });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{t('usuarios.titulo')}</h1>

        {podeGerenciar ? (
          <Botao onClick={() => definirModalAberto(true)}>
            <Plus className="h-4 w-4" />
            {t('usuarios.novoUsuario')}
          </Botao>
        ) : null}
      </header>

      {erro ? <Aviso mensagem={erro} /> : null}
      {sucesso ? <AvisoSucesso mensagem={sucesso} /> : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">{t('usuarios.nomeCompleto')}</th>
              <th className="px-4 py-3">{t('usuarios.email')}</th>
              <th className="px-4 py-3">{t('usuarios.nivelHierarquico')}</th>
              <th className="px-4 py-3">{t('usuarios.perfil')}</th>
              <th className="px-4 py-3">{t('usuarios.status')}</th>
              <th className="px-4 py-3">{t('usuarios.cadastradoEm')}</th>
              {podeGerenciar ? <th className="px-4 py-3" /> : null}
            </tr>
          </thead>
          <tbody>
            {lista?.data.map((usuario) => (
              <tr key={usuario.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <Link to={`/users/${usuario.id}`} className="text-sky-700 hover:underline">
                    {usuario.nome_completo}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{usuario.email}</td>
                <td className="px-4 py-3 text-slate-600">{usuario.nivel_hierarquico_nome}</td>
                <td className="px-4 py-3 text-slate-600">{t(`perfilUsuario.${usuario.perfil}`)}</td>
                <td className="px-4 py-3">
                  <Etiqueta tom={usuario.status === 'ativo' ? 'sucesso' : 'neutro'}>
                    {t(`statusRegistro.${usuario.status}`)}
                  </Etiqueta>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(usuario.data_criacao).toLocaleDateString(i18n.language)}
                </td>
                {podeGerenciar ? (
                  <td className="px-4 py-3 text-right">
                    <Botao
                      variante="secundario"
                      onClick={() => {
                        if (usuario.status === 'ativo') {
                          definirADesativar(usuario);
                          return;
                        }
                        alternarStatus.mutate({ id: usuario.id, ativo: false });
                      }}
                    >
                      {usuario.status === 'ativo' ? t('usuarios.desativar') : t('usuarios.ativar')}
                    </Botao>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>

        {lista?.data.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">{t('app.nenhumResultado')}</p>
        ) : null}
      </div>

      <Confirmacao
        aberto={aDesativar !== null}
        titulo={t('usuarios.desativar')}
        mensagem={t('usuarios.confirmarDesativacao', { nome: aDesativar?.nome_completo ?? '' })}
        rotuloConfirmar={t('usuarios.desativar')}
        rotuloCancelar={t('app.cancelar')}
        aoConfirmar={() => {
          if (aDesativar) alternarStatus.mutate({ id: aDesativar.id, ativo: true });
          definirADesativar(null);
        }}
        aoCancelar={() => definirADesativar(null)}
      />

      <Modal
        aberto={modalAberto}
        titulo={t('usuarios.novoUsuario')}
        aoFechar={() => definirModalAberto(false)}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((dados) => criar.mutate(dados))}
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
              <option value="">—</option>
              {listaNiveis?.map((nivel) => (
                <option key={nivel.id} value={nivel.id}>
                  {nivel.nome}
                </option>
              ))}
            </Selecao>
          </Campo>

          <Campo rotulo={t('usuarios.perfil')} erro={errors.perfil?.message}>
            <Selecao {...register('perfil')}>
              {PERFIS_ATRIBUIVEIS.map((perfil) => (
                <option key={perfil} value={perfil}>
                  {t(`perfilUsuario.${perfil}`)}
                </option>
              ))}
            </Selecao>
          </Campo>

          <div className="flex justify-end gap-2">
            <Botao type="button" variante="secundario" onClick={() => definirModalAberto(false)}>
              {t('app.cancelar')}
            </Botao>
            <Botao type="submit" disabled={criar.isPending}>
              {t('app.salvar')}
            </Botao>
          </div>
        </form>
      </Modal>
    </div>
  );
}
