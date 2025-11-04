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
  getMaxCategories,
} from '../constants/constants';
import { saveEvent } from '../models/eventModel';
import { MyContext } from '../types/context';
import { ICONS } from '../utils/iconUtils';
import { getLocaleUtil } from '../utils/localeUtils';
import { createCancelKeyboard } from '../utils/keyboardUtils';
import { escapeMarkdownV2Text } from '../utils/markdownUtils';
import { displayEventSummaryWithOptions } from '../utils/conversationUtils';

const locale = getLocaleUtil();

// Global storage for template save data to bypass session persistence issues
export const templateSaveStorage = new Map<string, Prisma.EventCreateInput>();

const disableLinkPreview = {
  is_disabled: true,
};

export async function submitEventConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
) {
  const eventData: Prisma.EventCreateInput = initializeEventData(ctx);

  const proceedWithTitle = await collectEventTitle(
    conversation,
    ctx,
    eventData,
  );
  if (!proceedWithTitle) return;

  const proceedWithDescription = await collectEventDescription(
    conversation,
    ctx,
    eventData,
  );
  if (!proceedWithDescription) return;

  const proceedWithLocation = await collectEventLocation(
    conversation,
    ctx,
    eventData,
  );
  if (!proceedWithLocation) return;

  const proceedWithDates = await collectEventDates(
    conversation,
    ctx,
    eventData,
  );
  if (!proceedWithDates) return;

  const proceedWithCategories = await collectEventCategories(
    conversation,
    ctx,
    eventData,
  );
  if (!proceedWithCategories) return;

  const proceedWithLinks = await collectEventLinks(
    conversation,
    ctx,
    eventData,
  );
  if (!proceedWithLinks) return;

  const proceedWithGroupLink = await collectEventGroupLink(
    conversation,
    ctx,
    eventData,
  );
  if (!proceedWithGroupLink) return;

  const proceedWithImage = await collectEventImage(
    conversation,
    ctx,
    eventData,
  );
  if (!proceedWithImage) return;

  let confirmed = false;
  while (!confirmed) {
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-summary-prompt', { icon: ICONS.approve }),
      { link_preview_options: disableLinkPreview },
    );

    await ctx.replyWithMarkdownV2(
      ctx.t('msg-summary-edit-options-heading', { icon: ICONS.pensil }),
      { link_preview_options: disableLinkPreview },
    );

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
      'ignore_separator',
    ]);
    const selection = summaryResponse.callbackQuery.data;
    await summaryResponse.answerCallbackQuery();

    if (selection === 'ignore_separator') {
      continue; // Go back to waiting for a real button press
    }

    switch (selection) {
      case 'confirm_submission':
        confirmed = true;
        break;
      case 'cancel_submission':
        await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-cancelled'), {
          link_preview_options: disableLinkPreview,
        });
        return;
      case 'edit_title':
        if (!(await collectEventTitle(conversation, ctx, eventData))) return;
        break;
      case 'edit_description':
        if (!(await collectEventDescription(conversation, ctx, eventData)))
          return;
        break;
      case 'edit_location':
        if (!(await collectEventLocation(conversation, ctx, eventData))) return;
        break;
      case 'edit_date':
        if (!(await collectEventDates(conversation, ctx, eventData))) return;
        break;
      case 'edit_category':
        if (!(await collectEventCategories(conversation, ctx, eventData)))
          return;
        break;
      case 'edit_links':
        if (!(await collectEventLinks(conversation, ctx, eventData))) return;
        break;
      case 'edit_groupLink':
        if (!(await collectEventGroupLink(conversation, ctx, eventData)))
          return;
        break;
      case 'edit_image':
        if (!(await collectEventImage(conversation, ctx, eventData))) return;
        break;
    }
  }

  try {
    const savedEvent = await saveEvent(eventData);

    if (getEventsRequireApproval()) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-success-pending', { icon: ICONS.approve }),
        {
          link_preview_options: disableLinkPreview,
        },
      );
      await sendEventToAdmins(ctx, savedEvent);
    } else {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-success-published', { icon: ICONS.approve }),
        {
          link_preview_options: disableLinkPreview,
        },
      );
      await publishEvent(ctx, savedEvent);
    }

    // Ask if user wants to save as template
    await askToSaveAsTemplate(ctx, eventData);
  } catch (error) {
    console.error('Error saving or publishing event:', error);
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-submit-event-save-error', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
  }
}

