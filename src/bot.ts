import { config } from 'dotenv';
config();

import { Bot, GrammyError, InlineKeyboard, session, Context } from 'grammy';
import { autoRetry } from '@grammyjs/auto-retry';
import { run, sequentialize } from '@grammyjs/runner';
import { limit } from '@grammyjs/ratelimiter';
import { I18n } from '@grammyjs/i18n';
import { hydrateReply, parseMode } from '@grammyjs/parse-mode';
import { conversations, createConversation } from '@grammyjs/conversations';

import {
  getTelegramToken,
  getLocale,
  getMaxRetryAttempts,
  getMaxDelaySeconds,
  getRateLimitTimeFrame,
  getRateLimitRequests,
  getSupportEmail,
  getSupportTelegramUser,
} from './constants/constants';
import { submitEventConversation } from './conversations/submitEventConversation';
import { rejectEventConversation } from './conversations/rejectEventConversation';
import { searchEventConversation } from './conversations/searchEventConversation';
import { editEventConversation } from './conversations/editEventConversation';
import { MyContext } from './types/context';
import {
  handleEventApproval,
  handleEventRejection,
} from './services/eventService';
import { ICONS } from './utils/iconUtils';
import { escapeMarkdownV2Text } from './utils/markdownUtils';

export const bot = new Bot<MyContext>(getTelegramToken() || '', {
  client: {
    timeoutSeconds: 500,
  },
});

bot.api.config.use(
  autoRetry({
    maxRetryAttempts: getMaxRetryAttempts(),
    maxDelaySeconds: getMaxDelaySeconds(),
  }),
  parseMode('MarkdownV2'),
);

function getSessionKey(ctx: Context) {
  return ctx.chat?.id.toString();
}

bot.use(sequentialize(getSessionKey));
bot.use(session({ initial: () => ({}), getSessionKey }));

const i18n = new I18n<MyContext>({
  defaultLocale: getLocale() || 'de',
  directory: 'locales',
  localeNegotiator: () => getLocale() || 'de',
});

bot.use(hydrateReply);

bot.use(i18n);

bot.use(
  limit({
    timeFrame: getRateLimitTimeFrame(),
    limit: getRateLimitRequests(),
    onLimitExceeded: async (ctx) => {
      await ctx.replyWithMarkdownV2(
        ctx.t('bot-entry-error-rate-limit-exceeded'),
        {},
      );
    },
    keyGenerator: (ctx) => {
      return ctx.from?.id.toString();
    },
  }),
);

// bot.use(async (ctx, next) => {
//   if (ctx.session.locale) {
//     console.log('Setting locale to', ctx.session.locale);
//     await ctx.i18n.setLocale(ctx.session.locale);
//   }
//   await next();
// });

bot.catch(async (err) => {
  const ctx = err.ctx;
  const e = err.error;

  console.error(`Error in update ${ctx?.update?.update_id}:`, e);

  if (
    !(err.error instanceof GrammyError) ||
    !err.error.toString().includes("Request to 'getUpdates' timed out")
  ) {
    console.error(err);
  }

  if (ctx) {
    try {
      await ctx.replyWithMarkdownV2(
        ctx.t('bot-entry-error-unknown', {
          errorcode: e instanceof GrammyError ? e.error_code : 'unbekannt',
        }),
      );
    } catch (replyError) {
      console.error('Error sending error message to user:', replyError);
    }
  }
});

bot.use(conversations());
bot.use(createConversation(submitEventConversation, 'submitEventConversation'));
bot.use(createConversation(rejectEventConversation, 'rejectEventConversation'));
bot.use(createConversation(searchEventConversation, 'searchEventConversation'));
bot.use(createConversation(editEventConversation, 'editEventConversation'));

// bot.command('language', async (ctx) => {
//   await ctx.replyWithMarkdownV2(ctx.t('bot-entry-choose-language'), {
//     reply_markup: {
//       inline_keyboard: [
//         [
//           {
//             text: ctx.t('bot-entry-language-english'),
//             callback_data: 'set_lang_en',
//           },
//         ],
//         [
//           {
//             text: ctx.t('bot-entry-language-german'),
//             callback_data: 'set_lang_de',
//           },
//         ],
//       ],
//     },
//   });
// });

bot.command('submit', async (ctx) => {
  await ctx.replyWithMarkdownV2(
    ctx.t('bot-entry-submit-event', { icon: ICONS.event }),
    {
      reply_markup: new InlineKeyboard()
        .text(ctx.t('bot-entry-yes', { icon: ICONS.approve }), 'submit_event')
        .text(ctx.t('bot-entry-no', { icon: ICONS.reject }), 'cancel_submit'),
    },
  );
});

