import { Conversation } from '@grammyjs/conversations';
import { Prisma } from '@prisma/client';
import { parse } from 'date-fns';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

import {
  sendEventToAdmins,
  publishEvent,
} from '../controllers/eventController';
import {
  getTimezone,
  getDateFormat,
  getEventsRequireApproval,
} from '../constants/constants';
import { saveEvent } from '../models/eventModel';
import { loadTemplate, createEventDataFromTemplate, updateTemplateFromEvent } from '../services/templateService';
import { MyContext } from '../types/context';
import { ICONS } from '../utils/iconUtils';
import { createCancelKeyboard } from '../utils/keyboardUtils';
import { getLocaleUtil } from '../utils/localeUtils';
import { escapeMarkdownV2Text } from '../utils/markdownUtils';
import {
  displayEventSummaryWithOptions,
  confirmCancellation,
} from '../utils/conversationUtils';

const disableLinkPreview = {
  is_disabled: true,
};

export async function templateUseConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
) {
  if (!ctx.from) {
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-error-user-not-found', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
    return;
  }

  // Get templateId from session
  const templateId = ctx.session.templateId as string | undefined;
  
  if (!templateId) {
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-template-not-found', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
    return;
  }

  const template = await loadTemplate(templateId, BigInt(ctx.from.id));
  
  if (!template) {
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-template-not-found', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
    return;
  }

  // Create event data from template
  const eventData = createEventDataFromTemplate(template, ctx) as Prisma.EventCreateInput;
  
  // Initialize required fields not in template
  eventData.entryDate = new Date();
  eventData.date = new Date();
  eventData.endDate = new Date();
  eventData.status = getEventsRequireApproval() ? 'PENDING' : 'APPROVED';
  eventData.updatedCount = 0;

  await ctx.replyWithMarkdownV2(
    ctx.t('msg-template-use-start', {
      icon: ICONS.event,
      name: escapeMarkdownV2Text(template.templateName),
    }),
    { link_preview_options: disableLinkPreview },
  );

  // Show current template data and ask what to edit
  let confirmed = false;
  while (!confirmed) {
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-template-use-summary', { icon: ICONS.approve }),
      { link_preview_options: disableLinkPreview },
    );

    await ctx.replyWithMarkdownV2(
      ctx.t('msg-summary-edit-options-heading', { icon: ICONS.pensil }),
      { link_preview_options: disableLinkPreview },
    );

    // Display summary with edit options
    await displayEventSummaryWithOptions(ctx, eventData);

    const summaryResponse = await conversation.waitForCallbackQuery([
      'confirm_submission',
      'cancel_submission',
      'edit_title',
      'edit_description',
      'edit_location',
      'edit_date',
      'edit_category',
      'edit_links',
      'edit_groupLink',
      'edit_image',
    ]);

    await summaryResponse.answerCallbackQuery();

    if (summaryResponse.callbackQuery.data === 'cancel_submission') {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-conversation-cancelled'),
        { link_preview_options: disableLinkPreview },
      );
      return;
    }

    if (summaryResponse.callbackQuery.data === 'confirm_submission') {
      confirmed = true;
      break;
    }

    // Handle edit actions
    switch (summaryResponse.callbackQuery.data) {
      case 'edit_title':
        if (!(await editEventTitle(conversation, ctx, eventData))) return;
        break;
      case 'edit_description':
        if (!(await editEventDescription(conversation, ctx, eventData))) return;
        break;
      case 'edit_location':
        if (!(await editEventLocation(conversation, ctx, eventData))) return;
        break;
      case 'edit_date':
        if (!(await collectEventDates(conversation, ctx, eventData))) return;
        break;
      case 'edit_category':
        if (!(await editEventCategories())) return;
        break;
      case 'edit_links':
        if (!(await editEventLinks(conversation, ctx, eventData))) return;
        break;
      case 'edit_groupLink':
        if (!(await editEventGroupLink())) return;
        break;
      case 'edit_image':
        if (!(await editEventImage())) return;
        break;
    }
  }

  // Always collect dates for new event (admission, start, end)
  await ctx.replyWithMarkdownV2(
    ctx.t('msg-template-use-date-required', { icon: ICONS.calendar }),
    { link_preview_options: disableLinkPreview },
  );
  
  if (!(await collectEventDates(conversation, ctx, eventData))) return;

  // Save the event
  try {
    const savedEvent = await saveEvent(eventData);

    if (getEventsRequireApproval()) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-success-pending', { icon: ICONS.approve }),
        { link_preview_options: disableLinkPreview },
      );
      await sendEventToAdmins(ctx, savedEvent);
    } else {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-success-published', { icon: ICONS.approve }),
        { link_preview_options: disableLinkPreview },
      );
      await publishEvent(ctx, savedEvent);
    }

    // Update template with changes made during event creation
    try {
      const updatedTemplate = await updateTemplateFromEvent(
        templateId,
        BigInt(ctx.from.id),
        eventData,
      );
      
      if (!updatedTemplate) {
        console.warn(`Failed to update template ${templateId} with changes`);
      }
    } catch (error) {
      console.error('Error updating template with changes:', error);
    }
  } catch (error) {
    console.error('Error saving event from template:', error);
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-submit-event-save-error', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
  }
}

