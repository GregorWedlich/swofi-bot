import { EventTemplate, Prisma } from '@prisma/client';
import { prisma } from '../prisma';

export async function saveTemplate(
  templateData: Prisma.EventTemplateCreateInput,
): Promise<EventTemplate> {
  return await prisma.eventTemplate.create({
    data: templateData,
  });
}

export async function getTemplatesByUser(
  userId: bigint,
): Promise<EventTemplate[]> {
  return await prisma.eventTemplate.findMany({
    where: {
      userId: userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getTemplateById(
  templateId: string,
  userId: bigint,
): Promise<EventTemplate | null> {
  return await prisma.eventTemplate.findFirst({
    where: {
      id: templateId,
      userId: userId,
    },
  });
}

export async function updateTemplate(
  templateId: string,
  _userId: bigint,
  templateData: Prisma.EventTemplateUpdateInput,
): Promise<EventTemplate | null> {
  return await prisma.eventTemplate.update({
    where: {
      id: templateId,
    },
    data: templateData,
  });
}

export async function deleteTemplate(
  templateId: string,
): Promise<EventTemplate | null> {
  return await prisma.eventTemplate.delete({
    where: {
      id: templateId,
    },
  });
}

export async function countUserTemplates(userId: bigint): Promise<number> {
  return await prisma.eventTemplate.count({
    where: {
      userId: userId,
    },
  });
}