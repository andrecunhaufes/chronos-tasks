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
} from '@/componentes/ui';
import { extrairMensagemErro } from '@/servicos/api';
import { tenants } from '@/servicos/recursos';
import { Tenant } from '@/servicos/tipos';

const esquema = z.object({
  nome_organizacao: z.string().trim().min(2, 'O nome da organização é obrigatório').max(255),
  slug_tenant: z
    .string()
    .trim()
    .min(1, 'O identificador é obrigatório')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens'),
});

type Formulario = z.infer<typeof esquema>;

export function PaginaTenants(): JSX.Element {
  const { t, i18n } = useTranslation();
  const clienteQuery = useQueryClient();
  const [modalAberto, definirModalAberto] = useState(false);
  const [aDesativar, definirADesativar] = useState<Tenant | null>(null);
  const [aAtivar, definirAAtivar] = useState<Tenant | null>(null);
  const [erro, definirErro] = useState<string | null>(null);
  const [sucesso, definirSucesso] = useState<string | null>(null);

  const { data: lista } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenants.listar({ limit: 100 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Formulario>({ resolver: zodResolver(esquema) });

  const invalidar = (): Promise<void> =>
    clienteQuery.invalidateQueries({ queryKey: ['tenants'] }).then(() => undefined);

  const provisionar = useMutation({
    mutationFn: (dados: Formulario) => tenants.provisionar(dados),
    onSuccess: async (tenant) => {
      definirModalAberto(false);
      definirSucesso(
        t('tenants.tenantProvisionadoDetalhe', {
          nome: tenant.nome_organizacao,
          slug: tenant.slug_tenant,
        }),
      );
      definirErro(null);
      reset();
      await invalidar();
    },
    onError: (falha) => definirErro(extrairMensagemErro(falha)),
  });

  const alternarStatus = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      ativo ? tenants.desativar(id) : tenants.ativar(id),
    onSuccess: async (_resultado, variaveis) => {
      definirSucesso(variaveis.ativo ? t('tenants.tenantDesativado') : t('tenants.tenantAtivado'));
      definirErro(null);
      await invalidar();
    },
    onError: (falha) => definirErro(extrairMensagemErro(falha)),
  });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{t('tenants.titulo')}</h1>
        <Botao onClick={() => definirModalAberto(true)}>
          <Plus className="h-4 w-4" />
          {t('tenants.novaOrganizacao')}
        </Botao>
      </header>

      {erro ? <Aviso mensagem={erro} /> : null}
      {sucesso ? <AvisoSucesso mensagem={sucesso} /> : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">{t('tenants.nomeOrganizacao')}</th>
              <th className="px-4 py-3">{t('tenants.slug')}</th>
              <th className="px-4 py-3">{t('tenants.status')}</th>
              <th className="px-4 py-3">{t('tenants.provisionadaEm')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {lista?.data.map((tenant) => (
              <tr key={tenant.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <Link to={`/tenants/${tenant.id}`} className="text-sky-700 hover:underline">
                    {tenant.nome_organizacao}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{tenant.slug_tenant}</td>
                <td className="px-4 py-3">
                  <Etiqueta tom={tenant.status === 'ativo' ? 'sucesso' : 'neutro'}>
                    {t(`statusRegistro.${tenant.status}`)}
                  </Etiqueta>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(tenant.data_criacao).toLocaleDateString(i18n.language)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Botao
                    variante="secundario"
                    onClick={() => {
                      if (tenant.status === 'ativo') {
                        definirADesativar(tenant);
                        return;
                      }
                      definirAAtivar(tenant);
                    }}
                  >
                    {tenant.status === 'ativo' ? t('tenants.desativar') : t('tenants.ativar')}
                  </Botao>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {lista?.data.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">{t('app.nenhumResultado')}</p>
        ) : null}
      </div>

      <Confirmacao
        aberto={aAtivar !== null}
        titulo={t('tenants.ativar')}
        mensagem={t('tenants.confirmarAtivacao', { nome: aAtivar?.nome_organizacao ?? '' })}
        rotuloConfirmar={t('tenants.ativar')}
        rotuloCancelar={t('app.cancelar')}
        aoConfirmar={() => {
          if (aAtivar) alternarStatus.mutate({ id: aAtivar.id, ativo: false });
          definirAAtivar(null);
        }}
        aoCancelar={() => definirAAtivar(null)}
      />

      <Confirmacao
        aberto={aDesativar !== null}
        titulo={t('tenants.desativar')}
        mensagem={t('tenants.confirmarDesativacao', { nome: aDesativar?.nome_organizacao ?? '' })}
        rotuloConfirmar={t('tenants.desativar')}
        rotuloCancelar={t('app.cancelar')}
        aoConfirmar={() => {
          if (aDesativar) alternarStatus.mutate({ id: aDesativar.id, ativo: true });
          definirADesativar(null);
        }}
        aoCancelar={() => definirADesativar(null)}
      />

      <Modal
        aberto={modalAberto}
        titulo={t('tenants.novaOrganizacao')}
        aoFechar={() => definirModalAberto(false)}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((dados) => provisionar.mutate(dados))}
        >
          <Campo rotulo={t('tenants.nomeOrganizacao')} erro={errors.nome_organizacao?.message}>
            <Entrada maxLength={255} {...register('nome_organizacao')} />
          </Campo>

          <Campo rotulo={t('tenants.slug')} erro={errors.slug_tenant?.message}>
            <Entrada maxLength={50} {...register('slug_tenant')} />
          </Campo>

          <div className="flex justify-end gap-2">
            <Botao type="button" variante="secundario" onClick={() => definirModalAberto(false)}>
              {t('app.cancelar')}
            </Botao>
            <Botao type="submit" disabled={provisionar.isPending}>
              {t('app.salvar')}
            </Botao>
          </div>
        </form>
      </Modal>
    </div>
  );
}
