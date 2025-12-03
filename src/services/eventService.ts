import { InputFile, InlineKeyboard } from 'grammy';
import { Readable } from 'stream';
import * as fs from 'fs';
import { Event } from '@prisma/client';

import { bot } from '../bot';
import {
  getAdminChatId,
  getChannelUsername,
  getPushMinAgeDays,
  getPlaceholderImagePath,
} from '../constants/constants';
import { publishEvent } from '../controllers/eventController';
import {
  approveEvent,
  approveEditedEvent,
  findEventById,
  updateEvent,
  deleteEventById,
} from '../models/eventModel';
import { MyContext } from '../types/context';
import { ICONS } from '../utils/iconUtils';
import { escapeMarkdownV2Text } from '../utils/markdownUtils';
import {
  formatEvent,
  formatEventCaption,
  formatEventDescription,
} from '../utils/eventMessageFormatter';
import { buildEventLinksKeyboard } from '../utils/keyboardUtils';

const disableLinkPreview = {
  is_disabled: true,
};

// Cached placeholder image buffer
let placeholderBuffer: Buffer | null = null;

/**
 * Lädt den Placeholder-Image-Buffer (wird gecached für Performance).
 */
function getPlaceholderBuffer(): Buffer {
  if (!placeholderBuffer) {
    placeholderBuffer = fs.readFileSync(getPlaceholderImagePath());
  }
  return placeholderBuffer;
}

interface SendEventResult {
  photoMessageId: number;
  descriptionMessageId: number;
}

interface SendEventOptions {
  context: 'admin' | 'channel';
  isEdit?: boolean;
  isPush?: boolean;
  adminKeyboard?: InlineKeyboard;
}

/**
 * Sendet ein Event als zwei Nachrichten: Bild mit Caption + Beschreibung als Reply.
 * Links werden als Inline-Buttons unter dem Bild angezeigt.
 */
async function sendEventWithDescription(
  ctx: MyContext,
  chatId: string | number,
  event: Event,
  options: SendEventOptions,
): Promise<SendEventResult> {
  const { context, isEdit = false, isPush = false, adminKeyboard } = options;

  // 1. Caption formatieren (ohne Beschreibung, ohne Links)
  const caption = formatEventCaption(ctx, event, {
    context,
    isEdit,
    isPush,
  });

  // 2. Link-Buttons erstellen
  const linkKeyboard = buildEventLinksKeyboard(ctx, event);

  // 3. Keyboard zusammenbauen (Links + optionale Admin-Buttons)
  let finalKeyboard: InlineKeyboard | undefined;
  if (linkKeyboard && adminKeyboard) {
    // Link-Buttons in erster Reihe, Admin-Buttons in zweiter Reihe
    finalKeyboard = linkKeyboard.row();
    // Admin-Keyboard Buttons hinzufügen
    const adminRows = adminKeyboard.inline_keyboard;
    for (const row of adminRows) {
      for (const button of row) {
        if ('callback_data' in button && button.callback_data) {
          finalKeyboard.text(button.text, button.callback_data);
        }
      }
    }
  } else if (linkKeyboard) {
    finalKeyboard = linkKeyboard;
  } else if (adminKeyboard) {
    finalKeyboard = adminKeyboard;
  }

  // 4. Bild bestimmen (Event-Bild oder Placeholder)
  const imageBuffer = event.imageBase64
    ? Buffer.from(event.imageBase64, 'base64')
    : getPlaceholderBuffer();

  // 5. Bild mit Caption senden
  const stream = Readable.from(imageBuffer);
  const photoMessage = await bot.api.sendPhoto(chatId, new InputFile(stream), {
    caption,
    parse_mode: 'MarkdownV2',
    reply_markup: finalKeyboard,
  });

  // 6. Beschreibung als Reply senden
  const descriptionText = formatEventDescription(ctx, event);
  let descMessageId = photoMessage.message_id;

  if (descriptionText) {
    const descMessage = await bot.api.sendMessage(chatId, descriptionText, {
      parse_mode: 'MarkdownV2',
      reply_parameters: { message_id: photoMessage.message_id },
      link_preview_options: disableLinkPreview,
    });
    descMessageId = descMessage.message_id;
  }

  return {
    photoMessageId: photoMessage.message_id,
    descriptionMessageId: descMessageId,
  };
}