function initializeEventData(ctx: MyContext): Prisma.EventCreateInput {
  const submittedById = ctx.from?.id ? BigInt(ctx.from.id) : BigInt(0);

  return {
    title: '',
    description: '',
    entryDate: new Date(),
    date: new Date(),
    endDate: new Date(),
    category: [],
    links: [],
    submittedById: submittedById,
    submittedBy: ctx.from?.username || ctx.from?.first_name || 'Anonym',
    location: '',
    updatedCount: 0,
    status: getEventsRequireApproval() ? 'PENDING' : 'APPROVED',
    imageBase64: null,
    groupLink: null,
  };
}

async function collectEventTitle(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Prisma.EventCreateInput,
): Promise<boolean> {
  while (true) {
    try {
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
        await response.replyWithMarkdownV2(
          ctx.t('msg-conversation-cancelled'),
          {
            link_preview_options: disableLinkPreview,
          },
        );
        return false;
      }

      if (response.message?.text) {
        if (response.message.text.length > 80) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-submit-event-title-too-long', {
              icon: ICONS.reject,
            }),
            {
              link_preview_options: disableLinkPreview,
            },
          );
          continue;
        }
        eventData.title = response.message.text;
        return true;
      }
    } catch (error) {
      console.error('Error capturing the title:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-title-error', { icon: ICONS.reject }),
        {
          link_preview_options: disableLinkPreview,
        },
      );
    }
  }
}

async function collectEventDescription(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Prisma.EventCreateInput,
): Promise<boolean> {
  while (true) {
    try {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-description', { icon: ICONS.pensil }),
        {
          reply_markup: createCancelKeyboard(ctx),
          link_preview_options: disableLinkPreview,
        },
      );

      const response = await conversation.wait();

      if (response.callbackQuery?.data === 'cancel_conversation') {
        await response.answerCallbackQuery();
        await response.replyWithMarkdownV2(
          ctx.t('msg-conversation-cancelled'),
          {
            link_preview_options: disableLinkPreview,
          },
        );
        return false;
      }

      if (response.message?.text) {
        if (response.message.text.length > 405) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-submit-event-description-too-long', {
              icon: ICONS.reject,
            }),
            {
              link_preview_options: disableLinkPreview,
            },
          );
          continue;
        }
        eventData.description = response.message.text;
        return true;
      }
    } catch (error) {
      console.error('Error capturing the description:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-description-error', { icon: ICONS.reject }),
        {
          link_preview_options: disableLinkPreview,
        },
      );
    }
  }
}

async function collectEventLocation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Prisma.EventCreateInput,
) {
  while (true) {
    try {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-location', { icon: ICONS.pensil }),
        {
          reply_markup: createCancelKeyboard(ctx),
          link_preview_options: disableLinkPreview,
        },
      );

      const response = await conversation.wait();

      if (response.callbackQuery?.data === 'cancel_conversation') {
        await response.answerCallbackQuery();
        await response.replyWithMarkdownV2(
          ctx.t('msg-conversation-cancelled'),
          {
            link_preview_options: disableLinkPreview,
          },
        );
        return false;
      }

      if (response.message?.text) {
        const textLength = response.message.text.length;
        if (textLength < 3 || textLength > 90) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-submit-event-location-invalid', {
              icon: ICONS.reject,
            }),
            {
              link_preview_options: disableLinkPreview,
            },
          );
          continue;
        }
        eventData.location = response.message.text;
        return true;
      }
    } catch (error) {
      console.error('Error capturing the location:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-location-error', { icon: ICONS.reject }),
        {
          link_preview_options: disableLinkPreview,
        },
      );
    }
  }
}

