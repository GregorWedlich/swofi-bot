import { Conversation } from '@grammyjs/conversations';
import { InlineKeyboard, InputFile } from 'grammy';
import { parse } from 'date-fns';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { Event } from '@prisma/client';
import { Readable } from 'stream';

import { formatEvent } from '../utils/eventMessageFormatter';

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
} from '../constants/constants';
import { escapeMarkdownV2Text } from '../utils/markdownUtils';

const locale = getLocaleUtil();

export async function editEventConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
) {
  try {
    const userId = ctx.from?.id;

    if (!userId) {
      await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-user-not-found'));
      return;
    }

    const events = await findUserApprovedEvents(userId);

    if (events.length === 0) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-edit-event-no-approved-events-found'),
      );
      return;
    }

    const availableEvents = events.filter((event) => {
      if (getMaxEventEdits() === 0) return true;
      return event.updatedCount < getMaxEventEdits();
    });

    if (availableEvents.length === 0) {
      await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-edit-limit-reached'));
      return;
    }

    const event = await selectEvent(conversation, ctx, availableEvents);
    if (!event) return;

    const eventData = initializeEventData(event);

    await askAndCollectField(
      conversation,
      ctx,
      eventData,
      'title',
      collectEventTitle,
    );
    await askAndCollectField(
      conversation,
      ctx,
      eventData,
      'description',
      collectEventDescription,
    );
    await askAndCollectField(
      conversation,
      ctx,
      eventData,
      'location',
      collectEventLocation,
    );
    await askAndCollectField(
      conversation,
      ctx,
      eventData,
      'date',
      collectEventDates,
    );
    await askAndCollectField(
      conversation,
      ctx,
      eventData,
      'category',
      collectEventCategories,
    );
    await askAndCollectField(
      conversation,
      ctx,
      eventData,
      'links',
      collectEventLinks,
    );
    await askAndCollectField(
      conversation,
      ctx,
      eventData,
      'groupLink',
      collectEventGroupLink,
    );
    await askAndCollectField(
      conversation,
      ctx,
      eventData,
      'imageBase64',
      collectEventImage,
    );

    await summarizeAndSaveEvent(conversation, ctx, event, eventData);
  } catch (error) {
    console.error('Error while editing the event:', error);
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-edit-event-error', { icon: ICONS.reject }),
    );
  }
}

function initializeEventData(event: Event): Partial<Event> {
  return {
    ...event,
    date: event.date || new Date(),
    entryDate: event.entryDate || new Date(),
    endDate: event.endDate || new Date(),
    groupLink: event.groupLink || null,
  };
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
    );
    if (remainingEdits <= 0) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-edit-event-remaining-edits-reached'),
      );
      return null;
    }
  }

  await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-event-data'));

  const messageText = formatEvent(ctx, event, {
    context: 'user',
    isEdit: false,
  });

  if (event.imageBase64) {
    try {
      const imageBuffer = Buffer.from(event.imageBase64, 'base64');
      const stream = Readable.from(imageBuffer);
      await ctx.replyWithPhoto(new InputFile(stream), {
        caption: messageText,
      });
    } catch (error) {
      console.error(`Error while sending image ID=${event.id}:`, error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-edit-event-summary-error-by-sending-image'),
      );
    }
  } else {
    await ctx.replyWithMarkdownV2(messageText);
  }

  return event;
}

