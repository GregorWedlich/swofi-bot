import { Conversation } from '@grammyjs/conversations';

import { unbanUser } from '../services/blacklistService';
import { MyContext } from '../types/context';
import { ICONS } from '../utils/iconUtils';

const disableLinkPreview = {
  is_disabled: true,
};

export async function adminUnbanUserConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
) {
  try {
    // Ask for user ID
    await ctx.replyWithMarkdownV2(ctx.t('admin-blacklist-unban-prompt'), {
      link_preview_options: disableLinkPreview,
    });

    const userIdResponse = await conversation.waitFor('message:text');
    const userIdText = userIdResponse.message.text;

    // Validate user ID
    const userId = BigInt(userIdText.trim());
    if (isNaN(Number(userIdText.trim()))) {
      await ctx.replyWithMarkdownV2(
        ctx.t('admin-blacklist-unban-invalid-id', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
      return;
    }

    // Unban the user
    await conversation.external(() => unbanUser(userId, ctx));
  } catch (error) {
    console.error('Error in adminUnbanUserConversation:', error);
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-blacklist-unban-error', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
  }
}
