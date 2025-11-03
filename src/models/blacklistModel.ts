import { Prisma } from '@prisma/client';

import { prisma } from '../prisma';

/**
 * Adds a user to the blacklist.
 */
export const addToBlacklist = async (
  data: Prisma.BlacklistedUserCreateInput,
) => {
  return await prisma.blacklistedUser.create({
    data,
  });
};

/**
 * Removes a user from the blacklist.
 */
export const removeFromBlacklist = async (userId: bigint) => {
  return await prisma.blacklistedUser.delete({
    where: { userId },
  });
};

/**
 * Checks if a user is blacklisted.
 */
export const isUserBlacklisted = async (userId: bigint): Promise<boolean> => {
  const user = await prisma.blacklistedUser.findUnique({
    where: { userId },
  });
  return user !== null;
};

/**
 * Finds a blacklisted user by their user ID.
 */
export const findBlacklistedUser = async (userId: bigint) => {
  return await prisma.blacklistedUser.findUnique({
    where: { userId },
  });
};

/**
 * Gets all blacklisted users, ordered by ban date (newest first).
 */
export const getAllBlacklistedUsers = async () => {
  return await prisma.blacklistedUser.findMany({
    orderBy: {
      bannedAt: 'desc',
    },
  });
};

/**
 * Gets all unique users who have submitted events.
 */
export const getAllEventSubmitters = async () => {
  const submitters = await prisma.event.findMany({
    distinct: ['submittedById'],
    select: {
      submittedById: true,
      submittedBy: true,
    },
    orderBy: {
      submittedBy: 'asc',
    },
  });

  return submitters;
};
