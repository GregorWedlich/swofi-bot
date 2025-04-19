import { prisma } from '../prisma';

export const archiveOldEvents = async () => {
  const now = new Date();

  const oldEvents = await prisma.event.findMany({
    where: {
      endDate: {
        lt: now,
      },
    },
  });

  for (const event of oldEvents) {
    await prisma.eventArchive.create({
      data: { ...event },
    });

    await prisma.event.delete({
      where: { id: event.id },
    });
  }
};
