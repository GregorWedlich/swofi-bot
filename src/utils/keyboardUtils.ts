import { InlineKeyboard } from 'grammy';
import { ICONS } from './iconUtils';

import { MyContext } from '../types/context';

export function createCancelKeyboard(ctx: MyContext): InlineKeyboard {
  return new InlineKeyboard().text(
    ctx.t('msg-conversation-cancelled-btn', { icon: ICONS.reject }),
    'cancel_conversation',
  );
}

interface EventWithLinks {
  links?: string[] | null;
  groupLink?: string | null;
}

/**
 * Erstellt ein Inline-Keyboard mit URL-Buttons für Event-Links.
 * Webseite-Link und Telegram-Gruppen-Link werden als Buttons angezeigt.
 */
export function buildEventLinksKeyboard(
  ctx: MyContext,
  event: EventWithLinks,
): InlineKeyboard | undefined {
  const keyboard = new InlineKeyboard();
  let hasButtons = false;

  // Webseite-Link (erster Link aus links Array)
  if (event.links && event.links.length > 0 && event.links[0]) {
    keyboard.url(
      ctx.t('btn-event-link-website', { icon: ICONS.links }),
      event.links[0],
    );
    hasButtons = true;
  }

  // Telegram-Gruppen-Link
  if (event.groupLink) {
    keyboard.url(
      ctx.t('btn-event-link-group', { icon: ICONS.group }),
      event.groupLink,
    );
    hasButtons = true;
  }

  return hasButtons ? keyboard : undefined;
}
