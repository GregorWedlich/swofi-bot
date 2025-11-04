import { Conversation } from '@grammyjs/conversations';
import { InlineKeyboard } from 'grammy';
import { parse } from 'date-fns';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { Event } from '@prisma/client';
import { displayEventSummaryWithOptions } from '../utils/conversationUtils';

import {
  sendEventToAdmins,
  publishEvent,
} from '../controllers/eventController';
import {
  updateEvent,
  findUserApprovedEvents,
  findEventById,
} from '../models/eventModel';
import { MyContext } from '../types/context';
import { ICONS } from '../utils/iconUtils';

import { getLocaleUtil } from '../utils/localeUtils';
import {
  getTimezone,
  getDateFormat,
  getMaxEventEdits,
  getEventsRequireApproval,
  getMaxCategories,
} from '../constants/constants';
import { escapeMarkdownV2Text } from '../utils/markdownUtils';

const locale = getLocaleUtil();

const disableLinkPreview = {
  is_disabled: true,
};

export async function editEventConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
) {
  try {
    // --- User Edit Flow (Admin flow removed) ---
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-user-not-found'), {
        link_preview_options: disableLinkPreview,
      });
      return;
    }

    const events = await findUserApprovedEvents(userId);

    if (events.length === 0) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-edit-event-no-approved-events-found'),
        { link_preview_options: disableLinkPreview },
      );
      return;
    }

    const availableEvents = events.filter((event) => {
      if (getMaxEventEdits() === 0) return true;
      return event.updatedCount < getMaxEventEdits();
    });

    if (availableEvents.length === 0) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-edit-event-edit-limit-reached'),
        { link_preview_options: disableLinkPreview },
      );
      return;
    }

    const originalEvent = await selectEvent(conversation, ctx, availableEvents);
    if (!originalEvent) return; // User cancelled selection

    // Ensure originalEvent is not null before proceeding (redundant check after selectEvent, but safe)
    if (!originalEvent) {
      console.error('Original event is null after selection. Aborting.');
      await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-error'), {
        link_preview_options: disableLinkPreview,
      });
      return;
    }

    const eventData: Partial<Event> = { ...originalEvent };

    let confirmed = false;
    // --- Removed duplicated block below ---
    while (!confirmed) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-summary-prompt', { icon: ICONS.approve }),
        { link_preview_options: disableLinkPreview },
      );

      await ctx.reply(
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
        continue;
      }

      switch (selection) {
        case 'confirm_submission':
          confirmed = true;
          break;
        case 'cancel_submission':
          await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-cancelled'), {
            link_preview_options: disableLinkPreview,
          });
          return; // Exit conversation
        case 'edit_title':
          if (!(await collectEventTitle(conversation, ctx, eventData))) return;
          break;
        case 'edit_description':
          if (!(await collectEventDescription(conversation, ctx, eventData)))
            return;
          break;
        case 'edit_location':
          if (!(await collectEventLocation(conversation, ctx, eventData)))
            return;
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
      await updateEvent(originalEvent.id, {
        ...eventData,
        status: getEventsRequireApproval()
          ? 'EDITED_PENDING'
          : 'EDITED_APPROVED',
        updatedCount: originalEvent.updatedCount + 1,
      });

      const updatedEventFromDb = (await findEventById(
        originalEvent.id,
      )) as Event;

      if (getEventsRequireApproval()) {
        await sendEventToAdmins(ctx, updatedEventFromDb, true);
        await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-save-review'), {
          link_preview_options: disableLinkPreview,
        });
      } else {
        await publishEvent(ctx, updatedEventFromDb);
        await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-save'), {
          link_preview_options: disableLinkPreview,
        });
      }
    } catch (error) {
      console.error('Error updating or publishing edited event:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-edit-event-final-save-error', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
    }
  } catch (error) {
    console.error('Error while editing the event:', error);
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-edit-event-error', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
  }
}

