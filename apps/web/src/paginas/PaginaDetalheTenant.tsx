import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Etiqueta } from '@/componentes/ui';
import { tenants } from '@/servicos/recursos';

type TenantDetalhado = Awaited<ReturnType<typeof tenants.obter>> & {
  total_usuarios?: number;
  total_tarefas?: number;
};

export function PaginaDetalheTenant(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { id = '' } = useParams<{ id: string }>();

  const { data } = useQuery({ queryKey: ['tenant', id], queryFn: () => tenants.obter(id) });
  const tenant = data as TenantDetalhado | undefined;

  if (!tenant) return <p className="text-sm text-slate-500">{t('app.carregando')}</p>;

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/tenants"
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('app.voltar')}
      </Link>

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{tenant.nome_organizacao}</h1>
        <Etiqueta tom={tenant.status === 'ativo' ? 'sucesso' : 'neutro'}>
          {t(`statusRegistro.${tenant.status}`)}
        </Etiqueta>
      </header>

      <dl className="grid max-w-2xl gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <Item rotulo={t('tenants.slug')} valor={tenant.slug_tenant} />
        <Item
          rotulo={t('tenants.provisionadaEm')}
          valor={new Date(tenant.data_criacao).toLocaleString(i18n.language)}
        />
        <Item rotulo={t('tenants.totalUsuarios')} valor={String(tenant.total_usuarios ?? '—')} />
        <Item rotulo={t('tenants.totalTarefas')} valor={String(tenant.total_tarefas ?? '—')} />
      </dl>
    </div>
  );
}

function Item({ rotulo, valor }: { rotulo: string; valor: string }): JSX.Element {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{rotulo}</dt>
      <dd className="text-sm text-slate-800">{valor}</dd>
    </div>
  );
}
