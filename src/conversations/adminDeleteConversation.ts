import { Conversation } from '@grammyjs/conversations';
import { InlineKeyboard } from 'grammy';

import { handleEventDeletion } from '../services/eventService';
import { MyContext } from '../types/context';
import { ICONS } from '../utils/iconUtils';
import { findEventById } from '../models/eventModel';
import { escapeMarkdownV2Text } from '../utils/markdownUtils';

const disableLinkPreview = {
  is_disabled: true,
};

export async function adminDeleteConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
) {
  try {
    const eventId = ctx.session.adminDeleteEventId;
    if (!eventId) {
      console.error('Admin delete conversation: No eventId found in session.');
      await ctx.reply(ctx.t('admin-msg-delete-error'));
      return;
    }

    // Clear session immediately
    delete ctx.session.adminDeleteEventId;

    const event = await conversation.external(() => findEventById(eventId));
    if (!event) {
      await ctx.reply(ctx.t('msg-service-event-not-found'), {
        link_preview_options: disableLinkPreview,
      });
      return;
    }

    const keyboard = new InlineKeyboard()
      .text(
        ctx.t('admin-btn-confirm-delete-direct', { icon: ICONS.reject }),
        `confirm_admin_delete_direct_${eventId}`,
      )
      .row()
      .text(
        ctx.t('admin-btn-cancel-delete', { icon: ICONS.reject }),
        'cancel_admin_delete',
      );

    const promptMessage = await ctx.replyWithMarkdownV2(
      ctx.t('admin-msg-confirm-delete-reason', {
        eventTitle: escapeMarkdownV2Text(event.title),
      }),
      {
        reply_markup: keyboard,
        link_preview_options: disableLinkPreview,
      },
    );

    const response = await conversation.waitFor([
      'message:text',
      'callback_query:data',
    ]);

    let deletionReason: string | null = null;
    let confirmed = false;
    let cancelled = false;

    if (response.message?.text) {
      deletionReason = response.message.text;
      confirmed = true;
      console.log(
        `Admin delete reason provided for ${eventId}: ${deletionReason}`,
      );
    } else if (
      response.callbackQuery?.data === `confirm_admin_delete_direct_${eventId}`
    ) {
      await response.answerCallbackQuery();
      confirmed = true;
      console.log(`Admin direct delete confirmed for ${eventId}`);
    } else if (response.callbackQuery?.data === 'cancel_admin_delete') {
      await response.answerCallbackQuery();
      cancelled = true;
      console.log(`Admin delete cancelled for ${eventId}`);
    } else {
      if (response.callbackQuery) await response.answerCallbackQuery();
      cancelled = true;
      console.log(
        `Admin delete cancelled due to unexpected input for ${eventId}`,
      );
    }

    try {
      await ctx.api.editMessageReplyMarkup(
        promptMessage.chat.id,
        promptMessage.message_id,
        { reply_markup: new InlineKeyboard() },
      );
    } catch (editError) {
      console.error(
        'Error removing keyboard from admin delete prompt:',
        editError,
      );
    }

    if (cancelled) {
      await ctx.replyWithMarkdownV2(
        ctx.t('admin-msg-delete-cancelled', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
      return;
    }

    if (confirmed) {
      const success = await conversation.external(() =>
        handleEventDeletion(eventId, ctx, true),
      );

      if (success) {
        let successMsg = ctx.t('admin-msg-delete-success', {
          icon: ICONS.approve,
        });
        if (deletionReason) {
          successMsg +=
            '\n' +
            ctx.t('admin-msg-delete-reason-provided', {
              reason: escapeMarkdownV2Text(deletionReason),
            });
          console.log(
            `Event ${eventId} deleted by admin with reason: ${deletionReason}`,
          );
        }
        await ctx.replyWithMarkdownV2(successMsg, {
          link_preview_options: disableLinkPreview,
        });
      } else {
        await ctx.replyWithMarkdownV2(
          ctx.t('admin-msg-delete-error', { icon: ICONS.reject }),
          { link_preview_options: disableLinkPreview },
        );
      }
    }
  } catch (error) {
    console.error('Error in adminDeleteConversation:', error);
    await ctx.reply(ctx.t('admin-msg-delete-error', { icon: ICONS.reject }));
  }
}