async function selectEvent(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  availableEvents: Event[],
): Promise<Event | null> {
  const keyboard = new InlineKeyboard();
  availableEvents.forEach((event) => {
    const remainingEdits =
      getMaxEventEdits() === 0
        ? '∞'
        : `${getMaxEventEdits() - event.updatedCount}`;
    keyboard
      .text(
        ctx.t('msg-edit-event-remaining-edits-overview', {
          title: event.title,
          remainingEdits: remainingEdits,
        }),
        `edit_event_${event.id}`,
      )
      .row();
  });

  await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-select-event-to-edit'), {
    reply_markup: keyboard,
    link_preview_options: disableLinkPreview,
  });

  const eventSelection = await conversation.waitForCallbackQuery(
    new RegExp(`^edit_event_(${availableEvents.map((e) => e.id).join('|')})$`),
  );
  const eventId = eventSelection.callbackQuery.data.replace('edit_event_', '');
  await eventSelection.answerCallbackQuery();

  const event = (await findEventById(eventId)) as Event;

  if (getMaxEventEdits() !== 0) {
    const remainingEdits = getMaxEventEdits() - event.updatedCount;
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-edit-event-remaining-edits', {
        remainingEdits,
      }),
      { link_preview_options: disableLinkPreview },
    );
    if (remainingEdits <= 0) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-edit-event-remaining-edits-reached'),
        { link_preview_options: disableLinkPreview },
      );
      return null;
    }
  }

  return event;
}

async function collectEventTitle(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Partial<Event>,
): Promise<boolean> {
  console.log('Entering collectEventTitle'); // Add log
  while (true) {
    try {
      await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-new-title'), {
        reply_markup: new InlineKeyboard().text(
          ctx.t('msg-conversation-cancelled-btn', { icon: ICONS.reject }),
          'cancel_conversation',
        ),
        link_preview_options: disableLinkPreview,
      });
      console.log('collectEventTitle: Waiting for response...'); // Add log
      const response = await conversation.wait();
      // Using console.dir for potentially better object inspection
      console.dir(response.update, { depth: null }); // Log the full update object

      if (response.callbackQuery?.data === 'cancel_conversation') {
        console.log('collectEventTitle: Cancel button pressed'); // Add log
        await response.answerCallbackQuery();
        return false;
      }

      if (response.message?.text) {
        const newTitle = response.message.text;
        console.log(`collectEventTitle: Received text: "${newTitle}"`); // Add log
        if (newTitle.length > 80) {
          console.log('collectEventTitle: Title too long'); // Add log
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-submit-event-title-too-long', { icon: ICONS.reject }),
            { link_preview_options: disableLinkPreview },
          );
          continue;
        } else {
          console.log('collectEventTitle: Title accepted'); // Add log
          eventData.title = newTitle;
          return true;
        }
      }

      // Handle unexpected updates explicitly
      console.log(
        'collectEventTitle: Received unexpected update type, asking again.',
      ); // Add log
      // Optionally inform the user about invalid input if needed
      // await ctx.reply("Invalid input type, please send text or press cancel.");
    } catch (error) {
      console.error('Error while collecting the title:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-edit-event-title-error', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
      return false; // Exit on error
    }
  }
  // This part is unreachable due to the loop/returns
}

async function collectEventDescription(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Partial<Event>,
): Promise<boolean> {
  while (true) {
    try {
      await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-new-description'), {
        reply_markup: new InlineKeyboard().text(
          ctx.t('msg-conversation-cancelled-btn', { icon: ICONS.reject }),
          'cancel_conversation',
        ),
        link_preview_options: disableLinkPreview,
      });
      const response = await conversation.wait();

      if (response.callbackQuery?.data === 'cancel_conversation') {
        await response.answerCallbackQuery();
        return false;
      }

      if (response.message?.text) {
        if (response.message.text.length > 405) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-submit-event-description-too-long', {
              icon: ICONS.reject,
            }),
            { link_preview_options: disableLinkPreview },
          );
          continue;
        } else {
          eventData.description = response.message.text;
          return true;
        }
      }
    } catch (error) {
      console.error('Error while collecting the description:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-edit-event-description-error', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
    }
  }
  return false;
}

async function collectEventLocation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Partial<Event>,
): Promise<boolean> {
  while (true) {
    try {
      await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-new-location'), {
        reply_markup: new InlineKeyboard().text(
          ctx.t('msg-conversation-cancelled-btn', { icon: ICONS.reject }),
          'cancel_conversation',
        ),
        link_preview_options: disableLinkPreview,
      });
      const response = await conversation.wait();

      if (response.callbackQuery?.data === 'cancel_conversation') {
        await response.answerCallbackQuery();
        return false;
      }

      if (response.message?.text) {
        const textLength = response.message.text.length;
        if (textLength < 3 || textLength > 90) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-submit-event-location-invalid', { icon: ICONS.reject }),
            { link_preview_options: disableLinkPreview },
          );
          continue;
        } else {
          eventData.location = response.message.text;
          return true;
        }
      }
    } catch (error) {
      console.error('Error while collecting the location:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-edit-event-location-error', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
    }
  }
  return false;
}

