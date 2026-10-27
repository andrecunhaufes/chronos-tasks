import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { pt } from './pt';

const CHAVE_IDIOMA = 'chronos.idioma';

void i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { traducao: pt },
    'en-US': { traducao: en },
  },
  lng: localStorage.getItem(CHAVE_IDIOMA) ?? 'pt-BR',
  fallbackLng: 'pt-BR',
  defaultNS: 'traducao',
  interpolation: { escapeValue: false },
});

export function trocarIdioma(idioma: 'pt-BR' | 'en-US'): void {
  localStorage.setItem(CHAVE_IDIOMA, idioma);
  void i18n.changeLanguage(idioma);
}

export default i18n;
