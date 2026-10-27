import { CheckSquare, Globe, LayoutGrid, LogOut, Network, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/componentes/ui';
import { usarSessao } from '@/hooks/usarSessao';
import { trocarIdioma } from '@/i18n';
import { Perfil } from '@/servicos/tipos';

type ItemNavegacao = {
  para: string;
  rotulo: string;
  icone: typeof CheckSquare;
  perfis?: Perfil[];
};

export function AppShell(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { usuario, temPerfil, encerrar } = usarSessao();
  const localizacao = useLocation();

  const itens: ItemNavegacao[] = [
    { para: '/tasks', rotulo: t('navegacao.tarefas'), icone: LayoutGrid },
    {
      para: '/users',
      rotulo: t('navegacao.usuarios'),
      icone: Users,
      perfis: ['gestor', 'administrador_tenant'],
    },
    {
      para: '/hierarchy-levels',
      rotulo: t('navegacao.niveis'),
      icone: Network,
      perfis: ['administrador_tenant'],
    },
    {
      para: '/tenants',
      rotulo: t('navegacao.organizacoes'),
      icone: Globe,
      perfis: ['administrador_plataforma'],
    },
  ];

  const visiveis = itens.filter((item) => !item.perfis || temPerfil(...item.perfis));

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <CheckSquare className="h-5 w-5 text-sky-600" />
          {t('app.nome')}
        </div>

        <div className="flex items-center gap-3">
          <select
            aria-label={t('navegacao.idioma')}
            value={i18n.language}
            onChange={(evento) => trocarIdioma(evento.target.value as 'pt-BR' | 'en-US')}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs"
          >
            <option value="pt-BR">Português</option>
            <option value="en-US">English</option>
          </select>

          <NavLink to="/profile" className="text-sm text-slate-600 hover:text-slate-900">
            {usuario?.nome_completo}
          </NavLink>

          <button
            type="button"
            onClick={() => void encerrar()}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t('navegacao.sair')}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white p-2 md:w-56 md:flex-col md:border-b-0 md:border-r">
          {visiveis.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm',
                  isActive
                    ? 'bg-sky-50 font-medium text-sky-700'
                    : 'text-slate-600 hover:bg-slate-100',
                )
              }
            >
              <item.icone className="h-4 w-4" />
              {item.rotulo}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 p-4 md:p-6">
          <nav aria-label="breadcrumb" className="mb-4 text-xs text-slate-500">
            {localizacao.pathname}
          </nav>
          <Outlet />
        </main>
      </div>

      <footer className="border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-400">
        {t('app.nome')}
      </footer>
    </div>
  );
}
