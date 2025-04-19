import { Event } from '@prisma/client';
import { ConversationFlavor } from '@grammyjs/conversations';
import { Context, SessionFlavor } from 'grammy';
import { I18nFlavor } from '@grammyjs/i18n';
import { ParseModeFlavor } from '@grammyjs/parse-mode';
interface SessionData {
  state?: string;
  event?: Partial<Event>;
  bookmarks?: string[];
  eventId?: string;
  locale?: string;
}

export type MyContext = Context &
  I18nFlavor &
  ConversationFlavor &
  ParseModeFlavor<Context> &
  SessionFlavor<SessionData>;
