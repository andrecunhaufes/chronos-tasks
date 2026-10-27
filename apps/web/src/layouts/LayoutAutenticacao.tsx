import { CheckSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

export function LayoutAutenticacao(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <CheckSquare className="h-6 w-6 text-sky-600" />
          {t('app.nome')}
        </div>
        <Outlet />
      </div>
    </div>
  );
}
