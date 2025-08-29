import { EventTemplate, Prisma } from '@prisma/client';
import { MyContext } from '../types/context';
import {
  saveTemplate,
  getTemplatesByUser,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  countUserTemplates,
} from '../models/templateModel';

const MAX_TEMPLATES_PER_USER = 10;

export async function createTemplateFromEvent(
  ctx: MyContext,
  eventData: Prisma.EventCreateInput,
  templateName: string,
): Promise<EventTemplate | null> {
  if (!ctx.from) {
    return null;
  }

  const templateCount = await countUserTemplates(BigInt(ctx.from.id));
  if (templateCount >= MAX_TEMPLATES_PER_USER) {
    await ctx.replyWithMarkdownV2(
      ctx.t('template-error-max-limit', { max: MAX_TEMPLATES_PER_USER }),
    );
    return null;
  }

  const templateData: Prisma.EventTemplateCreateInput = {
    templateName: templateName,
    title: eventData.title,
    description: eventData.description,
    category: eventData.category,
    links: eventData.links,
    groupLink: eventData.groupLink,
    location: eventData.location,
    imageBase64: eventData.imageBase64,
    userId: BigInt(ctx.from.id),
    userName: ctx.from.first_name || ctx.from.username || 'Unknown',
  };

  try {
    const template = await saveTemplate(templateData);
    return template;
  } catch (error) {
    console.error('Error creating template:', error);
    return null;
  }
}

export async function getUserTemplates(
  userId: bigint,
): Promise<EventTemplate[]> {
  return await getTemplatesByUser(userId);
}

export async function loadTemplate(
  templateId: string,
  userId: bigint,
): Promise<EventTemplate | null> {
  return await getTemplateById(templateId, userId);
}

export async function removeTemplate(
  templateId: string,
): Promise<boolean> {
  try {
    await deleteTemplate(templateId);
    return true;
  } catch (error) {
    console.error('Error deleting template:', error);
    return false;
  }
}

export function createEventDataFromTemplate(
  template: EventTemplate,
  ctx: MyContext,
): Partial<Prisma.EventCreateInput> {
  return {
    title: template.title,
    description: template.description,
    category: template.category,
    links: template.links,
    groupLink: template.groupLink,
    location: template.location,
    imageBase64: template.imageBase64,
    submittedById: BigInt(ctx.from?.id || 0),
    submittedBy: ctx.from?.first_name || ctx.from?.username || 'Unknown',
  };
}

export async function updateTemplateFromEvent(
  templateId: string,
  userId: bigint,
  eventData: Prisma.EventCreateInput,
): Promise<EventTemplate | null> {
  const templateUpdateData: Prisma.EventTemplateUpdateInput = {
    title: eventData.title,
    description: eventData.description,
    category: eventData.category,
    links: eventData.links,
    groupLink: eventData.groupLink,
    location: eventData.location,
    imageBase64: eventData.imageBase64,
  };

  try {
    return await updateTemplate(templateId, userId, templateUpdateData);
  } catch (error) {
    console.error('Error updating template:', error);
    return null;
  }
}