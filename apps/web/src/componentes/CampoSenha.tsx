import { Eye, EyeOff } from 'lucide-react';
import { InputHTMLAttributes, forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Entrada } from './ui';

// Alterna a visibilidade da senha durante o preenchimento (feature 23592).
export const CampoSenha = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function CampoSenha(props, ref) {
    const { t } = useTranslation();
    const [visivel, definirVisivel] = useState(false);

    return (
      <div className="relative">
        <Entrada {...props} ref={ref} type={visivel ? 'text' : 'password'} className="pr-10" />

        <button
          type="button"
          onClick={() => definirVisivel(!visivel)}
          aria-label={visivel ? t('login.ocultarSenha') : t('login.mostrarSenha')}
          aria-pressed={visivel}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
        >
          {visivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
