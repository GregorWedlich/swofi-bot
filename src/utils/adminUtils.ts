import { NextFunction } from 'grammy';

import { getAdminChatId } from '../constants/constants';
import { MyContext } from '../types/context';

/**
 * Middleware that ensures commands are only executed in the admin group.
 * If not in admin group, silently ignores the command.
 */
export const adminGroupOnly = () => {
  return async (ctx: MyContext, next: NextFunction) => {
    const adminChatId = getAdminChatId();

    // Only proceed if we're in the admin group
    if (ctx.chat?.id.toString() === adminChatId) {
      await next();
    }
    // Silently ignore commands from other chats - no error message
  };
};
