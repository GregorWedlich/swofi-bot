import { Event } from '@prisma/client';
import { formatInTimeZone } from 'date-fns-tz';
import { getLocaleUtil } from '../utils/localeUtils';
import { ICONS } from '../utils/iconUtils';
import { escapeMarkdownV2Text } from '../utils/markdownUtils';
import {
  getTimezone,
  getDateFormat,
  getMaxEventEdits,
} from '../constants/constants';
import { MyContext } from '../types/context';

const locale = getLocaleUtil();

interface FormatEventOptions {
  context: 'admin' | 'channel' | 'user' | 'summary';
  isEdit?: boolean;
  index?: number;
  total?: number;
  dateText?: string;
  includeIndex?: boolean;
}

export function formatEvent(
  ctx: MyContext,
  event: Event,
  options: FormatEventOptions,
): string {
  const {
    context,
    isEdit = false,
    index = 0,
    total = 0,
    dateText = '',
    includeIndex = false,
  } = options;

  const messageLines: string[] = [];

  if (context === 'admin') {
    messageLines.push(
      ctx.t(
        isEdit
          ? 'msg-format-edited-event-for-review'
          : 'msg-format-new-event-submitted',
        {
          icon: isEdit ? ICONS.edit : ICONS.announcement,
        },
      ),
    );
    messageLines.push(
      ctx.t('msg-format-submitted-by', {
        icon: ICONS.by,
        submittedBy: escapeMarkdownV2Text(event.submittedBy),
      }),
    );
  } else if (context === 'user' && includeIndex) {
    messageLines.push(
      ctx.t('msg-format-event-index', {
        icon: ICONS.date,
        index: index + 1,
        total,
      }),
    );
  }

  messageLines.push(
    ctx.t('msg-format-event-title', {
      icon: ICONS.announcement,
      title: escapeMarkdownV2Text(event.title),
    }),
    '',
  );

  if (event.location) {
    messageLines.push(
      ctx.t('msg-format-event-location', {
        icon: ICONS.location,
        location: escapeMarkdownV2Text(event.location),
      }),
      '',
    );
  }

  if (event.category && event.category.length > 0) {
    messageLines.push(
      ctx.t('msg-format-event-category', {
        icon: ICONS.category,
        category: event.category.join(', '),
      }),
      '',
    );
  }

  const formatedEntryDate = formatInTimeZone(
    event.entryDate,
    getTimezone(),
    getDateFormat(),
    { locale },
  );
  const formattedStartDate = formatInTimeZone(
    event.date,
    getTimezone(),
    getDateFormat(),
    { locale },
  );
  const formattedEndDate = formatInTimeZone(
    event.endDate,
    getTimezone(),
    getDateFormat(),
    { locale },
  );

  messageLines.push(
    ctx.t('msg-format-event-entry-date', {
      icon: ICONS.date,
      entryDate: escapeMarkdownV2Text(formatedEntryDate),
    }),
    ctx.t('msg-format-event-start', {
      icon: ICONS.date,
      start: escapeMarkdownV2Text(formattedStartDate),
    }),
    ctx.t('msg-format-event-end', {
      icon: ICONS.date,
      end: escapeMarkdownV2Text(formattedEndDate),
    }),
    '',
  );

  if (event.description) {
    messageLines.push(
      ctx.t('msg-format-event-description', {
        icon: ICONS.description,
        description: escapeMarkdownV2Text(event.description),
      }),
      '',
    );
  }

  if (event.links && event.links.length > 0) {
    const linksText = event.links
      .map((link: string) => escapeMarkdownV2Text(link))
      .join('\n\n');
    messageLines.push(
      ctx.t('msg-format-event-links', {
        icon: ICONS.links,
        links: linksText,
      }),
      '',
    );
  }

  if (event.groupLink) {
    messageLines.push(
      ctx.t('msg-format-event-group-link', {
        icon: ICONS.group,
        groupLink: escapeMarkdownV2Text(event.groupLink),
      }),
      '',
    );
  }

  if (event.updatedCount > 0) {
    const formattedUpdatedAt = formatInTimeZone(
      event.updatedAt,
      getTimezone(),
      getDateFormat(),
      { locale },
    );

    messageLines.push(
      ctx.t('msg-format-event-updated-count', {
        icon: ICONS.update,
        updatedCount: event.updatedCount,
        totalCount: getMaxEventEdits(),
        updatedAt: escapeMarkdownV2Text(formattedUpdatedAt),
      }),
    );
  }

  if (context === 'user' && dateText) {
    messageLines.unshift(
      ctx.t('msg-format-event-for-day', {
        date: escapeMarkdownV2Text(dateText),
      }),
    );
  }

  return messageLines.join('\n');
  return '*Blub*\\.';
}
