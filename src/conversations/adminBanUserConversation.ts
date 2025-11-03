import { Conversation } from '@grammyjs/conversations';

import { banUser } from '../services/blacklistService';
import { MyContext } from '../types/context';
import { ICONS } from '../utils/iconUtils';

const disableLinkPreview = {
  is_disabled: true,
};

export async function adminBanUserConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
) {
  try {
    // Ask for user ID
    await ctx.replyWithMarkdownV2(ctx.t('admin-blacklist-ban-prompt'), {
      link_preview_options: disableLinkPreview,
    });

    const userIdResponse = await conversation.waitFor('message:text');
    const userIdText = userIdResponse.message.text;

    // Validate user ID
    const userId = BigInt(userIdText.trim());
    if (isNaN(Number(userIdText.trim()))) {
      await ctx.replyWithMarkdownV2(
        ctx.t('admin-blacklist-ban-invalid-id', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
      return;
    }

    // Ask for reason (optional)
    await ctx.replyWithMarkdownV2(ctx.t('admin-blacklist-ban-reason-prompt'), {
      link_preview_options: disableLinkPreview,
    });

    const reasonResponse = await conversation.waitFor('message:text');
    const reasonText = reasonResponse.message.text;

    let reason: string | undefined;
    if (reasonText.toLowerCase() === '/skip') {
      reason = undefined;
    } else {
      reason = reasonText;
    }

    // Get admin info
    const adminId = ctx.from?.id ? BigInt(ctx.from.id) : undefined;
    const adminName = ctx.from?.username || ctx.from?.first_name || undefined;

    // Ban the user
    await conversation.external(() =>
      banUser(userId, undefined, adminId, adminName, reason, ctx),
    );
  } catch (error) {
    console.error('Error in adminBanUserConversation:', error);
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-blacklist-ban-error', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
  }
}