async function collectEventTitle(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Partial<Event>,
): Promise<boolean> {
  while (true) {
    try {
      await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-new-title'), {
        reply_markup: new InlineKeyboard()
          .text(
            ctx.t('msg-edit-event-btn-next', { icon: ICONS.next }),
            'skip_question',
          )
          .text(
            ctx.t('msg-edit-event-btn-cancel', { icon: ICONS.reject }),
            'cancel_conversation',
          ),
      });
      const response = await conversation.wait();

      if (response.callbackQuery?.data === 'cancel_conversation') {
        await response.answerCallbackQuery();
        await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-cancelled'));
        return false;
      }

      if (response.callbackQuery?.data === 'skip_question') {
        await response.answerCallbackQuery();
        await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-skipped'));
        return true;
      }

      if (response.message?.text) {
        if (response.message.text.length > 85) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-edit-event-new-title-too-long', {
              icon: ICONS.reject,
            }),
          );
          continue;
        } else {
          eventData.title = response.message.text;
          break;
        }
      }
    } catch (error) {
      console.error('Error while collecting the title:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-edit-event-title-error', { icon: ICONS.reject }),
      );
    }
  }
  return true;
}

async function collectEventDescription(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Partial<Event>,
): Promise<boolean> {
  while (true) {
    try {
      await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-new-description'), {
        reply_markup: new InlineKeyboard()
          .text(
            ctx.t('msg-edit-event-btn-next', { icon: ICONS.next }),
            'skip_question',
          )
          .text(
            ctx.t('msg-edit-event-btn-cancel', { icon: ICONS.reject }),
            'cancel_conversation',
          ),
      });
      const response = await conversation.wait();

      if (response.callbackQuery?.data === 'cancel_conversation') {
        await response.answerCallbackQuery();
        await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-cancelled'));
        return false;
      }

      if (response.callbackQuery?.data === 'skip_question') {
        await response.answerCallbackQuery();
        await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-skipped'));
        return true;
      }

      if (response.message?.text) {
        if (response.message.text.length > 550) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-edit-event-new-description-too-long', {
              icon: ICONS.reject,
            }),
          );
          continue;
        } else {
          eventData.description = response.message.text;
          break;
        }
      }
    } catch (error) {
      console.error('Error while collecting the description:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-edit-event-description-error', { icon: ICONS.reject }),
      );
    }
  }
  return true;
}

async function collectEventLocation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Partial<Event>,
): Promise<boolean> {
  while (true) {
    try {
      await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-new-location'), {
        reply_markup: new InlineKeyboard()
          .text(
            ctx.t('msg-edit-event-btn-next', { icon: ICONS.next }),
            'skip_question',
          )
          .text(
            ctx.t('msg-edit-event-btn-cancel', { icon: ICONS.reject }),
            'cancel_conversation',
          ),
      });
      const response = await conversation.wait();

      if (response.callbackQuery?.data === 'cancel_conversation') {
        await response.answerCallbackQuery();
        await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-cancelled'));
        return false;
      }

      if (response.callbackQuery?.data === 'skip_question') {
        await response.answerCallbackQuery();
        await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-skipped'));
        return true;
      }

      if (response.message?.text) {
        if (response.message.text.length < 3) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-edit-event-new-location-to-short', {
              icon: ICONS.reject,
            }),
          );
          continue;
        } else {
          eventData.location = response.message.text;
          break;
        }
      }
    } catch (error) {
      console.error('Error while collecting the location:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-edit-event-location-error', { icon: ICONS.reject }),
      );
    }
  }
  return true;
}