/**
 * Löscht beide Event-Nachrichten aus einem Chat (Bild + Beschreibung).
 */
async function deleteEventMessages(
  chatId: string | number,
  event: Event,
): Promise<void> {
  // Bild-Nachricht löschen
  if (event.messageId) {
    try {
      await bot.api.deleteMessage(chatId, Number(event.messageId));
      console.log(`Photo message deleted: ${event.messageId}`);
    } catch (error) {
      console.error(
        `Error deleting photo message ${event.messageId}:`,
        error,
      );
    }
  }

  // Beschreibungs-Nachricht löschen
  if (event.descriptionMessageId) {
    try {
      await bot.api.deleteMessage(chatId, Number(event.descriptionMessageId));
      console.log(`Description message deleted: ${event.descriptionMessageId}`);
    } catch (error) {
      console.error(
        `Error deleting description message ${event.descriptionMessageId}:`,
        error,
      );
    }
  }
}

export async function notifyAdminsOfEvent(
  ctx: MyContext,
  event: Event,
  isEdit = false,
) {
  try {
    const approveKeyboard = new InlineKeyboard()
      .text(
        ctx.t('msg-service-event-approval', { icon: ICONS.approve }),
        isEdit ? `approve_edit_${event.id}` : `approve_${event.id}`,
      )
      .text(
        ctx.t('msg-service-event-rejection', { icon: ICONS.reject }),
        isEdit ? `reject_edit_${event.id}` : `reject_${event.id}`,
      );

    try {
      await sendEventWithDescription(ctx, getAdminChatId(), event, {
        context: 'admin',
        isEdit,
        adminKeyboard: approveKeyboard,
      });
      console.log(`Admin notification sent for Event ID=${event.id}`);
    } catch (error) {
      console.error(
        `Error sending admin notification for Event ID=${event.id}:`,
        error,
      );
    }
  } catch (error) {
    console.error(
      `General error in notifyAdminsOfEvent for Event ID=${event.id}:`,
      error,
    );
  }
}

/**
 * Posts a message with Delete buttons to the admin group after an event is published or updated.
 */
export async function postAdminManagementMessage(
  ctx: MyContext,
  event: Event,
): Promise<void> {
  try {
    const adminKeyboard = new InlineKeyboard()
      .text(
        ctx.t('admin-btn-delete', { icon: ICONS.reject }),
        `admin_delete_${event.id}`,
      )
      .text(
        ctx.t('admin-btn-ban-and-delete', { icon: ICONS.reject }),
        `admin_ban_and_delete_${event.id}`,
      );

    try {
      await sendEventWithDescription(ctx, getAdminChatId(), event, {
        context: 'admin',
        adminKeyboard,
      });
      console.log(
        `Admin management message sent for Event ID=${event.id}`,
      );
    } catch (error) {
      console.error(
        `Error sending admin management message for Event ID=${event.id}:`,
        error,
      );
    }
  } catch (error) {
    console.error(
      `General error in postAdminManagementMessage for Event ID=${event.id}:`,
      error,
    );
  }
}