// Edit functions - simplified versions that just collect new data
async function editEventTitle(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Prisma.EventCreateInput,
): Promise<boolean> {
  await ctx.replyWithMarkdownV2(
    ctx.t('msg-submit-event-title', { icon: ICONS.event }),
    {
      reply_markup: createCancelKeyboard(ctx),
      link_preview_options: disableLinkPreview,
    },
  );

  const response = await conversation.wait();

  if (response.callbackQuery?.data === 'cancel_conversation') {
    await response.answerCallbackQuery();
    const shouldCancel = await confirmCancellation(ctx, conversation);
    if (shouldCancel) {
      return false;
    }
    return await editEventTitle(conversation, ctx, eventData);
  }

  if (response.message?.text) {
    if (response.message.text.length > 80) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-title-too-long', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
      return await editEventTitle(conversation, ctx, eventData);
    }
    eventData.title = response.message.text;
    return true;
  }
  return false;
}

async function editEventDescription(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Prisma.EventCreateInput,
): Promise<boolean> {
  await ctx.replyWithMarkdownV2(
    ctx.t('msg-submit-event-description', { icon: ICONS.description }),
    {
      reply_markup: createCancelKeyboard(ctx),
      link_preview_options: disableLinkPreview,
    },
  );

  const response = await conversation.wait();

  if (response.callbackQuery?.data === 'cancel_conversation') {
    await response.answerCallbackQuery();
    const shouldCancel = await confirmCancellation(ctx, conversation);
    if (shouldCancel) {
      return false;
    }
    return await editEventDescription(conversation, ctx, eventData);
  }

  if (response.message?.text) {
    if (response.message.text.length > 2000) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-description-too-long', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
      return await editEventDescription(conversation, ctx, eventData);
    }
    eventData.description = response.message.text;
    return true;
  }
  return false;
}

async function editEventLocation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Prisma.EventCreateInput,
): Promise<boolean> {
  await ctx.replyWithMarkdownV2(
    ctx.t('msg-submit-event-location', { icon: ICONS.location }),
    {
      reply_markup: createCancelKeyboard(ctx),
      link_preview_options: disableLinkPreview,
    },
  );

  const response = await conversation.wait();

  if (response.callbackQuery?.data === 'cancel_conversation') {
    await response.answerCallbackQuery();
    const shouldCancel = await confirmCancellation(ctx, conversation);
    if (shouldCancel) {
      return false;
    }
    return await editEventLocation(conversation, ctx, eventData);
  }

  if (response.message?.text) {
    if (response.message.text.length > 100) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-location-too-long', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
      return await editEventLocation(conversation, ctx, eventData);
    }
    eventData.location = response.message.text;
    return true;
  }
  return false;
}


async function editEventCategories(): Promise<boolean> {
  // Keep existing categories if they exist
  return true;
}

