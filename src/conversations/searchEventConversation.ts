import { Conversation } from '@grammyjs/conversations';
import { InlineKeyboard } from 'grammy';
import { addDays, parse } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

import { findEventsForDay } from '../models/eventModel';
import { sendSearchToUser } from '../services/eventService';
import { MyContext } from '../types/context';
import { getDateOnlyFormat, getTimezone } from '../constants/constants';
import { ICONS } from '../utils/iconUtils';
import { getLocaleUtil } from '../utils/localeUtils';
import { escapeMarkdownV2Text } from '../utils/markdownUtils';

const locale = getLocaleUtil();

const disableLinkPreview = {
  is_disabled: true,
};

export async function searchEventConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
) {
  try {
    const choice = await showSearchOptions(conversation, ctx);
    if (!choice || choice === 'search_exit') return;

    await handleSearchChoice(conversation, ctx, choice);
  } catch (error) {
    console.error('Error searching for events:', error);
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-search-event-error', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
  }
}

async function showSearchOptions(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
): Promise<string | null> {
  try {
    const searchKeyboard = new InlineKeyboard()
      .text(
        ctx.t('msg-search-event-btn-today', { icon: ICONS.date }),
        'search_today',
      )
      .row()
      .text(
        ctx.t('msg-search-event-btn-tomorrow', { icon: ICONS.date }),
        'search_tomorrow',
      )
      .row()
      .text(
        ctx.t('msg-search-event-btn-specific', { icon: ICONS.date }),
        'search_specific',
      )
      .row()
      .text(
        ctx.t('msg-search-event-btn-exit', { icon: ICONS.reject }),
        'search_exit',
      );

    const searchMessage = await ctx.replyWithMarkdownV2(
      ctx.t('msg-search-event-title', { icon: ICONS.search }),
      {
        reply_markup: searchKeyboard,
        link_preview_options: disableLinkPreview,
      },
    );

    const response = await conversation.waitForCallbackQuery(
      /^(search_today|search_tomorrow|search_specific|search_exit)$/,
    );

    await ctx.api.editMessageReplyMarkup(
      ctx.chat!.id,
      searchMessage.message_id,
      undefined,
    );

    await response.answerCallbackQuery();

    if (response.callbackQuery.data === 'search_exit') {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-search-event-exit', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
      return null;
    }

    return response.callbackQuery.data;
  } catch (error) {
    console.error('Error displaying search options:', error);
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-search-event-options-error', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
    return null;
  }
}

async function handleSearchChoice(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  choice: string,
) {
  try {
    switch (choice) {
      case 'search_today':
        await handleTodaySearch(ctx);
        break;
      case 'search_tomorrow':
        await handleTomorrowSearch(ctx);
        break;
      case 'search_specific':
        await handleSpecificDateSearch(conversation, ctx);
        break;
      default:
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-search-event-invalid-choice', { icon: ICONS.reject }),
          { link_preview_options: disableLinkPreview },
        );
        break;
    }
  } catch (error) {
    console.error('Error processing search choice:', error);
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-search-event-choice-error', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
  }
}

async function handleTodaySearch(ctx: MyContext) {
  try {
    const today = toZonedTime(new Date(), getTimezone());
    const events = await findEventsForDay(today);
    await sendSearchToUser(
      events,
      ctx.t('msg-search-event-btn-today', { icon: ICONS.date }),
      ctx.chat!.id.toString(),
      ctx,
    );
  } catch (error) {
    console.error('Error searching for todays events:', error);
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-search-event-today-error', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
  }
}

async function handleTomorrowSearch(ctx: MyContext) {
  try {
    const tomorrow = addDays(toZonedTime(new Date(), getTimezone()), 1);
    const events = await findEventsForDay(tomorrow);
    await sendSearchToUser(
      events,
      ctx.t('msg-search-event-btn-tomorrow', { icon: ICONS.date }),
      ctx.chat!.id.toString(),
      ctx,
    );
  } catch (error) {
    console.error("Error searching for tomorrow's events:", error);
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-search-event-tomorrow-error', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
  }
}

async function handleSpecificDateSearch(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
) {
  let validDate = false;
  let searchDate: Date | null = null;
  let dateText: string = '';

  while (!validDate) {
    const dateKeyboard = new InlineKeyboard().text(
      ctx.t('msg-search-event-btn-cancel', { icon: ICONS.reject }),
      'cancel_date_search',
    );

    await ctx.replyWithMarkdownV2(
      ctx.t('msg-search-event-date-format', {
        icon: ICONS.date,
        format: escapeMarkdownV2Text(getDateOnlyFormat()),
      }),
      {
        reply_markup: dateKeyboard,
        link_preview_options: disableLinkPreview,
      },
    );

    const dateResponse = await conversation.waitFor([
      'message:text',
      'callback_query:data',
    ]);

    if (dateResponse.callbackQuery?.data === 'cancel_date_search') {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-search-event-cancel', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
      return;
    }

    dateText = dateResponse.message?.text || '';

    const parsedDateInTimeZone = parse(
      dateText,
      getDateOnlyFormat(),
      new Date(),
      {
        locale,
      },
    );

    if (isNaN(parsedDateInTimeZone.getTime())) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-search-event-date-invalid', {
          icon: ICONS.reject,
          format: escapeMarkdownV2Text(getDateOnlyFormat()),
        }),
        { link_preview_options: disableLinkPreview },
      );
      continue;
    }

    searchDate = fromZonedTime(parsedDateInTimeZone, getTimezone());

    validDate = true;
  }

  if (searchDate !== null) {
    const events = await findEventsForDay(searchDate);
    await sendSearchToUser(events, dateText, ctx.chat!.id.toString(), ctx);
    return;
  }
}
