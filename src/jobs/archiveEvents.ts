import { prisma } from '../prisma';

export const archiveOldEvents = async () => {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const oldEvents = await prisma.event.findMany({
    where: {
      endDate: {
        lt: twoHoursAgo,
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
