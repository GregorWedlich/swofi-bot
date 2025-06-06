import { InputFile } from 'grammy';
import { Readable } from 'stream';
import { Event } from '@prisma/client';

import { bot } from '../bot';
import { getAdminChatId, getChannelUsername } from '../constants/constants';
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
import { formatEvent } from '../utils/eventMessageFormatter';
import { InlineKeyboard } from 'grammy';

const disableLinkPreview = {
  is_disabled: true,
};

export async function notifyAdminsOfEvent(
  ctx: MyContext,
  event: Event,
  isEdit = false,
) {
  try {
    const messageText = formatEvent(ctx, event, {
      context: 'admin',
      isEdit,
    });

    const approveKeyboard = {
      inline_keyboard: [
        [
          {
            text: ctx.t('msg-service-event-approval', { icon: ICONS.approve }),
            callback_data: isEdit
              ? `approve_edit_${event.id}`
              : `approve_${event.id}`,
          },
          {
            text: ctx.t('msg-service-event-rejection', { icon: ICONS.reject }),
            callback_data: isEdit
              ? `reject_edit_${event.id}`
              : `reject_${event.id}`,
          },
        ],
      ],
    };

    if (event.imageBase64) {
      const imageBuffer = Buffer.from(event.imageBase64, 'base64');
      const stream = Readable.from(imageBuffer);
      try {
        await bot.api.sendPhoto(getAdminChatId(), new InputFile(stream), {
          caption: messageText,
          parse_mode: 'MarkdownV2',
          reply_markup: approveKeyboard,
        });
      } catch (error) {
        console.error(
          `Error sending photo to admins for Event ID=${event.id}:`,
          error,
        );
      }
    } else {
      try {
        await bot.api.sendMessage(getAdminChatId(), messageText, {
          parse_mode: 'MarkdownV2',
          reply_markup: approveKeyboard,
          link_preview_options: disableLinkPreview,
        });
      } catch (error) {
        console.error(
          `Error sending message to admins for Event ID=${event.id}:`,
          error,
        );
      }
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
    const messageText = formatEvent(ctx, event, { context: 'channel' });
    const adminKeyboard = new InlineKeyboard().text(
      ctx.t('admin-btn-delete', { icon: ICONS.reject }),
      `admin_delete_${event.id}`,
    );

    const adminChatId = getAdminChatId();

    if (event.imageBase64) {
      const imageBuffer = Buffer.from(event.imageBase64, 'base64');
      const stream = Readable.from(imageBuffer);
      try {
        await bot.api.sendPhoto(adminChatId, new InputFile(stream), {
          caption: messageText,
          parse_mode: 'MarkdownV2',
          reply_markup: adminKeyboard,
        });
        console.log(
          `Admin management message (photo) sent for Event ID=${event.id}`,
        );
      } catch (error) {
        console.error(
          `Error sending admin management photo for Event ID=${event.id}:`,
          error,
        );
      }
    } else {
      try {
        await bot.api.sendMessage(adminChatId, messageText, {
          parse_mode: 'MarkdownV2',
          reply_markup: adminKeyboard,
          link_preview_options: disableLinkPreview,
        });
        console.log(
          `Admin management message (text) sent for Event ID=${event.id}`,
        );
      } catch (error) {
        console.error(
          `Error sending admin management text for Event ID=${event.id}:`,
          error,
        );
      }
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

    if (event.messageId) {
      try {
        await bot.api.deleteMessage(
          getChannelUsername(),
          Number(event.messageId),
        );
        console.log(
          `Message deleted from channel for Event ID=${eventId}, messageId=${event.messageId}`,
        );
      } catch (error) {
        console.error(
          `Error deleting message from channel for Event ID=${eventId}, messageId=${event.messageId}:`,
          error,
        );
      }
    }

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
    const messageText = formatEvent(ctx, event, {
      context: 'channel',
    });

    if (event.imageBase64) {
      const imageBuffer = Buffer.from(event.imageBase64, 'base64');
      const stream = Readable.from(imageBuffer);

      try {
        const sentMessage = await bot.api.sendPhoto(
          getChannelUsername(),
          new InputFile(stream),
          {
            caption: messageText,
            parse_mode: 'MarkdownV2',
          },
        );
        console.log(
          `Photo posted in the channel for Event ID=${event.id}, messageId=${sentMessage.message_id}`,
        );
        await updateEvent(event.id, {
          messageId: BigInt(sentMessage.message_id),
        });
        await postAdminManagementMessage(ctx, event);
      } catch (error) {
        console.error(
          `Error posting the photo to the channel for Event ID=${event.id}:`,
          error,
        );
      }
    } else {
      try {
        const sentMessage = await bot.api.sendMessage(
          getChannelUsername(),
          messageText,
          {
            parse_mode: 'MarkdownV2',
            link_preview_options: disableLinkPreview,
          },
        );
        console.log(
          `Message posted in the channel for Event ID=${event.id}, messageId=${sentMessage.message_id}`,
        );
        await updateEvent(event.id, {
          messageId: BigInt(sentMessage.message_id),
        });

        await postAdminManagementMessage(ctx, event);
      } catch (error) {
        console.error(
          `Error posting the message to the channel for Event ID=${event.id}:`,
          error,
        );
      }
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
    const messageText = formatEvent(ctx, event, {
      context: 'channel',
    });

    if (event.imageBase64) {
      const imageBuffer = Buffer.from(event.imageBase64, 'base64');
      const stream = Readable.from(imageBuffer);

      if (event.messageId) {
        try {
          await bot.api.deleteMessage(
            getChannelUsername(),
            Number(event.messageId),
          );
          console.log(`Old message deleted with ID: ${event.messageId}`);
        } catch (error) {
          console.error(
            `Error deleting message with ID: ${event.messageId}`,
            error,
          );
        }
      }

      try {
        const sentMessage = await bot.api.sendPhoto(
          getChannelUsername(),
          new InputFile(stream),
          {
            caption: messageText,
            parse_mode: 'MarkdownV2',
          },
        );
        console.log(
          `Updated photo posted in the channel for Event ID=${event.id}, new messageId=${sentMessage.message_id}`,
        );
        await updateEvent(event.id, {
          messageId: BigInt(sentMessage.message_id),
        });
        const updatedEvent = await findEventById(event.id);
        if (updatedEvent) {
          await postAdminManagementMessage(ctx, updatedEvent);
        }
      } catch (error) {
        console.error(
          `Error posting the updated photo to the channel for Event ID=${event.id}:`,
          error,
        );
      }
    } else {
      if (event.messageId) {
        try {
          await bot.api.editMessageText(
            getChannelUsername(),
            Number(event.messageId),
            messageText,
            {
              parse_mode: 'MarkdownV2',
              link_preview_options: disableLinkPreview,
            },
          );
          console.log(`Message edited with ID: ${event.messageId}`);
          const updatedEvent = await findEventById(event.id);
          if (updatedEvent) {
            await postAdminManagementMessage(ctx, updatedEvent);
          }
        } catch (error) {
          console.error(
            `Error editing message with ID: ${event.messageId}`,
            error,
          );

          try {
            const sentMessage = await bot.api.sendMessage(
              getChannelUsername(),
              messageText,
              {
                parse_mode: 'MarkdownV2',
                link_preview_options: disableLinkPreview,
              },
            );
            console.log(
              `New message posted in the channel for Event ID=${event.id}, messageId=${sentMessage.message_id}`,
            );
            await updateEvent(event.id, {
              messageId: BigInt(sentMessage.message_id),
            });
            const updatedEvent = await findEventById(event.id);
            if (updatedEvent) {
              await postAdminManagementMessage(ctx, updatedEvent);
            }
          } catch (sendError) {
            console.error(
              `Error sending the new message for Event ID=${event.id}:`,
              sendError,
            );
          }
        }
      } else {
        console.log(
          `Posting new message in the channel for Event ID=${event.id}`,
        );
        try {
          const sentMessage = await bot.api.sendMessage(
            getChannelUsername(),
            messageText,
            {
              parse_mode: 'MarkdownV2',
              link_preview_options: disableLinkPreview,
            },
          );
          console.log(
            `New message posted in the channel for Event ID=${event.id}, messageId=${sentMessage.message_id}`,
          );
          await updateEvent(event.id, {
            messageId: BigInt(sentMessage.message_id),
          });
          const updatedEvent = await findEventById(event.id);
          if (updatedEvent) {
            await postAdminManagementMessage(ctx, updatedEvent);
          }
        } catch (error) {
          console.error(
            `Error posting the new message in the channel for Event ID=${event.id}:`,
            error,
          );
        }
      }
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
          try {
            await bot.api.sendPhoto(chatId, new InputFile(stream), {
              caption: message,
              parse_mode: 'MarkdownV2',
              has_spoiler: true,
            });
          } catch (error) {
            await ctx.reply(
              ctx.t('msg-service-search-photo-error', {
                icon: ICONS.reject,
                eventId: event.id,
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
                eventId: event.id,
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
            eventId: event.id,
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