async function collectEventDates(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Prisma.EventCreateInput,
) {
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
          await entryResponse.replyWithMarkdownV2(
            ctx.t('msg-conversation-cancelled'),
            {
              link_preview_options: disableLinkPreview,
            },
          );
          return false;
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
          await startResponse.replyWithMarkdownV2(
            ctx.t('msg-conversation-cancelled'),
            {
              link_preview_options: disableLinkPreview,
            },
          );
          return false;
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
          await endResponse.replyWithMarkdownV2(
            ctx.t('msg-conversation-cancelled'),
            {
              link_preview_options: disableLinkPreview,
            },
          );
          return false;
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

async function collectEventCategories(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Prisma.EventCreateInput,
) {
  let selectedCategories: string[] = [];

  while (true) {
    try {
      if (selectedCategories.length === 0) {
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-submit-event-category', { icon: ICONS.category }),
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: ctx.t('msg-cat-dance'),
                    callback_data: `cat_${ctx.t('msg-cat-dance')}`,
                  },
                  {
                    text: ctx.t('msg-cat-music'),
                    callback_data: `cat_${ctx.t('msg-cat-music')}`,
                  },
                  {
                    text: ctx.t('msg-cat-concert'),
                    callback_data: `cat_${ctx.t('msg-cat-concert')}`,
                  },
                ],
                [
                  {
                    text: ctx.t('msg-cat-entertainment'),
                    callback_data: `cat_${ctx.t('msg-cat-entertainment')}`,
                  },
                  {
                    text: ctx.t('msg-cat-politics'),
                    callback_data: `cat_${ctx.t('msg-cat-politics')}`,
                  },
                  {
                    text: ctx.t('msg-cat-theatre'),
                    callback_data: `cat_${ctx.t('msg-cat-theatre')}`,
                  },
                ],
                [
                  {
                    text: ctx.t('msg-cat-sport'),
                    callback_data: `cat_${ctx.t('msg-cat-sport')}`,
                  },
                  {
                    text: ctx.t('msg-cat-education'),
                    callback_data: `cat_${ctx.t('msg-cat-education')}`,
                  },
                  {
                    text: ctx.t('msg-cat-eat-drink'),
                    callback_data: `cat_${ctx.t('msg-cat-eat-drink')}`,
                  },
                ],
                [
                  {
                    text: ctx.t('msg-cat-art'),
                    callback_data: `cat_${ctx.t('msg-cat-art')}`,
                  },
                  {
                    text: ctx.t('msg-cat-cinema'),
                    callback_data: `cat_${ctx.t('msg-cat-cinema')}`,
                  },
                  {
                    text: ctx.t('msg-cat-festival'),
                    callback_data: `cat_${ctx.t('msg-cat-festival')}`,
                  },
                ],
                [
                  {
                    text: ctx.t('msg-cat-exhibition'),
                    callback_data: `cat_${ctx.t('msg-cat-exhibition')}`,
                  },
                  {
                    text: ctx.t('msg-cat-literature'),
                    callback_data: `cat_${ctx.t('msg-cat-literature')}`,
                  },
                  {
                    text: ctx.t('msg-cat-workshop'),
                    callback_data: `cat_${ctx.t('msg-cat-workshop')}`,
                  },
                ],
                [
                  {
                    text: ctx.t('msg-cat-lecture'),
                    callback_data: `cat_${ctx.t('msg-cat-lecture')}`,
                  },
                  {
                    text: ctx.t('msg-cat-market'),
                    callback_data: `cat_${ctx.t('msg-cat-market')}`,
                  },
                  {
                    text: ctx.t('msg-cat-other'),
                    callback_data: `cat_${ctx.t('msg-cat-other')}`,
                  },
                ],
                [
                  {
                    text: ctx.t('msg-submit-event-category-reset-btn', {
                      icon: ICONS.reset,
                    }),
                    callback_data: 'cat_reset',
                  },
                ],
                [
                  {
                    text: ctx.t('msg-submit-event-category-done-btn', {
                      icon: ICONS.approve,
                    }),
                    callback_data: 'cat_done',
                  },
                ],
                [
                  {
                    text: ctx.t('msg-submit-event-btn-cancel', {
                      icon: ICONS.reject,
                    }),
                    callback_data: 'cancel_conversation',
                  },
                ],
              ],
            },
            link_preview_options: disableLinkPreview,
          },
        );
      }

      const response = await conversation.waitForCallbackQuery(
        /^(cat_|cancel_conversation)/,
      );

      if (response.callbackQuery.data === 'cancel_conversation') {
        await response.answerCallbackQuery();
        await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-cancelled'), {
          link_preview_options: disableLinkPreview,
        });
        return false;
      }

      const selection = response.callbackQuery.data.replace('cat_', '');

      if (selection === 'done') {
        if (selectedCategories.length > 0) {
          eventData.category = selectedCategories;
          await response.answerCallbackQuery(
            ctx.t('msg-submit-event-category-saved', { icon: ICONS.save }),
          );
          return true;
        } else {
          await response.answerCallbackQuery(
            ctx.t('msg-submit-event-category-empty', { icon: ICONS.reject }),
          );
        }
      } else if (selection === 'reset') {
        selectedCategories = [];
        await response.answerCallbackQuery(
          ctx.t('msg-submit-event-category-reset', { icon: ICONS.reset }),
        );
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-submit-event-category-reset', { icon: ICONS.reset }),
          {
            link_preview_options: disableLinkPreview,
          },
        );
      } else {
        if (!selectedCategories.includes(selection)) {
          if (selectedCategories.length >= getMaxCategories()) {
            await response.answerCallbackQuery(
              ctx.t('msg-submit-event-category-max-reached', {
                icon: ICONS.warning,
                max: getMaxCategories(),
              }),
            );
            await ctx.replyWithMarkdownV2(
              ctx.t('msg-submit-event-category-max-reached', {
                icon: ICONS.reject,
                max: getMaxCategories(),
              }),
              {
                link_preview_options: disableLinkPreview,
              },
            );
            continue;
          }
          selectedCategories.push(selection);
          await response.answerCallbackQuery(
            ctx.t('msg-submit-event-category-added', { category: selection }),
          );
        } else {
          selectedCategories = selectedCategories.filter(
            (cat) => cat !== selection,
          );
          await response.answerCallbackQuery(
            ctx.t('msg-submit-event-category-removed', { category: selection }),
          );
        }
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-submit-event-category-selected', {
            icon: ICONS.category,
            categories: selectedCategories.join(', '),
          }),
          {
            link_preview_options: disableLinkPreview,
          },
        );
      }
    } catch (error) {
      console.error('Error capturing the categories:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-category-error', { icon: ICONS.reject }),
        {
          link_preview_options: disableLinkPreview,
        },
      );
    }
  }
}

