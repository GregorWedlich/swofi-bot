import { Conversation } from '@grammyjs/conversations';

import { findEventById, rejectEvent } from '../models/eventModel';
import { MyContext } from '../types/context';
import { getAdminChatId } from '../constants/constants';
import { escapeMarkdownV2Text } from '../utils/markdownUtils';
import { ICONS } from '../utils/iconUtils';

export async function rejectEventConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
) {
  try {
    const eventId = ctx.session.eventId;

    if (!eventId) {
      await ctx.replyWithMarkdownV2(ctx.t('msg-reject-event-no-eventid-found'));
      return;
    }

    const event = await findEventById(eventId);
    if (!event) {
      await ctx.replyWithMarkdownV2(ctx.t('msg-reject-event-not-found'));
      return;
    }

    await ctx.replyWithMarkdownV2(ctx.t('msg-reject-event-rejection-reason'));

    const reasonResponse = await conversation.waitFor('message:text');
    const rejectionReason = reasonResponse.message.text;

    await rejectEvent(eventId, rejectionReason);

    try {
      await ctx.api.sendMessage(
        Number(event.submittedById),
        ctx.t('msg-reject-event-rejection-reason-notification', {
          icon: ICONS.reject,
          eventTitle: escapeMarkdownV2Text(event.title),
          rejectionReason: escapeMarkdownV2Text(rejectionReason),
        }),
      );

      const messageId = ctx.callbackQuery?.message?.message_id;
      if (!messageId) {
        console.error('No msg id found');
        return;
      }

      await ctx.api.setMessageReaction(getAdminChatId(), messageId, [
        { type: 'emoji', emoji: '👎' },
      ]);
    } catch (error) {
      console.error(ctx.t('msg-reject-event-send-msg-user-error'), error);
    }

    try {
      const messageId = ctx.callbackQuery?.message?.message_id;
      if (!messageId) {
        console.error('No msg id found');
        return;
      }

      await ctx.replyWithMarkdownV2(
        ctx.t('msg-reject-event-rejection-success', {
          eventTitle: escapeMarkdownV2Text(event.title),
        }),
        {
          reply_to_message_id: messageId,
        },
      );
    } catch (error) {
      console.error(ctx.t('msg-reject-event-send-msg-admin-error'), error);
    }

    delete ctx.session.eventId;
  } catch (error) {
    console.error('Error rejecting the event:', error);
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-reject-event-error', { icon: ICONS.reject }),
    );
  }
}
