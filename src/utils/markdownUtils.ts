import { MyContext } from '../types/context';
import { TranslationVariables } from '@grammyjs/i18n';

export function escapeMarkdownV2Text(text: string): string {
  return text.replace(/([_*[\]()~`>#+=|{}.!\\-])/g, '\\$1');
}

export function escapeMarkdownV2Url(url: string): string {
  return url.replace(/([\\()])/g, '\\$1');
}

export function tEscaped(
  ctx: MyContext,
  key: string,
  params?: TranslationVariables<string>,
): string {
  const escapedParams = Object.keys(params || {}).reduce((acc, paramKey) => {
    acc[paramKey] = escapeMarkdownV2Text(String(params![paramKey]));
    return acc;
  }, {} as TranslationVariables<string>);

  return ctx.t(key, escapedParams);
}