async function collectEventLinks(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Prisma.EventCreateInput,
) {
  while (true) {
    try {
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
                  text: ctx.t('msg-submit-event-links-no-btn', {
                    icon: ICONS.next,
                  }),
                  callback_data: 'no_links',
                },
              ],
              [
                {
                  text: ctx.t('msg-submit-event-btn-cancel', {
                    icon: ICONS.reject,
                  }),
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
        await response.replyWithMarkdownV2(
          ctx.t('msg-conversation-cancelled'),
          {
            link_preview_options: disableLinkPreview,
          },
        );
        return false;
      } else if (response.callbackQuery?.data === 'no_links') {
        await response.answerCallbackQuery();
        eventData.links = [];
        return true;
      } else if (response.message?.text) {
        if (response.message.text.length > 40) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-submit-event-link-too-long', { icon: ICONS.reject }),
            {
              link_preview_options: disableLinkPreview,
            },
          );
          continue;
        }

        const linksText = response.message.text;

        if (linksText.toLowerCase() !== 'no') {
          const links = linksText.split(' ').slice(0, 1);
          eventData.links = links;
          return true;
        } else {
          eventData.links = [];
          return true;
        }
      } else {
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-submit-event-links-invalid', { icon: ICONS.reject }),
          {
            link_preview_options: disableLinkPreview,
          },
        );
      }
    } catch (error) {
      console.error('Error capturing the links:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-links-error', { icon: ICONS.reject }),
        {
          link_preview_options: disableLinkPreview,
        },
      );
    }
  }
}

