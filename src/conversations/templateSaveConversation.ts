import type { Conversation } from '@grammyjs/conversations';
import { MyContext } from '../types/context';
import { ICONS } from '../utils/iconUtils';
import { createTemplateFromEvent } from '../services/templateService';
import { escapeMarkdownV2Text } from '../utils/markdownUtils';
import { createCancelKeyboard } from '../utils/keyboardUtils';
import { templateSaveStorage } from './submitEventConversation';

const disableLinkPreview = {
  is_disabled: true,
};

export async function templateSaveConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
) {

  const userId = ctx.from?.id?.toString();
  if (!userId) {
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-template-save-error', { icon: ICONS.reject }),
      {
        link_preview_options: disableLinkPreview,
      },
    );
    return;
  }


  const eventData = templateSaveStorage.get(userId);

  if (!eventData) {
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-template-save-error', { icon: ICONS.reject }),
      {
        link_preview_options: disableLinkPreview,
      },
    );
    return;
  }


  try {
    // Ask for template name
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-template-name-prompt', { icon: ICONS.pensil }),
      {
        reply_markup: createCancelKeyboard(ctx),
        link_preview_options: disableLinkPreview,
      },
    );

    const nameResponse = await conversation.wait();

    if (nameResponse.callbackQuery?.data === 'cancel_conversation') {
      await nameResponse.answerCallbackQuery();
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-template-save-cancelled', { icon: ICONS.reject }),
        {
          link_preview_options: disableLinkPreview,
        },
      );
      return;
    }

    if (nameResponse.message?.text) {
      const templateName = nameResponse.message.text.slice(0, 50);

      const template = await createTemplateFromEvent(
        ctx,
        eventData,
        templateName,
      );

      if (template) {
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-template-saved-success', {
            icon: ICONS.approve,
            name: escapeMarkdownV2Text(templateName),
          }),
          {
            link_preview_options: disableLinkPreview,
          },
        );
      } else {
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-template-save-error', { icon: ICONS.reject }),
          {
            link_preview_options: disableLinkPreview,
          },
        );
      }
    }

    // Clear the global storage data
    templateSaveStorage.delete(userId);
  } catch (error) {
    console.error('Error in template save conversation:', error);
    // Clean up global storage even in error case
    if (userId) {
      templateSaveStorage.delete(userId);
      console.log(
        'DEBUG: Cleaned up global storage after error for user:',
        userId,
      );
    }
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-template-save-error', { icon: ICONS.reject }),
      {
        link_preview_options: disableLinkPreview,
      },
    );
  }
}