async function collectEventDates(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Partial<Event>,
): Promise<boolean> {
  while (true) {
    try {
      let parsedEntryDate: Date | null = eventData.entryDate || null;
      let parsedStartDate: Date | null = eventData.date || null;
      let parsedEndDate: Date | null = eventData.endDate || null;

      while (true) {
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-edit-event-new-entry-date', {
            date: escapeMarkdownV2Text(getDateFormat()),
          }),
          {
            reply_markup: new InlineKeyboard().text(
              ctx.t('msg-conversation-cancelled-btn', { icon: ICONS.reject }),
              'cancel_conversation',
            ),
            link_preview_options: disableLinkPreview,
          },
        );
        const entryResponse = await conversation.wait();
        if (entryResponse.callbackQuery?.data === 'cancel_conversation') {
          await entryResponse.answerCallbackQuery();
          return false;
        }
        if (entryResponse.message?.text) {
          const parsed = parse(
            entryResponse.message.text,
            getDateFormat(),
            new Date(),
            { locale },
          );
          if (isNaN(parsed.getTime())) {
            await ctx.replyWithMarkdownV2(
              ctx.t('msg-submit-event-entry-date-invalid', {
                icon: ICONS.reject,
                date: escapeMarkdownV2Text(getDateFormat()),
              }),
              { link_preview_options: disableLinkPreview },
            );
            continue;
          }
          if (parsed < new Date()) {
            await ctx.replyWithMarkdownV2(
              ctx.t('msg-submit-event-entry-date-future', {
                icon: ICONS.reject,
              }),
              { link_preview_options: disableLinkPreview },
            );
            continue;
          }
          parsedEntryDate = fromZonedTime(parsed, getTimezone());
          break;
        }
      }

      // Startdatum
      while (true) {
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-edit-event-new-startdate', {
            date: escapeMarkdownV2Text(getDateFormat()),
          }),
          {
            reply_markup: new InlineKeyboard().text(
              ctx.t('msg-conversation-cancelled-btn', { icon: ICONS.reject }),
              'cancel_conversation',
            ),
            link_preview_options: disableLinkPreview,
          },
        );
        const startResponse = await conversation.wait();
        if (startResponse.callbackQuery?.data === 'cancel_conversation') {
          await startResponse.answerCallbackQuery();
          return false;
        }
        if (startResponse.message?.text) {
          const parsed = parse(
            startResponse.message.text,
            getDateFormat(),
            new Date(),
            { locale },
          );
          if (isNaN(parsed.getTime())) {
            await ctx.replyWithMarkdownV2(
              ctx.t('msg-submit-event-start-date-invalid', {
                icon: ICONS.reject,
                date: escapeMarkdownV2Text(getDateFormat()),
              }),
              { link_preview_options: disableLinkPreview },
            );
            continue;
          }
          if (parsed < new Date()) {
            await ctx.replyWithMarkdownV2(
              ctx.t('msg-submit-event-start-date-future', {
                icon: ICONS.reject,
              }),
              { link_preview_options: disableLinkPreview },
            );
            continue;
          }
          parsedStartDate = fromZonedTime(parsed, getTimezone());
          if (parsedEntryDate && parsedEntryDate > parsedStartDate) {
            await ctx.replyWithMarkdownV2(
              ctx.t('msg-submit-event-start-date-before-entry', {
                icon: ICONS.reject,
              }),
              { link_preview_options: disableLinkPreview },
            );
            continue;
          }
          break;
        }
      }

      // Enddatum
      while (true) {
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-edit-event-new-enddate', {
            date: escapeMarkdownV2Text(getDateFormat()),
          }),
          {
            reply_markup: new InlineKeyboard().text(
              ctx.t('msg-conversation-cancelled-btn', { icon: ICONS.reject }),
              'cancel_conversation',
            ),
            link_preview_options: disableLinkPreview,
          },
        );
        const endResponse = await conversation.wait();
        if (endResponse.callbackQuery?.data === 'cancel_conversation') {
          await endResponse.answerCallbackQuery();
          return false;
        }
        if (endResponse.message?.text) {
          const parsed = parse(
            endResponse.message.text,
            getDateFormat(),
            new Date(),
            { locale },
          );
          if (isNaN(parsed.getTime())) {
            await ctx.replyWithMarkdownV2(
              ctx.t('msg-submit-event-end-date-invalid', {
                icon: ICONS.reject,
                date: escapeMarkdownV2Text(getDateFormat()),
              }),
              { link_preview_options: disableLinkPreview },
            );
            continue;
          }
          if (parsed < new Date()) {
            await ctx.replyWithMarkdownV2(
              ctx.t('msg-submit-event-end-date-future', { icon: ICONS.reject }),
              { link_preview_options: disableLinkPreview },
            );
            continue;
          }
          parsedEndDate = fromZonedTime(parsed, getTimezone());
          if (parsedStartDate && parsedEndDate <= parsedStartDate) {
            await ctx.replyWithMarkdownV2(
              ctx.t('msg-submit-event-end-date-before-start', {
                icon: ICONS.reject,
              }),
              { link_preview_options: disableLinkPreview },
            );
            continue;
          }
          break;
        }
      }

      if (!parsedEntryDate || !parsedStartDate || !parsedEndDate) {
        console.error('Date parsing failed unexpectedly in collectEventDates');
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-edit-event-dates-error', { icon: ICONS.reject }),
          { link_preview_options: disableLinkPreview },
        );
        return false;
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
          reply_markup: new InlineKeyboard()
            .text(
              ctx.t('msg-submit-event-date-summary-confirm', {
                icon: ICONS.approve,
              }),
              'dates_confirm',
            )
            .text(
              ctx.t('msg-submit-event-date-summary-reset', {
                icon: ICONS.reset,
              }),
              'dates_reset',
            )
            .row()
            .text(
              ctx.t('msg-conversation-cancelled-btn', { icon: ICONS.reject }),
              'cancel_conversation',
            ),
          link_preview_options: disableLinkPreview,
        },
      );

      const confirmResponse = await conversation.waitForCallbackQuery([
        'dates_confirm',
        'dates_reset',
        'cancel_conversation',
      ]);

      if (confirmResponse.callbackQuery.data === 'cancel_conversation') {
        await confirmResponse.answerCallbackQuery();
        return false;
      }

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
      console.error('Error while collecting date information:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-edit-event-dates-error', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
    }
  }
  return false;
}

