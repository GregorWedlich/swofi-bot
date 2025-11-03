import { InlineKeyboard } from 'grammy';
import { Conversation } from '@grammyjs/conversations';
import { MyContext } from '../types/context';
import { findUserPushableEvents } from '../models/eventModel';
import { handleEventPush } from '../services/eventService';
import { ICONS } from '../utils/iconUtils';
import { escapeMarkdownV2Text } from '../utils/markdownUtils';
import { formatEvent } from '../utils/eventMessageFormatter';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const disableLinkPreview = {
  is_disabled: true,
};

export async function pushEventConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
) {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.replyWithMarkdownV2(ctx.t('msg-delete-event-user-not-found'), {
      link_preview_options: disableLinkPreview,
    });
    return;
  }

  // Fetch pushable events for the user
  const pushableEvents = await findUserPushableEvents(userId);

  if (pushableEvents.length === 0) {
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-push-event-no-pushable-events', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
    const { getPushMinAgeDays } = await import('../constants/constants');
    await ctx.replyWithMarkdownV2(ctx.t('msg-push-event-requirements', { 
      icon: ICONS.info,
      minDays: getPushMinAgeDays().toString(),
    }), {
      link_preview_options: disableLinkPreview,
    });
    return;
  }

  // Build keyboard with pushable events
  const keyboard = new InlineKeyboard();
  for (const event of pushableEvents) {
    const createdAt = format(event.createdAt, 'dd.MM.yyyy', { locale: de });
    const buttonText = ctx.t('msg-push-event-select-title', {
      title: event.title.substring(0, 40),
      createdAt: escapeMarkdownV2Text(createdAt),
    });
    keyboard.text(buttonText, `push_select_${event.id}`).row();
  }
  keyboard.text(
    ctx.t('msg-push-event-btn-cancel', { icon: ICONS.reject }),
    'push_cancel',
  );

  await ctx.replyWithMarkdownV2(ctx.t('msg-push-event-select-event'), {
    reply_markup: keyboard,
    link_preview_options: disableLinkPreview,
  });

  // Wait for user selection
  const selectionCtx = await conversation.waitForCallbackQuery(
    /^push_(select|cancel)_?(.*)$/,
  );

  const action = selectionCtx.match[1];
  const eventId = selectionCtx.match[2];

  await selectionCtx.answerCallbackQuery();

  if (action === 'cancel') {
    await selectionCtx.replyWithMarkdownV2(
      ctx.t('msg-push-event-cancelled'),
      { link_preview_options: disableLinkPreview },
    );
    return;
  }

  // Find the selected event
  const selectedEvent = pushableEvents.find((e) => e.id === eventId);

  if (!selectedEvent) {
    await selectionCtx.replyWithMarkdownV2(
      ctx.t('msg-push-event-not-found-error'),
      { link_preview_options: disableLinkPreview },
    );
    return;
  }

  // Show event preview
  await selectionCtx.replyWithMarkdownV2(
    ctx.t('msg-push-event-selected-details'),
    { link_preview_options: disableLinkPreview },
  );

  const eventPreview = formatEvent(ctx, selectedEvent, { context: 'user' });

  if (selectedEvent.imageBase64) {
    try {
      const { InputFile } = await import('grammy');
      const { Readable } = await import('stream');
      const imageBuffer = Buffer.from(selectedEvent.imageBase64, 'base64');
      const stream = Readable.from(imageBuffer);
      await selectionCtx.replyWithPhoto(new InputFile(stream), {
        caption: eventPreview,
        parse_mode: 'MarkdownV2',
      });
    } catch (error) {
      console.error('Error sending event preview image:', error);
      await selectionCtx.replyWithMarkdownV2(eventPreview, {
        link_preview_options: disableLinkPreview,
      });
    }
  } else {
    await selectionCtx.replyWithMarkdownV2(eventPreview, {
      link_preview_options: disableLinkPreview,
    });
  }

  // Confirmation prompt
  const confirmKeyboard = new InlineKeyboard()
    .text(
      ctx.t('msg-push-event-btn-confirm', { icon: ICONS.approve }),
      'push_confirm',
    )
    .text(
      ctx.t('msg-push-event-btn-cancel', { icon: ICONS.reject }),
      'push_cancel_final',
    );

  await selectionCtx.replyWithMarkdownV2(
    ctx.t('msg-push-event-confirm-prompt', {
      eventTitle: escapeMarkdownV2Text(selectedEvent.title),
    }),
    {
      reply_markup: confirmKeyboard,
      link_preview_options: disableLinkPreview,
    },
  );

  // Wait for confirmation
  const confirmCtx = await conversation.waitForCallbackQuery(
    /^push_(confirm|cancel_final)$/,
  );

  await confirmCtx.answerCallbackQuery();

  if (confirmCtx.match[1] === 'cancel_final') {
    await confirmCtx.replyWithMarkdownV2(
      ctx.t('msg-push-event-cancelled'),
      { link_preview_options: disableLinkPreview },
    );
    return;
  }

  // Execute the push
  await handleEventPush(selectedEvent.id, confirmCtx);
}