async function editEventLinks(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Prisma.EventCreateInput,
): Promise<boolean> {
  await ctx.replyWithMarkdownV2(
    ctx.t('msg-submit-event-links', {
      iconPensil: ICONS.pensil,
      iconTip: ICONS.tip,
    }),
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: ctx.t('msg-submit-event-links-keep', { icon: ICONS.approve }),
              callback_data: 'keep_links',
            },
            {
              text: ctx.t('msg-submit-event-btn-cancel', { icon: ICONS.reject }),
              callback_data: 'cancel_conversation',
            },
          ],
        ],
      },
      link_preview_options: disableLinkPreview,
    },
  );

  const response = await conversation.wait();

  if (response.callbackQuery?.data === 'cancel_conversation') {
    await response.answerCallbackQuery();
    const shouldCancel = await confirmCancellation(ctx, conversation);
    if (shouldCancel) {
      return false;
    }
    return await editEventLinks(conversation, ctx, eventData);
  }

  if (response.callbackQuery?.data === 'keep_links') {
    await response.answerCallbackQuery();
    return true;
  }

  if (response.message?.text) {
    const links = response.message.text.split(' ').slice(0, 1);
    eventData.links = links;
    return true;
  }

  return true;
}

async function editEventGroupLink(): Promise<boolean> {
  // Keep existing group link if it exists
  return true;
}

async function editEventImage(): Promise<boolean> {
  // Keep existing image if it exists
  return true;
}