async function collectEventDates(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Partial<Event>,
): Promise<boolean> {
  while (true) {
    try {
      let parsedEntryDate: Date | null = null;
      let parsedStartDate: Date | null = null;
      let parsedEndDate: Date | null = null;

      while (true) {
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-edit-event-new-entry-date', {
            date: escapeMarkdownV2Text(getDateFormat()),
          }),
          {
            reply_markup: new InlineKeyboard()
              .text(
                ctx.t('msg-edit-event-btn-next', { icon: ICONS.next }),
                'skip_question',
              )
              .text(
                ctx.t('msg-edit-event-btn-cancel', { icon: ICONS.reject }),
                'cancel_conversation',
              ),
          },
        );
        const entryResponse = await conversation.wait();

        if (entryResponse.callbackQuery?.data === 'cancel_conversation') {
          await entryResponse.answerCallbackQuery();
          await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-cancelled'));
          return false;
        }

        if (entryResponse.callbackQuery?.data === 'skip_question') {
          await entryResponse.answerCallbackQuery();
          await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-skipped'));
          return true;
        }

        if (entryResponse.message?.text) {
          const parsedEntryDateInTimeZone = parse(
            entryResponse.message.text,
            getDateFormat(),
            new Date(),
            { locale },
          );

          if (isNaN(parsedEntryDateInTimeZone.getTime())) {
            await ctx.replyWithMarkdownV2(
              ctx.t('msg-edit-event-wrong-date-format', {
                icon: ICONS.reject,
                date: escapeMarkdownV2Text(getDateFormat()),
              }),
            );
            continue;
          }

          if (parsedEntryDateInTimeZone < new Date()) {
            await ctx.replyWithMarkdownV2(
              ctx.t('msg-edit-event-new-entry-date-future', {
                icon: ICONS.reject,
              }),
            );
            continue;
          }

          parsedEntryDate = fromZonedTime(
            parsedEntryDateInTimeZone,
            getTimezone(),
          );
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
            reply_markup: new InlineKeyboard()
              .text(
                ctx.t('msg-edit-event-btn-next', { icon: ICONS.next }),
                'skip_question',
              )
              .text(
                ctx.t('msg-edit-event-btn-cancel', { icon: ICONS.reject }),
                'cancel_conversation',
              ),
          },
        );
        const startResponse = await conversation.wait();

        if (startResponse.callbackQuery?.data === 'cancel_conversation') {
          await startResponse.answerCallbackQuery();
          await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-cancelled'));
          return false;
        }

        if (startResponse.callbackQuery?.data === 'skip_question') {
          await startResponse.answerCallbackQuery();
          await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-skipped'));
          return true;
        }

        if (startResponse.message?.text) {
          const parsedStartDateInTimeZone = parse(
            startResponse.message.text,
            getDateFormat(),
            new Date(),
            { locale },
          );

          if (isNaN(parsedStartDateInTimeZone.getTime())) {
            await ctx.replyWithMarkdownV2(
              ctx.t('msg-edit-event-wrong-date-format', {
                icon: ICONS.reject,
                date: escapeMarkdownV2Text(getDateFormat()),
              }),
            );
            continue;
          }

          if (parsedStartDateInTimeZone < new Date()) {
            await ctx.replyWithMarkdownV2(
              ctx.t('msg-edit-event-new-start-date-future', {
                icon: ICONS.reject,
              }),
            );
            continue;
          }

          parsedStartDate = fromZonedTime(
            parsedStartDateInTimeZone,
            getTimezone(),
          );

          if (parsedEntryDate && parsedEntryDate > parsedStartDate) {
            await ctx.replyWithMarkdownV2(
              ctx.t('msg-edit-event-new-start-after-entry', {
                icon: ICONS.reject,
              }),
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
            reply_markup: new InlineKeyboard()
              .text(
                ctx.t('msg-edit-event-btn-next', { icon: ICONS.next }),
                'skip_question',
              )
              .text(
                ctx.t('msg-edit-event-btn-cancel', { icon: ICONS.reject }),
                'cancel_conversation',
              ),
          },
        );
        const endResponse = await conversation.wait();

        if (endResponse.callbackQuery?.data === 'cancel_conversation') {
          await endResponse.answerCallbackQuery();
          await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-cancelled'));
          return false;
        }

        if (endResponse.callbackQuery?.data === 'skip_question') {
          await endResponse.answerCallbackQuery();
          await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-skipped'));
          return true;
        }

        if (endResponse.message?.text) {
          const parsedEndDateInTimeZone = parse(
            endResponse.message.text,
            getDateFormat(),
            new Date(),
            { locale },
          );

          if (isNaN(parsedEndDateInTimeZone.getTime())) {
            await ctx.replyWithMarkdownV2(
              ctx.t('msg-edit-event-wrong-date-format', {
                icon: ICONS.reject,
                date: escapeMarkdownV2Text(getDateFormat()),
              }),
            );
            continue;
          }

          if (parsedEndDateInTimeZone < new Date()) {
            await ctx.replyWithMarkdownV2(
              ctx.t('msg-edit-event-new-end-date-future', {
                icon: ICONS.reject,
              }),
            );
            continue;
          }

          parsedEndDate = fromZonedTime(parsedEndDateInTimeZone, getTimezone());

          if (parsedStartDate && parsedEndDate <= parsedStartDate) {
            await ctx.replyWithMarkdownV2(
              ctx.t('msg-edit-event-new-end-after-start', {
                icon: ICONS.reject,
              }),
            );
            continue;
          }
          break;
        }
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
        ctx.t('msg-edit-event-dates-summary', {
          icon: ICONS.date,
          entryDate: escapeMarkdownV2Text(formattedEntryDate),
          startDate: escapeMarkdownV2Text(formattedStartDate),
          endDate: escapeMarkdownV2Text(formattedEndDate),
        }),
        {
          reply_markup: new InlineKeyboard()
            .text(
              ctx.t('msg-edit-event-dates-confirmed', {
                icon: ICONS.approve,
              }),
              'dates_confirm',
            )
            .text(
              ctx.t('msg-edit-event-dates-reset', {
                icon: ICONS.reject,
              }),
              'dates_reset',
            ),
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
          ctx.t('msg-edit-event-dates-confirmed', { icon: ICONS.approve }),
        );
        break;
      } else {
        await confirmResponse.answerCallbackQuery(
          ctx.t('msg-edit-event-dates-reset', { icon: ICONS.reject }),
        );
      }
    } catch (error) {
      console.error('Error while collecting date information:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-edit-event-dates-error', { icon: ICONS.reject }),
      );
    }
  }
  return true;
}