async function collectEventCategories(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Partial<Event>,
): Promise<boolean> {
  let selectedCategories: string[] = [...(eventData.category || [])];
  let categorySelectionComplete = false;

  if (selectedCategories.length > 0) {
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-edit-event-output-selected-cats', {
        selectedCategories: selectedCategories.join(', '),
      }),
      { link_preview_options: disableLinkPreview },
    );
  }

  await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-new-category'), {
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
            text: ctx.t('msg-edit-event-cat-reset-btn', { icon: ICONS.reset }),
            callback_data: 'cat_reset',
          },
        ],
        [
          {
            text: ctx.t('msg-edit-event-cat-done-btn', { icon: ICONS.approve }),
            callback_data: 'cat_done',
          },
        ],
        [
          {
            text: ctx.t('msg-conversation-cancelled-btn', {
              icon: ICONS.reject,
            }),
            callback_data: 'cancel_conversation',
          },
        ],
      ],
    },
    link_preview_options: disableLinkPreview,
  });

  while (!categorySelectionComplete) {
    const categoryResponse = await conversation.waitForCallbackQuery(
      /^(cat_|cancel_conversation)/,
    );
    if (categoryResponse.callbackQuery.data === 'cancel_conversation') {
      await categoryResponse.answerCallbackQuery();
      return false;
    }
    const selection = categoryResponse.callbackQuery.data.replace('cat_', '');

    if (selection === 'done') {
      if (selectedCategories.length > 0) {
        eventData.category = selectedCategories;
        categorySelectionComplete = true;
        await categoryResponse.answerCallbackQuery(
          ctx.t('msg-submit-event-category-saved', { icon: ICONS.save }),
        );
      } else {
        await categoryResponse.answerCallbackQuery(
          ctx.t('msg-submit-event-category-empty', { icon: ICONS.reject }),
        );
      }
    } else if (selection === 'reset') {
      selectedCategories = [];
      await categoryResponse.answerCallbackQuery(
        ctx.t('msg-submit-event-category-reset', { icon: ICONS.reset }),
      );
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-category-reset', { icon: ICONS.reset }),
        { link_preview_options: disableLinkPreview },
      );
    } else {
      if (!selectedCategories.includes(selection)) {
        if (selectedCategories.length >= getMaxCategories()) {
          await categoryResponse.answerCallbackQuery(
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
            { link_preview_options: disableLinkPreview },
          );
          continue;
        }
        selectedCategories.push(selection);
        await categoryResponse.answerCallbackQuery(
          ctx.t('msg-submit-event-category-added', { category: selection }),
        );
      } else {
        selectedCategories = selectedCategories.filter(
          (cat) => cat !== selection,
        );
        await categoryResponse.answerCallbackQuery(
          ctx.t('msg-submit-event-category-removed', { category: selection }),
        );
      }
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-category-selected', {
          icon: ICONS.category,
          categories: selectedCategories.join(', '),
        }),
        { link_preview_options: disableLinkPreview },
      );
    }
  }
  return true;
}

