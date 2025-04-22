import { InlineKeyboard, InputFile } from 'grammy';
import { Prisma, Event } from '@prisma/client';
import { Readable } from 'stream';

import { MyContext } from '../types/context';
import { formatEvent } from './eventMessageFormatter';
import { ICONS } from './iconUtils';

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
  const messageText = formatEvent(ctx, eventData as Event, {
    context: 'user',
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
      await ctx.replyWithPhoto(new InputFile(stream), {
        caption: messageText,
        reply_markup: keyboard,
      });
    } catch (error) {
      console.error('Error sending photo in summary:', error);
      // Fallback to text message if photo fails
      await ctx.replyWithMarkdownV2(messageText, {
        reply_markup: keyboard,
        link_preview_options: disableLinkPreview,
      });
      await ctx.replyWithMarkdownV2(ctx.t('msg-summary-error-sending-image'), {
        link_preview_options: disableLinkPreview,
      });
    }
  } else {
    await ctx.replyWithMarkdownV2(messageText, {
      reply_markup: keyboard,
      link_preview_options: disableLinkPreview,
    });
  }
}
