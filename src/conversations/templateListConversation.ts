import { Conversation } from '@grammyjs/conversations';
import { InlineKeyboard } from 'grammy';
import { EventTemplate } from '@prisma/client';
import { MyContext } from '../types/context';
import { ICONS } from '../utils/iconUtils';
import { getUserTemplates, removeTemplate } from '../services/templateService';
import { escapeMarkdownV2Text } from '../utils/markdownUtils';

const disableLinkPreview = {
  is_disabled: true,
};

export async function templateListConversation(
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

  const templates = await getUserTemplates(BigInt(ctx.from.id));

  if (templates.length === 0) {
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-no-templates-found', { icon: ICONS.info }),
      { link_preview_options: disableLinkPreview },
    );
    return;
  }

  await ctx.replyWithMarkdownV2(
    ctx.t('msg-template-list-header', {
      icon: ICONS.list,
      count: templates.length,
    }),
    { link_preview_options: disableLinkPreview },
  );

  // Create inline keyboard with template buttons
  const keyboard = new InlineKeyboard();
  templates.forEach((template, index) => {
    keyboard
      .text(
        `${index + 1}. ${template.templateName}`,
        `view_template_${template.id}`,
      )
      .row();
  });
  keyboard.text(
    ctx.t('msg-template-list-cancel', { icon: ICONS.reject }),
    'cancel_template_list',
  );

  await ctx.replyWithMarkdownV2(
    ctx.t('msg-template-select-prompt', { icon: ICONS.pensil }),
    {
      reply_markup: keyboard,
      link_preview_options: disableLinkPreview,
    },
  );

  const response = await conversation.wait();

  if (response.callbackQuery?.data === 'cancel_template_list') {
    await response.answerCallbackQuery();
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-template-list-cancelled', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
    return;
  }

  if (response.callbackQuery?.data?.startsWith('view_template_')) {
    await response.answerCallbackQuery();
    const templateId = response.callbackQuery.data.replace('view_template_', '');
    const template = templates.find((t) => t.id === templateId);

    if (!template) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-template-not-found', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
      return;
    }

    // Display template details
    await displayTemplateDetails(ctx, template);

    // Ask what to do with the template
    const actionKeyboard = new InlineKeyboard()
      .text(
        ctx.t('msg-template-use-btn', { icon: ICONS.approve }),
        `use_template_${template.id}`,
      )
      .text(
        ctx.t('msg-template-delete-btn', { icon: ICONS.delete }),
        `delete_template_${template.id}`,
      )
      .row()
      .text(
        ctx.t('msg-template-back-btn', { icon: ICONS.back }),
        'back_to_list',
      );

    await ctx.replyWithMarkdownV2(
      ctx.t('msg-template-action-prompt', { icon: ICONS.pensil }),
      {
        reply_markup: actionKeyboard,
        link_preview_options: disableLinkPreview,
      },
    );

    const actionResponse = await conversation.wait();

    if (actionResponse.callbackQuery?.data?.startsWith('use_template_')) {
      await actionResponse.answerCallbackQuery();
      const templateId = actionResponse.callbackQuery.data.replace('use_template_', '');
      
      // Store template ID in session for the templateUseConversation
      ctx.session.templateId = templateId;
      
      // Exit this conversation and the bot handler will start templateUseConversation
      // We need to return from this function but the bot handler needs to be triggered
      
      // Start the templateUseConversation manually by importing and calling it
      const { templateUseConversation } = await import('./templateUseConversation');
      await templateUseConversation(conversation, ctx);
      return;
    } else if (
      actionResponse.callbackQuery?.data === `delete_template_${template.id}`
    ) {
      await actionResponse.answerCallbackQuery();

      // Confirm deletion
      const confirmKeyboard = new InlineKeyboard()
        .text(
          ctx.t('msg-template-confirm-delete', { icon: ICONS.warning }),
          'confirm_delete',
        )
        .text(
          ctx.t('msg-template-cancel-delete', { icon: ICONS.reject }),
          'cancel_delete',
        );

      await ctx.replyWithMarkdownV2(
        ctx.t('msg-template-delete-confirm', {
          icon: ICONS.warning,
          name: escapeMarkdownV2Text(template.templateName),
        }),
        {
          reply_markup: confirmKeyboard,
          link_preview_options: disableLinkPreview,
        },
      );

      const confirmResponse = await conversation.wait();

      if (confirmResponse.callbackQuery?.data === 'confirm_delete') {
        await confirmResponse.answerCallbackQuery();
        const deleted = await removeTemplate(template.id);

        if (deleted) {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-template-deleted', {
              icon: ICONS.approve,
              name: escapeMarkdownV2Text(template.templateName),
            }),
            { link_preview_options: disableLinkPreview },
          );
        } else {
          await ctx.replyWithMarkdownV2(
            ctx.t('msg-template-delete-error', { icon: ICONS.reject }),
            { link_preview_options: disableLinkPreview },
          );
        }
      } else if (confirmResponse.callbackQuery?.data === 'cancel_delete') {
        await confirmResponse.answerCallbackQuery();
        await ctx.replyWithMarkdownV2(
          ctx.t('msg-template-delete-cancelled', { icon: ICONS.info }),
          { link_preview_options: disableLinkPreview },
        );
      }
    } else if (actionResponse.callbackQuery?.data === 'back_to_list') {
      await actionResponse.answerCallbackQuery();
      // Restart the conversation to show the list again
      await ctx.conversation.reenter('templateListConversation');
    }
  }
}

async function displayTemplateDetails(ctx: MyContext, template: EventTemplate) {
  let message = ctx.t('msg-template-details-header', {
    icon: ICONS.info,
    name: escapeMarkdownV2Text(template.templateName),
  });

  message += '\n\n';
  message += ctx.t('msg-template-detail-title', {
    icon: ICONS.event,
    title: escapeMarkdownV2Text(template.title),
  });

  message += '\n';
  message += ctx.t('msg-template-detail-description', {
    icon: ICONS.description,
    description: escapeMarkdownV2Text(
      template.description.substring(0, 200) +
        (template.description.length > 200 ? '...' : ''),
    ),
  });

  message += '\n';
  message += ctx.t('msg-template-detail-location', {
    icon: ICONS.location,
    location: escapeMarkdownV2Text(template.location),
  });

  if (template.category && template.category.length > 0) {
    message += '\n';
    message += ctx.t('msg-template-detail-categories', {
      icon: ICONS.category,
      categories: escapeMarkdownV2Text(template.category.join(', ')),
    });
  }

  if (template.links && template.links.length > 0) {
    message += '\n';
    message += ctx.t('msg-template-detail-links', {
      icon: ICONS.links,
      count: template.links.length,
    });
  }

  if (template.groupLink) {
    message += '\n';
    message += ctx.t('msg-template-detail-has-group-link', {
      icon: ICONS.group,
    });
  }

  if (template.imageBase64) {
    message += '\n';
    message += ctx.t('msg-template-detail-has-image', {
      icon: ICONS.image,
    });
  }

  await ctx.replyWithMarkdownV2(message, {
    link_preview_options: disableLinkPreview,
  });
}