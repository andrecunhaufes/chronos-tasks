import { useTranslation } from 'react-i18next';
import { Navigate, Outlet } from 'react-router-dom';
import { usarSessao } from '@/hooks/usarSessao';
import { Perfil } from '@/servicos/tipos';

function Carregando(): JSX.Element {
  const { t } = useTranslation();
  return <div className="p-8 text-sm text-slate-500">{t('app.carregando')}</div>;
}

export function GuardaAutenticado(): JSX.Element {
  const { usuario, carregando } = usarSessao();

  if (carregando) return <Carregando />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.status !== 'ativo') return <Navigate to="/login" replace />;
  if (usuario.tenant.status !== 'ativo') return <Navigate to="/login" replace />;

  return <Outlet />;
}

export function GuardaPerfil({ perfis }: { perfis: Perfil[] }): JSX.Element {
  const { usuario, carregando } = usarSessao();

  if (carregando) return <Carregando />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (!perfis.includes(usuario.perfil)) return <Navigate to="/tasks" replace />;

  return <Outlet />;
}

export function GuardaPublica(): JSX.Element {
  const { usuario, carregando } = usarSessao();

  if (carregando) return <Carregando />;
  if (usuario) return <Navigate to="/tasks" replace />;

  return <Outlet />;
}