async function collectEventCategories(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Partial<Event>,
): Promise<boolean> {
  let selectedCategories: string[] = [];
  let categorySelectionComplete = false;

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
            text: ctx.t('msg-edit-event-cat-reset-btn', {
              icon: ICONS.reset,
            }),
            callback_data: 'cat_reset',
          },
        ],
        [
          {
            text: ctx.t('msg-edit-event-cat-done-btn', {
              icon: ICONS.approve,
            }),
            callback_data: 'cat_done',
          },
        ],
      ],
    },
  });

  while (!categorySelectionComplete) {
    const categoryResponse = await conversation.waitForCallbackQuery(/^cat_/);
    const selection = categoryResponse.callbackQuery.data.replace('cat_', '');

    if (selection === 'done') {
      if (selectedCategories.length > 0) {
        eventData.category = selectedCategories;
        categorySelectionComplete = true;
        await categoryResponse.answerCallbackQuery(
          ctx.t('msg-edit-event-cat-saved'),
        );
      } else {
        await categoryResponse.answerCallbackQuery(
          ctx.t('msg-edit-event-min-cat'),
        );
      }
    } else if (selection === 'reset') {
      selectedCategories = [];
      await categoryResponse.answerCallbackQuery(
        ctx.t('msg-edit-event-cat-reset'),
      );
    } else {
      if (!selectedCategories.includes(selection)) {
        selectedCategories.push(selection);
        await categoryResponse.answerCallbackQuery(
          ctx.t('msg-edit-event-cat-count-selection', { selection }),
        );
      } else {
        selectedCategories = selectedCategories.filter(
          (cat) => cat !== selection,
        );
        await categoryResponse.answerCallbackQuery(
          ctx.t('msg-edit-event-cat-count-deselection', { selection }),
        );
      }
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-edit-event-output-selected-cats', {
          selectedCategories: selectedCategories.join(', '),
        }),
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
  await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-new-links'), {
    reply_markup: new InlineKeyboard()
      .text(
        ctx.t('msg-edit-event-btn-next', { icon: ICONS.next }),
        'skip_question',
      )
      .text(
        ctx.t('msg-edit-event-btn-cancel', { icon: ICONS.reject }),
        'cancel_conversation',
      ),
  });
  const linksResponse = await conversation.wait();

  if (linksResponse.callbackQuery?.data === 'cancel_conversation') {
    await linksResponse.answerCallbackQuery();
    await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-cancelled'));
    return false;
  }

  if (linksResponse.callbackQuery?.data === 'skip_question') {
    await linksResponse.answerCallbackQuery();
    await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-skipped'));
    return true;
  }

  if (linksResponse.message?.text) {
    const linksText = linksResponse.message.text;
    if (linksText.toLowerCase() !== 'no') {
      const links = linksText.split(' ').slice(0, 2);
      eventData.links = links;
    } else {
      eventData.links = [];
    }
  }
  return true;
}

