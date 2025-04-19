import { InlineKeyboard } from 'grammy';
import { ICONS } from './iconUtils';

import { MyContext } from '../types/context';

export function createCancelKeyboard(ctx: MyContext): InlineKeyboard {
  return new InlineKeyboard().text(
    ctx.t('msg-conversation-cancelled-btn', { icon: ICONS.reject }),
    'cancel_conversation',
  );
}
