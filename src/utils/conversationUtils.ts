import { InlineKeyboard, InputFile } from 'grammy';
import { Prisma, Event } from '@prisma/client';
import { Readable } from 'stream';
import { Conversation } from '@grammyjs/conversations';

import { MyContext } from '../types/context';
import {
  formatEvent,
  formatEventCaption,
  formatEventDescription,
} from './eventMessageFormatter';
import { ICONS } from './iconUtils';
import { escapeMarkdownV2Text } from './markdownUtils';

interface DisplayOptions {
  showEditOptions: boolean;
}

const disableLinkPreview = {
  is_disabled: true,
};

/**
 * Displays the event summary with confirmation and optional edit buttons.
 * Sends the message(s) to the user via ctx.reply or ctx.replyWithPhoto.
 *
 * @param ctx The context object.
 * @param eventData The event data to display.
 * @param options Configuration options.
 */
export async function displayEventSummaryWithOptions(
  ctx: MyContext,
  eventData: Prisma.EventCreateInput | Partial<Event>,
  options: DisplayOptions = { showEditOptions: true },
): Promise<void> {
  // Full text for text-only messages (without photo)
  const fullMessageText = formatEvent(ctx, eventData as Event, {
    context: 'user',
    isEdit: false,
  });

  // Short caption for photo messages (max 1024 chars - no description/links)
  const captionText = formatEventCaption(ctx, eventData as Event, {
    context: 'summary',
    isEdit: false,
  });

  const keyboard = new InlineKeyboard();

  keyboard
    .text(
      ctx.t('msg-summary-btn-confirm', { icon: ICONS.approve }),
      'confirm_submission',
    )
    .text(
      ctx.t('msg-summary-btn-cancel', { icon: ICONS.reject }),
      'cancel_submission',
    )
    .row();

  // Edit buttons (optional)
  if (options.showEditOptions) {
    keyboard
      .text('──────────────────', 'ignore_separator') // Visual separator button
      .row();

    keyboard
      .text(
        ctx.t('msg-summary-btn-edit-title', { icon: ICONS.pensil }),
        'edit_title',
      )
      .text(
        ctx.t('msg-summary-btn-edit-description', { icon: ICONS.pensil }),
        'edit_description',
      )
      .row();
    keyboard
      .text(
        ctx.t('msg-summary-btn-edit-location', { icon: ICONS.location }),
        'edit_location',
      )
      .text(
        ctx.t('msg-summary-btn-edit-date', { icon: ICONS.date }),
        'edit_date',
      )
      .row();
    keyboard
      .text(
        ctx.t('msg-summary-btn-edit-category', { icon: ICONS.category }),
        'edit_category',
      )
      .text(
        ctx.t('msg-summary-btn-edit-links', { icon: ICONS.links }),
        'edit_links',
      )
      .row();
    keyboard
      .text(
        ctx.t('msg-summary-btn-edit-groupLink', { icon: ICONS.links }),
        'edit_groupLink',
      )
      .text(
        ctx.t('msg-summary-btn-edit-image', { icon: ICONS.image }),
        'edit_image',
      )
      .row();
  }

  // Send message with or without photo
  if (eventData.imageBase64) {
    try {
      const imageBuffer = Buffer.from(eventData.imageBase64, 'base64');
      const stream = Readable.from(imageBuffer);

      // Send photo with short caption (no description/links)
      await ctx.replyWithPhoto(new InputFile(stream), {
        caption: captionText,
        parse_mode: 'MarkdownV2',
      });

      // Build description text with links for the second message
      const descriptionParts: string[] = [];

      if (eventData.description) {
        descriptionParts.push(formatEventDescription(ctx, eventData as Event));
      }

      if (eventData.links && (eventData.links as string[]).length > 0) {
        const linksText = (eventData.links as string[])
          .map((link: string) => escapeMarkdownV2Text(link))
          .join('\n');
        descriptionParts.push(
          ctx.t('msg-format-event-links', {
            icon: ICONS.links,
            links: linksText,
          }),
        );
      }

      if (eventData.groupLink) {
        descriptionParts.push(
          ctx.t('msg-format-event-group-link', {
            icon: ICONS.group,
            groupLink: escapeMarkdownV2Text(eventData.groupLink),
          }),
        );
      }

      // Send description + buttons as separate message
      if (descriptionParts.length > 0) {
        await ctx.replyWithMarkdownV2(descriptionParts.join('\n\n'), {
          reply_markup: keyboard,
          link_preview_options: disableLinkPreview,
        });
      } else {
        // No description/links, just send buttons
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-summary-prompt', { icon: ICONS.tip }),
          {
            reply_markup: keyboard,
            link_preview_options: disableLinkPreview,
          },
        );
      }
    } catch (error) {
      console.error('Error sending photo in summary:', error);
      // Fallback to text message if photo fails
      await ctx.replyWithMarkdownV2(fullMessageText, {
        reply_markup: keyboard,
        link_preview_options: disableLinkPreview,
      });
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-summary-error-sending-image', { icon: ICONS.reject }),
        {
          link_preview_options: disableLinkPreview,
        },
      );
    }
  } else {
    await ctx.replyWithMarkdownV2(fullMessageText, {
      reply_markup: keyboard,
      link_preview_options: disableLinkPreview,
    });
  }
}

/**
 * Asks the user to confirm cancellation of the conversation.
 * Returns true if user confirms cancellation, false if user wants to continue.
 *
 * @param ctx The context object.
 * @param conversation The conversation object.
 * @returns Promise<boolean> - true if user wants to cancel, false if user wants to continue
 */
export async function confirmCancellation(
  ctx: MyContext,
  conversation: Conversation<MyContext>,
): Promise<boolean> {
  const keyboard = new InlineKeyboard()
    .text(
      ctx.t('msg-conversation-cancel-confirm-yes', { icon: ICONS.reject }),
      'confirm_cancel',
    )
    .row()
    .text(
      ctx.t('msg-conversation-cancel-confirm-no', { icon: ICONS.approve }),
      'continue_conversation',
    );

  await ctx.replyWithMarkdownV2(
    ctx.t('msg-conversation-cancel-confirm-question'),
    {
      reply_markup: keyboard,
      link_preview_options: disableLinkPreview,
    },
  );

  const response = await conversation.wait();

  if (response.callbackQuery?.data === 'confirm_cancel') {
    await response.answerCallbackQuery();
    return true;
  } else if (response.callbackQuery?.data === 'continue_conversation') {
    await response.answerCallbackQuery();
    return false;
  }

  // Fallback: treat any other response as continue
  return false;
}