async function collectEventDates(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Prisma.EventCreateInput,
) {
  const locale = getLocaleUtil();
  
  while (true) {
    try {
      let parsedEntryDate: Date | null = null;
      let parsedStartDate: Date | null = null;
      let parsedEndDate: Date | null = null;

      // Entry Date
      while (true) {
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-submit-event-entry-date', {
            icon: ICONS.pensil,
            date: escapeMarkdownV2Text(getDateFormat()),
          }),
          {
            reply_markup: createCancelKeyboard(ctx),
            link_preview_options: disableLinkPreview,
          },
        );
        const entryResponse = await conversation.wait();

        if (entryResponse.callbackQuery?.data === 'cancel_conversation') {
          await entryResponse.answerCallbackQuery();
          const shouldCancel = await confirmCancellation(ctx, conversation);
          if (shouldCancel) {
            await entryResponse.replyWithMarkdownV2(
              ctx.t('msg-conversation-cancelled'),
              {
                link_preview_options: disableLinkPreview,
              },
            );
            return false;
          }
          continue;
        }

        if (!entryResponse.message?.text) continue;

        const parsedEntryDateInTimeZone = parse(
          entryResponse.message.text,
          getDateFormat(),
          new Date(),
          { locale },
        );

        if (isNaN(parsedEntryDateInTimeZone.getTime())) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-submit-event-entry-date-invalid', {
              icon: ICONS.reject,
              date: escapeMarkdownV2Text(getDateFormat()),
            }),
            {
              link_preview_options: disableLinkPreview,
            },
          );
          continue;
        }

        if (parsedEntryDateInTimeZone < new Date()) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-submit-event-entry-date-future', { icon: ICONS.reject }),
            {
              link_preview_options: disableLinkPreview,
            },
          );
          continue;
        }

        parsedEntryDate = fromZonedTime(
          parsedEntryDateInTimeZone,
          getTimezone(),
        );
        break;
      }

      // Start Date
      while (true) {
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-submit-event-start-date', {
            icon: ICONS.pensil,
            date: escapeMarkdownV2Text(getDateFormat()),
          }),
          {
            reply_markup: createCancelKeyboard(ctx),
            link_preview_options: disableLinkPreview,
          },
        );
        const startResponse = await conversation.wait();

        if (startResponse.callbackQuery?.data === 'cancel_conversation') {
          await startResponse.answerCallbackQuery();
          const shouldCancel = await confirmCancellation(ctx, conversation);
          if (shouldCancel) {
            await startResponse.replyWithMarkdownV2(
              ctx.t('msg-conversation-cancelled'),
              {
                link_preview_options: disableLinkPreview,
              },
            );
            return false;
          }
          continue;
        }

        if (!startResponse.message?.text) continue;

        const parsedStartDateInTimeZone = parse(
          startResponse.message.text,
          getDateFormat(),
          new Date(),
          { locale },
        );

        if (isNaN(parsedStartDateInTimeZone.getTime())) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-submit-event-start-date-invalid', {
              icon: ICONS.reject,
              date: escapeMarkdownV2Text(getDateFormat()),
            }),
            {
              link_preview_options: disableLinkPreview,
            },
          );
          continue;
        }

        if (parsedStartDateInTimeZone < new Date()) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-submit-event-start-date-future', { icon: ICONS.reject }),
            {
              link_preview_options: disableLinkPreview,
            },
          );
          continue;
        }

        parsedStartDate = fromZonedTime(
          parsedStartDateInTimeZone,
          getTimezone(),
        );

        if (parsedEntryDate && parsedEntryDate > parsedStartDate) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-submit-event-start-date-before-entry', {
              icon: ICONS.reject,
            }),
            {
              link_preview_options: disableLinkPreview,
            },
          );
          parsedStartDate = null;
          continue;
        }
        break;
      }

      // End Date
      while (true) {
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-submit-event-end-date', {
            icon: ICONS.pensil,
            date: escapeMarkdownV2Text(getDateFormat()),
          }),
          {
            reply_markup: createCancelKeyboard(ctx),
            link_preview_options: disableLinkPreview,
          },
        );

        const endResponse = await conversation.wait();

        if (endResponse.callbackQuery?.data === 'cancel_conversation') {
          await endResponse.answerCallbackQuery();
          const shouldCancel = await confirmCancellation(ctx, conversation);
          if (shouldCancel) {
            await endResponse.replyWithMarkdownV2(
              ctx.t('msg-conversation-cancelled'),
              {
                link_preview_options: disableLinkPreview,
              },
            );
            return false;
          }
          continue;
        }

        if (!endResponse.message?.text) continue;

        const parsedEndDateInTimeZone = parse(
          endResponse.message.text,
          getDateFormat(),
          new Date(),
          { locale },
        );

        if (isNaN(parsedEndDateInTimeZone.getTime())) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-submit-event-end-date-invalid', {
              icon: ICONS.reject,
              date: escapeMarkdownV2Text(getDateFormat()),
            }),
            {
              link_preview_options: disableLinkPreview,
            },
          );
          continue;
        }

        if (parsedEndDateInTimeZone < new Date()) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-submit-event-end-date-future', { icon: ICONS.reject }),
            {
              link_preview_options: disableLinkPreview,
            },
          );
          continue;
        }

        parsedEndDate = fromZonedTime(parsedEndDateInTimeZone, getTimezone());

        if (parsedStartDate && parsedEndDate <= parsedStartDate) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-submit-event-end-date-before-start', {
              icon: ICONS.reject,
            }),
            {
              link_preview_options: disableLinkPreview,
            },
          );
          parsedEndDate = null;
          continue;
        }
        break;
      }

      const formattedEntryDate = formatInTimeZone(
        parsedEntryDate,
        getTimezone(),
        getDateFormat(),
        { locale },
      );
      const formattedStartDate = formatInTimeZone(
        parsedStartDate,
        getTimezone(),
        getDateFormat(),
        { locale },
      );
      const formattedEndDate = formatInTimeZone(
        parsedEndDate,
        getTimezone(),
        getDateFormat(),
        { locale },
      );

      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-date-summary', {
          icon: ICONS.date,
          entryDate: escapeMarkdownV2Text(formattedEntryDate),
          startDate: escapeMarkdownV2Text(formattedStartDate),
          endDate: escapeMarkdownV2Text(formattedEndDate),
        }),
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: ctx.t('msg-submit-event-date-summary-confirm', {
                    icon: ICONS.approve,
                  }),
                  callback_data: 'dates_confirm',
                },
              ],
              [
                {
                  text: ctx.t('msg-submit-event-date-summary-reset', {
                    icon: ICONS.reset,
                  }),
                  callback_data: 'dates_reset',
                },
              ],
            ],
          },
          link_preview_options: disableLinkPreview,
        },
      );

      const confirmResponse = await conversation.waitForCallbackQuery([
        'dates_confirm',
        'dates_reset',
      ]);

      if (confirmResponse.callbackQuery.data === 'dates_confirm') {
        eventData.entryDate = parsedEntryDate;
        eventData.date = parsedStartDate;
        eventData.endDate = parsedEndDate;
        await confirmResponse.answerCallbackQuery(
          ctx.t('msg-submit-event-dates-saved', { icon: ICONS.save }),
        );
        return true;
      } else {
        await confirmResponse.answerCallbackQuery(
          ctx.t('msg-submit-event-dates-reset', { icon: ICONS.reset }),
        );
      }
    } catch (error) {
      console.error('Error capturing the dates:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-date-error', { icon: ICONS.reject }),
        {
          link_preview_options: disableLinkPreview,
        },
      );
    }
  }
}