async function collectEventGroupLink(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Prisma.EventCreateInput,
) {
  while (true) {
    try {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-group-link', { icon: ICONS.links }),
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: ctx.t('msg-submit-event-links-no-btn', {
                    icon: ICONS.next,
                  }),
                  callback_data: 'no_group_link',
                },
              ],
              [
                {
                  text: ctx.t('msg-submit-event-btn-cancel', {
                    icon: ICONS.reject,
                  }),
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
        await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-cancelled'), {
          link_preview_options: disableLinkPreview,
        });
        return false;
      } else if (response.callbackQuery?.data === 'no_group_link') {
        await response.answerCallbackQuery();
        eventData.groupLink = null;
        return true;
      } else if (response.message?.text) {
        eventData.groupLink = response.message.text;
        return true;
      } else {
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-submit-event-group-link-invalid', { icon: ICONS.reject }),
          {
            link_preview_options: disableLinkPreview,
          },
        );
      }
    } catch (error) {
      console.error('Error capturing the group link:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-group-link-error', { icon: ICONS.reject }),
        {
          link_preview_options: disableLinkPreview,
        },
      );
    }
  }
}

async function collectEventImage(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Prisma.EventCreateInput,
) {
  while (true) {
    try {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-image', { icon: ICONS.image }),
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: ctx.t('msg-submit-event-image-no-btn', {
                    icon: ICONS.next,
                  }),
                  callback_data: 'no_image',
                },
              ],
              [
                {
                  text: ctx.t('msg-submit-event-btn-cancel', {
                    icon: ICONS.reject,
                  }),
                  callback_data: 'cancel_conversation',
                },
              ],
            ],
          },
          link_preview_options: disableLinkPreview,
        },
      );
      const imageResponse = await conversation.wait();

      if (imageResponse.callbackQuery?.data === 'cancel_conversation') {
        await imageResponse.answerCallbackQuery();
        await imageResponse.replyWithMarkdownV2(
          ctx.t('msg-conversation-cancelled'),
          {
            link_preview_options: disableLinkPreview,
          },
        );
        return false;
      } else if (imageResponse.callbackQuery?.data === 'no_image') {
        await imageResponse.answerCallbackQuery();
        eventData.imageBase64 = null;
        return true;
      } else if (imageResponse.message?.photo) {
        const photo =
          imageResponse.message.photo[imageResponse.message.photo.length - 1];
        const fileId = photo.file_id;
        const file = await ctx.api.getFile(fileId);
        const filePath = file.file_path || '';
        const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${filePath}`;

        const response = await fetch(fileUrl);
        if (!response.ok) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-submit-event-image-error', { icon: ICONS.reject }),
            {
              link_preview_options: disableLinkPreview,
            },
          );
          continue;
        }
        const buffer = await response.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');

        eventData.imageBase64 = base64Image;
        return true;
      } else {
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-submit-event-image-invalid', { icon: ICONS.reject }),
          {
            link_preview_options: disableLinkPreview,
          },
        );
      }
    } catch (error) {
      console.error('Error capturing the image:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-image-error', { icon: ICONS.reject }),
        {
          link_preview_options: disableLinkPreview,
        },
      );
    }
  }
}

async function askToSaveAsTemplate(
  ctx: MyContext,
  eventData: Prisma.EventCreateInput,
) {
  try {
    // Create a unique key for this user's template save
    const userId = ctx.from?.id?.toString() || 'unknown';

    // Store in global storage to bypass session persistence issues
    templateSaveStorage.set(userId, eventData);

    await ctx.replyWithMarkdownV2(
      ctx.t('msg-save-as-template-prompt', { icon: ICONS.save }),
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: ctx.t('bot-entry-yes', { icon: ICONS.approve }),
                callback_data: `save_as_template_${userId}`,
              },
              {
                text: ctx.t('bot-entry-no', { icon: ICONS.reject }),
                callback_data: 'skip_template',
              },
            ],
          ],
        },
        link_preview_options: disableLinkPreview,
      },
    );
  } catch (error) {
    console.error('Error in template save prompt:', error);
  }
}