async function collectEventGroupLink(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Partial<Event>,
): Promise<boolean> {
  while (true) {
    try {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-edit-event-new-group-link', { icon: ICONS.links }),
        {
          reply_markup: new InlineKeyboard()
            .text(
              ctx.t('msg-edit-event-btn-next', { icon: ICONS.next }),
              'skip_question',
            )
            .text(
              ctx.t('msg-edit-event-btn-cancel', { icon: ICONS.reject }),
              'cancel_conversation',
            ),
        },
      );
      const response = await conversation.wait();

      if (response.callbackQuery?.data === 'cancel_conversation') {
        await response.answerCallbackQuery();
        await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-cancelled'));
        return false;
      }

      if (response.callbackQuery?.data === 'skip_question') {
        await response.answerCallbackQuery();
        await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-skipped'));
        return true;
      }

      if (response.message?.text) {
        eventData.groupLink = response.message.text;
        break;
      }
    } catch (error) {
      console.error('Error while collecting the group link:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-edit-event-group-link-error', { icon: ICONS.reject }),
      );
    }
  }
  return true;
}

async function collectEventImage(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Partial<Event>,
): Promise<boolean> {
  let validImageInput = false;

  while (!validImageInput) {
    try {
      await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-new-image'), {
        reply_markup: new InlineKeyboard()
          .text(
            ctx.t('msg-edit-event-btn-next', { icon: ICONS.next }),
            'skip_question',
          )
          .text(
            ctx.t('msg-edit-event-btn-cancel', { icon: ICONS.reject }),
            'cancel_conversation',
          ),
      });
      const imageResponse = await conversation.wait();

      if (imageResponse.callbackQuery?.data === 'cancel_conversation') {
        await imageResponse.answerCallbackQuery();
        await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-cancelled'));
        return false;
      }

      if (imageResponse.callbackQuery?.data === 'skip_question') {
        await imageResponse.answerCallbackQuery();
        await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-skipped'));
        return true;
      }

      if (imageResponse.message?.photo) {
        const photo =
          imageResponse.message.photo[imageResponse.message.photo.length - 1];
        const fileId = photo.file_id;
        const file = await ctx.api.getFile(fileId);
        const filePath = file.file_path || '';
        const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${filePath}`;

        const response = await fetch(fileUrl);
        if (!response.ok) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-edit-event-image-download-error'),
          );
          continue;
        }
        const buffer = await response.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');

        eventData.imageBase64 = base64Image;
        validImageInput = true;
      } else if (imageResponse.message?.text?.toLowerCase() === 'no') {
        eventData.imageBase64 = null;
        validImageInput = true;
      } else {
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-edit-event-image-invalid-input'),
        );
      }
    } catch (error) {
      console.error('Error while collecting the image:', error);
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-edit-event-image-error', { icon: ICONS.reject }),
      );
    }
  }
  return true;
}

async function summarizeAndSaveEvent(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  originalEvent: Event,
  updatedEventData: Partial<Event>,
) {
  await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-changes'));

  // if (originalEvent.imageBase64) {
  //   try {
  //     const imageBuffer = Buffer.from(originalEvent.imageBase64, 'base64');
  //     const stream = Readable.from(imageBuffer);
  //     await ctx.replyWithPhoto(new InputFile(stream), {
  //       caption: ctx.t( 'msg-edit-event-summary-event-image'),
  //
  //     });
  //   } catch (error) {
  //     console.error(
  //       `Error by sending image for Event ID=${originalEvent.id}:`,
  //       error,
  //     );
  //     await ctx.replyWithMarkdownV2(
  //       ctx.t( 'msg-edit-event-summary-error-by-sending-image'),
  //     );
  //   }
  // }

  const updatedMessageText = formatEvent(ctx, updatedEventData as Event, {
    context: 'user',
    isEdit: true,
  });

  if (updatedEventData.imageBase64) {
    try {
      const imageBuffer = Buffer.from(updatedEventData.imageBase64, 'base64');
      const stream = Readable.from(imageBuffer);
      await ctx.replyWithPhoto(new InputFile(stream), {
        caption: updatedMessageText,
      });
    } catch (error) {
      console.error(
        `Error by sending image for event ID=${updatedEventData.id}:`,
        error,
      );
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-edit-event-summary-error-by-sending-image'),
      );
    }
  } else {
    await ctx.replyWithMarkdownV2(updatedMessageText);
  }

  await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-summary-save-changes'), {
    reply_markup: new InlineKeyboard()
      .text(
        ctx.t('msg-edit-event-field-yes', { icon: ICONS.approve }),
        'save_changes',
      )
      .text(
        ctx.t('msg-edit-event-field-no', { icon: ICONS.reject }),
        'discard_changes',
      ),
  });

  const saveChanges = await conversation.waitForCallbackQuery([
    'save_changes',
    'discard_changes',
  ]);
  await saveChanges.answerCallbackQuery();

  if (saveChanges.callbackQuery.data === 'save_changes') {
    await updateEvent(originalEvent.id, {
      ...updatedEventData,
      status: getEventsRequireApproval() ? 'EDITED_PENDING' : 'EDITED_APPROVED',
      updatedCount: originalEvent.updatedCount + 1,
    });

    const updatedEventFromDb = (await findEventById(originalEvent.id)) as Event;

    if (getEventsRequireApproval()) {
      await sendEventToAdmins(ctx, updatedEventFromDb, true);
      await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-save-review'));
    } else {
      await publishEvent(ctx, updatedEventFromDb);
      await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-save'));
    }
  } else {
    await ctx.replyWithMarkdownV2(ctx.t('msg-edit-event-changes-reject'));
  }
}

async function askAndCollectField(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  eventData: Partial<Event>,
  fieldName: string,
  collectFunction: (
    conversation: Conversation<MyContext>,
    ctx: MyContext,
    eventData: Partial<Event>,
  ) => Promise<boolean>,
) {
  await ctx.replyWithMarkdownV2(
    ctx.t('msg-edit-event-field-edit', {
      fieldName: ctx.t(`msg-edit-event-field-${fieldName}`),
    }),
    {
      reply_markup: new InlineKeyboard()
        .text(
          ctx.t('msg-edit-event-field-yes', { icon: ICONS.approve }),
          `edit_${fieldName}`,
        )
        .text(
          ctx.t('msg-edit-event-field-no', { icon: ICONS.reject }),
          `skip_${fieldName}`,
        ),
    },
  );

  const response = await conversation.waitForCallbackQuery([
    `edit_${fieldName}`,
    `skip_${fieldName}`,
  ]);

  await response.answerCallbackQuery();

  if (response.callbackQuery.data === `edit_${fieldName}`) {
    const proceed = await collectFunction(conversation, ctx, eventData);
    if (proceed === false) {
      return false;
    }
  }
}