export async function handleEventApproval(eventId: string, ctx: MyContext) {
  try {
    const event = await findEventById(eventId);

    if (!event) {
      await ctx.answerCallbackQuery({
        text: ctx.t('msg-service-event-not-found'),
        show_alert: true,
      });
      return;
    }

    if (event.status === 'APPROVED' || event.status === 'EDITED_APPROVED') {
      await ctx.answerCallbackQuery({
        text: ctx.t('msg-service-event-already-published'),
        show_alert: true,
      });
      return;
    }

    let approvedEvent: Event | null = null;

    try {
      if (event.status === 'PENDING' || event.status === 'REJECTED') {
        approvedEvent = await approveEvent(eventId);
        console.log(`Event genehmigt: ID=${eventId}`);
      } else if (event.status === 'EDITED_PENDING') {
        approvedEvent = await approveEditedEvent(eventId);
      } else {
        await ctx.answerCallbackQuery({
          text: ctx.t('msg-service-event-status-unknown'),
          show_alert: true,
        });
        console.warn(`Unknown status during approval: ${event.status}`);
        return;
      }
    } catch (error) {
      console.error(`Error approving event ID=${eventId}:`, error);
      await ctx.answerCallbackQuery({
        text: ctx.t('msg-service-event-approval-error'),
        show_alert: true,
      });
      return;
    }

    if (approvedEvent) {
      await publishEvent(ctx, approvedEvent);

      const escapedTitle = escapeMarkdownV2Text(event.title);
      const escapedChannelUsername = escapeMarkdownV2Text(getChannelUsername());

      const message = ctx.t('msg-service-event-published', {
        icon: ICONS.approve,
        eventTitle: escapedTitle,
        channelUsername: escapedChannelUsername,
      });

      try {
        const messageId = ctx.callbackQuery?.message?.message_id;
        if (!messageId) {
          console.error('No message ID found for the reaction');
          return;
        }

        await ctx.api.setMessageReaction(getAdminChatId(), messageId, [
          { type: 'emoji', emoji: '👍' },
        ]);

        await bot.api.sendMessage(getAdminChatId(), message, {
          parse_mode: 'MarkdownV2',
          link_preview_options: disableLinkPreview,
        });
      } catch (error) {
        console.error(
          `Error sending approval confirmation to admins for Event ID=${event.id}:`,
          error,
        );
      }

      await ctx.answerCallbackQuery({
        text: ctx.t('msg-service-event-post-success'),
        show_alert: true,
      });
    } else {
      console.error(`Approved event is null for Event ID=${eventId}`);
    }
  } catch (error) {
    console.error(
      `General error in handleEventApproval for Event ID=${eventId}:`,
      error,
    );
    await ctx.answerCallbackQuery({
      text: ctx.t('msg-service-event-publication-error'),
      show_alert: true,
    });
  }
}

export async function handleEventRejection(eventId: string, ctx: MyContext) {
  try {
    const event = await findEventById(eventId);

    if (!event) {
      await ctx.answerCallbackQuery({
        text: ctx.t('msg-service-event-not-found'),
        show_alert: true,
      });
      console.warn(`Event not found: ID=${eventId}`);
      return;
    }

    ctx.session.eventId = eventId;
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('rejectEventConversation');
    console.log(`Join rejectEventConversation for Event ID=${eventId}`);
  } catch (error) {
    console.error(`Rejection Error Event ID=${eventId}:`, error);
    await ctx.answerCallbackQuery({
      text: ctx.t('msg-service-event-rejection-error'),
      show_alert: true,
    });
  }
}

export async function handleEventDeletion(
  eventId: string,
  ctx: MyContext,
  suppressReply = false,
): Promise<boolean> {
  try {
    const event = await findEventById(eventId);

    if (!event) {
      if (!suppressReply) {
        await ctx.replyWithMarkdownV2(ctx.t('msg-service-event-not-found'), {
          link_preview_options: disableLinkPreview,
        });
      }
      console.warn(`Event not found for deletion: ID=${eventId}`);
      return false;
    }

    // Beide Nachrichten aus dem Channel löschen
    await deleteEventMessages(getChannelUsername(), event);

    await deleteEventById(eventId);
    console.log(`Event deleted from database: ID=${eventId}`);

    if (!suppressReply) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-service-event-deleted-success', {
          icon: ICONS.approve,
          eventTitle: escapeMarkdownV2Text(event.title),
        }),
        { link_preview_options: disableLinkPreview },
      );
    }
    return true;
  } catch (error) {
    console.error(`Error deleting event ID=${eventId}:`, error);
    if (!suppressReply) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-service-event-deletion-error', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
    }
    return false;
  }
}

export async function postEventToChannel(
  ctx: MyContext,
  event: Event,
): Promise<void> {
  try {
    console.log(`Poste neues Event in den Kanal: ID=${event.id}`);

    try {
      const result = await sendEventWithDescription(
        ctx,
        getChannelUsername(),
        event,
        { context: 'channel' },
      );

      console.log(
        `Event posted to channel: ID=${event.id}, photoMessageId=${result.photoMessageId}, descriptionMessageId=${result.descriptionMessageId}`,
      );

      await updateEvent(event.id, {
        messageId: BigInt(result.photoMessageId),
        descriptionMessageId: BigInt(result.descriptionMessageId),
      });

      // Hole aktualisiertes Event für Admin-Nachricht
      const updatedEvent = await findEventById(event.id);
      if (updatedEvent) {
        await postAdminManagementMessage(ctx, updatedEvent);
      }
    } catch (error) {
      console.error(
        `Error posting event to channel for Event ID=${event.id}:`,
        error,
      );
    }
  } catch (error) {
    console.error(
      `General error in postEventToChannel for Event ID=${event.id}:`,
      error,
    );
  }
}