bot.command('search', async (ctx) => {
  await ctx.replyWithMarkdownV2(
    ctx.t('bot-entry-search-event', { icon: ICONS.search }),
    {
      reply_markup: new InlineKeyboard().text(
        ctx.t('bot-entry-start-search'),
        'start_search',
      ),
    },
  );
});

bot.command('edit', async (ctx) => {
  await ctx.replyWithMarkdownV2(ctx.t('bot-entry-event-edit-command'), {
    reply_markup: new InlineKeyboard()
      .text(ctx.t('bot-entry-yes', { icon: ICONS.approve }), 'edit_event')
      .text(ctx.t('bot-entry-no', { icon: ICONS.reject }), 'cancel_edit'),
  });
});

bot.command('support', async (ctx) => {
  const supportEmail = getSupportEmail();
  const supportTelegramUser = getSupportTelegramUser();

  const titleIcon = ICONS.info || 'ℹ️';

  let message = ctx.t('msg-support-title', { icon: titleIcon }) + '\n\n';
  message += ctx.t('msg-support-intro') + '\n';

  let contactInfoAdded = false;

  if (supportEmail) {
    const emailIcon = ICONS.email || '📧';
    message +=
      '\n' +
      ctx.t('msg-support-email', {
        icon: emailIcon,
        email: escapeMarkdownV2Text(supportEmail),
      });
    contactInfoAdded = true;
  }

  if (supportTelegramUser) {
    const telegramIcon = ICONS.telegram || '➡️';
    message +=
      '\n' +
      ctx.t('msg-support-telegram', {
        icon: telegramIcon,
        user: escapeMarkdownV2Text(supportTelegramUser),
      });
    contactInfoAdded = true;
  }

  if (!contactInfoAdded) {
    const noContactIcon = ICONS.warning || '⚠️';
    message += '\n' + ctx.t('msg-support-no-contact', { icon: noContactIcon });
  }

  await ctx.replyWithMarkdownV2(message);
});

bot.command('rules', async (ctx) => {
  const icon = ICONS.rules || '📜';
  const notice = ctx.t('msg-rules-notice', { icon });

  await ctx.replyWithMarkdownV2(notice);
});

// bot.callbackQuery(/^set_lang_(en|de)$/, async (ctx) => {
//   const newLocale = ctx.match[1];
//   await ctx.i18n.setLocale(newLocale);
//   ctx.session.locale = newLocale;

//   await ctx.answerCallbackQuery(
//     ctx.t('bot-entry-language-set', {
//       locale:
//         newLocale === 'en'
//           ? ctx.t('bot-entry-language-english')
//           : ctx.t('bot-entry-language-german'),
//     }),
//   );

//   await ctx.replyWithMarkdownV2(
//     ctx.t('bot-entry-language-set', {
//       locale:
//         newLocale === 'en'
//           ? ctx.t('bot-entry-language-english')
//           : ctx.t('bot-entry-language-german'),
//     }),
//   );
// });

bot.callbackQuery('submit_event', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('submitEventConversation');
});

bot.callbackQuery('cancel_submit', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.replyWithMarkdownV2(
    ctx.t('bot-entry-submit-cancelled', { icon: ICONS.reject }),
  );
});

bot.callbackQuery('start_search', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('searchEventConversation');
});

bot.callbackQuery('edit_event', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('editEventConversation');
});

bot.callbackQuery('cancel_edit', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.replyWithMarkdownV2(
    ctx.t('bot-entry-edit-cancelled', { icon: ICONS.reject }),
  );
});

bot.callbackQuery('cancel_conversation', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.replyWithMarkdownV2(ctx.t('msg-conversation-cancelled'));
  console.log('Conversation cancelled');
  return;
});

bot.callbackQuery(/approve_(edit_)?(.+)/, async (ctx) => {
  const eventId = ctx.match[2];
  await handleEventApproval(eventId, ctx);
});

bot.callbackQuery(/reject_(edit_)?(.+)/, async (ctx) => {
  const eventId = ctx.match[2];
  await handleEventRejection(eventId, ctx);
});

// Debugging
// Chat-ID
// bot.on('message', (ctx) => {
//   console.log('Chat-ID:', ctx.chat.id);
// });

// Channel Post
// bot.on('channel_post', (ctx) => {
//   console.log('Channel Post Chat-ID:', ctx.chat.id);
// });

export function startBot() {
  run(bot, {
    runner: {
      fetch: {
        timeout: 30000,
      },
    },
  });
}
