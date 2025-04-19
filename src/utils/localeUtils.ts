import { de, enUS, Locale } from 'date-fns/locale';
import { getLocale } from '../constants/constants';

export const locales: { [key: string]: Locale } = {
  de: de,
  en: enUS,
  'en-US': enUS,
};

export const getLocaleUtil = (): Locale => {
  return locales[getLocale()] || enUS;
};