export async function updateEventInChannel(
  ctx: MyContext,
  event: Event,
): Promise<void> {
  try {
    // Alte Nachrichten löschen (Bild + Beschreibung)
    await deleteEventMessages(getChannelUsername(), event);

    // Neues Event posten
    try {
      const result = await sendEventWithDescription(
        ctx,
        getChannelUsername(),
        event,
        { context: 'channel', isEdit: true },
      );

      console.log(
        `Updated event posted to channel: ID=${event.id}, photoMessageId=${result.photoMessageId}, descriptionMessageId=${result.descriptionMessageId}`,
      );

      await updateEvent(event.id, {
        messageId: BigInt(result.photoMessageId),
        descriptionMessageId: BigInt(result.descriptionMessageId),
      });

      const updatedEvent = await findEventById(event.id);
      if (updatedEvent) {
        await postAdminManagementMessage(ctx, updatedEvent);
      }
    } catch (error) {
      console.error(
        `Error posting updated event to channel for Event ID=${event.id}:`,
        error,
      );
    }
  } catch (error) {
    console.error(
      `General error in updateEventInChannel for Event ID=${event.id}:`,
      error,
    );
  }
}

export async function sendSearchToUser(
  events: Event[],
  dateText: string,
  chatId: string,
  ctx: MyContext,
): Promise<void> {
  try {
    if (events.length === 0) {
      try {
        await bot.api.sendMessage(
          chatId,
          ctx.t('msg-service-search-no-events', {
            dateText: escapeMarkdownV2Text(dateText),
          }),
          {
            link_preview_options: disableLinkPreview,
          },
        );
      } catch (error) {
        await ctx.reply(
          ctx.t('msg-service-search-error', { icon: ICONS.reject }),
          {
            link_preview_options: disableLinkPreview,
          },
        );
        console.error(`Error sending message to chatId=${chatId}:`, error);
      }
      return;
    }

    for (const [index, event] of events.entries()) {
      try {
        const message = formatEvent(ctx, event, {
          context: 'user',
          index,
          total: events.length,
          includeIndex: true,
          dateText,
        });

        if (event.imageBase64) {
          const imageBuffer = Buffer.from(event.imageBase64, 'base64');
          const stream = Readable.from(imageBuffer);
          
          // Telegram has a 1024 character limit for photo captions
          const maxCaptionLength = 1024;
          
          try {
            if (message.length <= maxCaptionLength) {
              // Caption is short enough, send with photo
              await bot.api.sendPhoto(chatId, new InputFile(stream), {
                caption: message,
                parse_mode: 'MarkdownV2',
                has_spoiler: true,
              });
            } else {
              // Caption too long, send photo without caption and text separately
              await bot.api.sendPhoto(chatId, new InputFile(stream), {
                has_spoiler: true,
              });
              await bot.api.sendMessage(chatId, message, {
                parse_mode: 'MarkdownV2',
                link_preview_options: disableLinkPreview,
              });
            }
            console.log(`Photo and message sent to user for Event ID=${event.id}`);
          } catch (error) {
            await ctx.reply(
              ctx.t('msg-service-search-photo-error', {
                icon: ICONS.reject,
                eventId: escapeMarkdownV2Text(event.id),
              }),
              {
                link_preview_options: disableLinkPreview,
              },
            );
            console.error(
              `Error sending photo to user for Event ID=${event.id}:`,
              error,
            );
          }
        } else {
          try {
            await bot.api.sendMessage(chatId, message, {
              parse_mode: 'MarkdownV2',
              link_preview_options: disableLinkPreview,
            });
            console.log(`Message sent to user for Event ID=${event.id}`);
          } catch (error) {
            await ctx.reply(
              ctx.t('msg-service-search-message-error', {
                icon: ICONS.reject,
                eventId: escapeMarkdownV2Text(event.id),
              }),
              {
                link_preview_options: disableLinkPreview,
              },
            );
            console.error(
              `Error sending message to user for Event ID=${event.id}:`,
              error,
            );
          }
        }
      } catch (error) {
        await ctx.reply(
          ctx.t('msg-service-search-process-error', {
            icon: ICONS.reject,
            eventId: escapeMarkdownV2Text(event.id),
          }),
          {
            link_preview_options: disableLinkPreview,
          },
        );
        console.error(`Error processing event ID=${event.id}:`, error);
      }
    }
  } catch (error) {
    console.error(
      `General error in sendSearchToUser for chatId=${chatId}:`,
      error,
    );
  }
}

