import { Conversation } from '@grammyjs/conversations';
import { InlineKeyboard, InputFile } from 'grammy';
import { Event } from '@prisma/client';
import { Readable } from 'stream';

import { findUserApprovedEvents, findEventById } from '../models/eventModel';
import { handleEventDeletion } from '../services/eventService';
import { MyContext } from '../types/context';
import { ICONS } from '../utils/iconUtils';
import { formatEvent } from '../utils/eventMessageFormatter';
import { escapeMarkdownV2Text } from '../utils/markdownUtils'; // Import the escape function

const disableLinkPreview = {
  is_disabled: true,
};

export async function deleteEventConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
) {
  try {
    const userId = ctx.from?.id;

    if (!userId) {
      await ctx.replyWithMarkdownV2(ctx.t('msg-delete-event-user-not-found'), {
        link_preview_options: disableLinkPreview,
      });
      return;
    }

    const events = await findUserApprovedEvents(userId);

    if (events.length === 0) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-delete-event-no-approved-events-found'),
        { link_preview_options: disableLinkPreview },
      );
      return;
    }

    const eventToDelete = await selectEventToDelete(conversation, ctx, events);
    if (!eventToDelete) {
      await ctx.replyWithMarkdownV2(ctx.t('msg-delete-event-cancelled'), {
        link_preview_options: disableLinkPreview,
      });
      return;
    }

    const confirmed = await confirmDeletion(conversation, ctx, eventToDelete);
    if (!confirmed) {
      await ctx.replyWithMarkdownV2(ctx.t('msg-delete-event-cancelled'), {
        link_preview_options: disableLinkPreview,
      });
      return;
    }

    await handleEventDeletion(eventToDelete.id, ctx);
  } catch (error) {
    console.error('Error during delete event conversation:', error);
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-delete-event-error', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
  }
}

async function selectEventToDelete(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  availableEvents: Event[],
): Promise<Event | null> {
  const keyboard = new InlineKeyboard();
  availableEvents.forEach((event) => {
    keyboard
      .text(
        ctx.t('msg-delete-event-select-title', { title: event.title }),
        `delete_event_${event.id}`,
      )
      .row();
  });
  keyboard.text(
    ctx.t('msg-delete-event-btn-cancel', { icon: ICONS.reject }),
    'cancel_delete_selection',
  );

  await ctx.replyWithMarkdownV2(ctx.t('msg-delete-event-select-event'), {
    reply_markup: keyboard,
    link_preview_options: disableLinkPreview,
  });

  const response = await conversation.waitForCallbackQuery([
    new RegExp(
      `^delete_event_(${availableEvents.map((e) => e.id).join('|')})$`,
    ),
    'cancel_delete_selection',
  ]);

  await response.answerCallbackQuery();

  if (response.callbackQuery.data === 'cancel_delete_selection') {
    return null;
  }

  const eventId = response.callbackQuery.data.replace('delete_event_', '');
  const event = await findEventById(eventId);

  if (!event) {
    await ctx.replyWithMarkdownV2(ctx.t('msg-delete-event-not-found-error'), {
      link_preview_options: disableLinkPreview,
    });
    return null;
  }

  await ctx.replyWithMarkdownV2(ctx.t('msg-delete-event-selected-details'), {
    link_preview_options: disableLinkPreview,
  });
  const messageText = formatEvent(ctx, event, { context: 'user' });

  if (event.imageBase64) {
    try {
      const imageBuffer = Buffer.from(event.imageBase64, 'base64');
      const stream = Readable.from(imageBuffer);
      await ctx.replyWithPhoto(new InputFile(stream), {
        caption: messageText,
        parse_mode: 'MarkdownV2',
      });
    } catch (error) {
      console.error(
        `Error sending photo for event ID=${event.id} during deletion selection:`,
        error,
      );
      await ctx.replyWithMarkdownV2(messageText, {
        parse_mode: 'MarkdownV2',
        link_preview_options: disableLinkPreview,
      });
    }
  } else {
    await ctx.replyWithMarkdownV2(messageText, {
      parse_mode: 'MarkdownV2',
      link_preview_options: disableLinkPreview,
    });
  }

  return event;
}

async function confirmDeletion(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  event: Event,
): Promise<boolean> {
  const confirmationKeyboard = new InlineKeyboard()
    .text(
      ctx.t('msg-delete-event-btn-confirm', { icon: ICONS.approve }),
      'confirm_delete',
    )
    .text(
      ctx.t('msg-delete-event-btn-cancel', { icon: ICONS.reject }),
      'cancel_delete',
    );

  await ctx.replyWithMarkdownV2(
    ctx.t('msg-delete-event-confirm-prompt', {
      eventTitle: escapeMarkdownV2Text(event.title), // Escape the title here
    }),
    {
      reply_markup: confirmationKeyboard,
      link_preview_options: disableLinkPreview,
    },
  );

  const response = await conversation.waitForCallbackQuery([
    'confirm_delete',
    'cancel_delete',
  ]);

  await response.answerCallbackQuery();

  return response.callbackQuery.data === 'confirm_delete';
}