async function collectEventLinks(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Partial<Event>,
): Promise<boolean> {
  while (true) {
    try {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-links', {
          iconPensil: ICONS.pensil,
          iconTip: ICONS.tip,
        }),
        {
          reply_markup: new InlineKeyboard()
            .text(
              ctx.t('msg-submit-event-links-no-btn', { icon: ICONS.next }),
              'no_links',
            )
            .row()
            .text(
              ctx.t('msg-conversation-cancelled-btn', { icon: ICONS.reject }),
              'cancel_conversation',
            ),
          link_preview_options: disableLinkPreview,
        },
      );
      const response = await conversation.wait();

      if (response.callbackQuery?.data === 'cancel_conversation') {
        await response.answerCallbackQuery();
        return false;
      } else if (response.callbackQuery?.data === 'no_links') {
        await response.answerCallbackQuery();
        eventData.links = [];
        return true;
      } else if (response.message?.text) {
        if (response.message.text.length > 40) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-submit-event-link-too-long', { icon: ICONS.reject }),
            { link_preview_options: disableLinkPreview },
          );
          continue;
        }
        const links = response.message.text.split(' ').slice(0, 1);
        eventData.links = links;
        return true;
      } else {
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-submit-event-links-invalid', { icon: ICONS.reject }),
          { link_preview_options: disableLinkPreview },
        );
      }
    } catch (error) {
      console.error('Error while collecting links:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-links-error', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
    }
  }
  return false;
}

async function collectEventGroupLink(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Partial<Event>,
): Promise<boolean> {
  while (true) {
    try {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-group-link', { icon: ICONS.links }),
        {
          reply_markup: new InlineKeyboard()
            .text(
              ctx.t('msg-submit-event-links-no-btn', { icon: ICONS.next }),
              'no_group_link',
            )
            .row()
            .text(
              ctx.t('msg-conversation-cancelled-btn', { icon: ICONS.reject }),
              'cancel_conversation',
            ),
          link_preview_options: disableLinkPreview,
        },
      );
      const response = await conversation.wait();

      if (response.callbackQuery?.data === 'cancel_conversation') {
        await response.answerCallbackQuery();
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
          { link_preview_options: disableLinkPreview },
        );
      }
    } catch (error) {
      console.error('Error while collecting group link:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-group-link-error', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
    }
  }
  return false;
}

async function collectEventImage(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Partial<Event>,
): Promise<boolean> {
  while (true) {
    try {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-image', { icon: ICONS.image }),
        {
          reply_markup: new InlineKeyboard()
            .text(
              ctx.t('msg-submit-event-image-no-btn', { icon: ICONS.next }),
              'no_image',
            )
            .row()
            .text(
              ctx.t('msg-conversation-cancelled-btn', { icon: ICONS.reject }),
              'cancel_conversation',
            ),
          link_preview_options: disableLinkPreview,
        },
      );
      const imageResponse = await conversation.wait();

      if (imageResponse.callbackQuery?.data === 'cancel_conversation') {
        await imageResponse.answerCallbackQuery();
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
            { link_preview_options: disableLinkPreview },
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
          { link_preview_options: disableLinkPreview },
        );
      }
    } catch (error) {
      console.error('Error while collecting the image:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-submit-event-image-error', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
    }
  }
  return false;
}