/**
 * Handles pushing an event to reappear as the newest message in the channel.
 * Validates that the event meets all push criteria, then:
 * 1. Deletes the old channel messages
 * 2. Posts new messages with the same content
 * 3. Updates pushedAt and pushedCount in database
 * 4. Sends admin notification with push indicator
 */
export async function handleEventPush(
  eventId: string,
  ctx: MyContext,
): Promise<boolean> {
  try {
    const event = await findEventById(eventId);

    if (!event) {
      await ctx.replyWithMarkdownV2(ctx.t('msg-service-event-not-found'), {
        link_preview_options: disableLinkPreview,
      });
      console.warn(`Event not found for push: ID=${eventId}`);
      return false;
    }

    // Validate push criteria
    const now = new Date();
    const minAgeDays = getPushMinAgeDays();
    const minAgeDate = new Date(
      now.getTime() - minAgeDays * 24 * 60 * 60 * 1000,
    );

    // Check if already pushed
    if (event.pushedCount > 0) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-push-event-already-pushed', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
      return false;
    }

    // Check if at least X days old (configurable via PUSH_MIN_AGE_DAYS)
    if (event.createdAt > minAgeDate) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-push-event-too-recent', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
      return false;
    }

    // Check if event is in the future
    if (event.endDate < now) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-push-event-not-future', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
      return false;
    }

    // Delete old messages from channel (Bild + Beschreibung)
    await deleteEventMessages(getChannelUsername(), event);

    // Post new messages to channel
    try {
      const result = await sendEventWithDescription(
        ctx,
        getChannelUsername(),
        event,
        { context: 'channel', isPush: true },
      );

      console.log(
        `Pushed event posted to channel: ID=${eventId}, photoMessageId=${result.photoMessageId}, descriptionMessageId=${result.descriptionMessageId}`,
      );

      // Update event in database
      const updatedEvent = await updateEvent(eventId, {
        messageId: BigInt(result.photoMessageId),
        descriptionMessageId: BigInt(result.descriptionMessageId),
        pushedAt: now,
        pushedCount: 1,
      });

      // Send admin notification with push indicator
      await postAdminPushNotification(ctx, updatedEvent);

      // Confirm to user
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-service-event-pushed-success', {
          icon: ICONS.approve,
          eventTitle: escapeMarkdownV2Text(event.title),
        }),
        { link_preview_options: disableLinkPreview },
      );

      console.log(`Event pushed successfully: ID=${eventId}`);
      return true;
    } catch (error) {
      console.error(
        `Error posting pushed event to channel for Event ID=${eventId}:`,
        error,
      );
      return false;
    }
  } catch (error) {
    console.error(`Error pushing event ID=${eventId}:`, error);
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-service-event-push-error', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
    return false;
  }
}

/**
 * Posts a notification to the admin group indicating that an event was pushed.
 */
async function postAdminPushNotification(
  ctx: MyContext,
  event: Event,
): Promise<void> {
  try {
    const adminKeyboard = new InlineKeyboard()
      .text(
        ctx.t('admin-btn-delete', { icon: ICONS.reject }),
        `admin_delete_${event.id}`,
      )
      .text(
        ctx.t('admin-btn-ban-and-delete', { icon: ICONS.reject }),
        `admin_ban_and_delete_${event.id}`,
      );

    try {
      await sendEventWithDescription(ctx, getAdminChatId(), event, {
        context: 'admin',
        isPush: true,
        adminKeyboard,
      });
      console.log(`Admin push notification sent for Event ID=${event.id}`);
    } catch (error) {
      console.error(
        `Error sending admin push notification for Event ID=${event.id}:`,
        error,
      );
    }
  } catch (error) {
    console.error(
      `General error in postAdminPushNotification for Event ID=${event.id}:`,
      error,
    );
  }
}
