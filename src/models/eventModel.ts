import { Prisma } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

import { prisma } from '../prisma';
import { getTimezone } from '../constants/constants';

/**
 * Finds an event by its ID.
 */
export const findEventById = async (eventId: string) => {
  return await prisma.event.findUnique({
    where: { id: eventId },
  });
};

/**
 * Approves a new event and sets the status to 'APPROVED'.
 */
export const approveEvent = async (eventId: string) => {
  return await prisma.event.update({
    where: { id: eventId },
    data: { status: 'APPROVED' },
  });
};

/**
 * Approves an edited event and sets the status to 'EDITED_APPROVED'.
 */
export const approveEditedEvent = async (eventId: string) => {
  return await prisma.event.update({
    where: { id: eventId },
    data: { status: 'EDITED_APPROVED' },
  });
};

/**
 * Rejects an event and sets the status to 'REJECTED' with a rejection reason.
 */
export const rejectEvent = async (eventId: string, reason: string) => {
  return await prisma.event.update({
    where: { id: eventId },
    data: { status: 'REJECTED', rejectionReason: reason },
  });
};

/**
 * Saves a new event to the database.
 */
export const saveEvent = async (eventData: Prisma.EventCreateInput) => {
  return prisma.event.create({ data: eventData });
};

/**
 * Updates an existing event.
 */
export const updateEvent = async (
  id: string,
  data: Prisma.EventUpdateInput,
) => {
  return prisma.event.update({
    where: { id },
    data,
  });
};

/**
 * Deletes an event by its ID.
 */
export const deleteEventById = async (eventId: string) => {
  return await prisma.event.delete({
    where: { id: eventId },
  });
};

/**
 * Finds all events for a specific day that are approved.
 * Considers both 'APPROVED' and 'EDITED_APPROVED' statuses.
 * Shows events until 2 hours after their end time.
 */
export const findEventsForDay = async (searchDate: Date) => {
  const timezone = getTimezone();
  const currentTime = new Date();
  const currentTimeMinus2Hours = new Date(
    currentTime.getTime() - 2 * 60 * 60 * 1000,
  );
  const zonedDate = toZonedTime(searchDate, timezone);

  const startOfDayInTimeZone = startOfDay(zonedDate);
  const endOfDayInTimeZone = endOfDay(zonedDate);

  const startOfDayUTC = fromZonedTime(startOfDayInTimeZone, timezone);
  const endOfDayUTC = fromZonedTime(endOfDayInTimeZone, timezone);

  return prisma.event.findMany({
    where: {
      AND: [
        {
          date: {
            lte: endOfDayUTC,
          },
        },
        {
          endDate: {
            gte: startOfDayUTC,
          },
        },
        {
          endDate: {
            gte: currentTimeMinus2Hours,
          },
        },
        {
          status: {
            in: ['APPROVED', 'EDITED_APPROVED'],
          },
        },
      ],
    },
    orderBy: {
      date: 'asc',
    },
  });
};

/**
 * Find all approved events for a specific user in the future.
 */
export const findUserApprovedEvents = async (userId: number) => {
  return prisma.event.findMany({
    where: {
      submittedById: BigInt(userId),
      status: {
        in: ['APPROVED', 'EDITED_APPROVED'],
      },
      date: {
        gte: new Date(),
      },
    },
  });
};
