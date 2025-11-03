import { Prisma } from '@prisma/client';

import {
  addToBlacklist,
  removeFromBlacklist,
  isUserBlacklisted,
  findBlacklistedUser,
  getAllBlacklistedUsers,
  getAllEventSubmitters,
} from '../models/blacklistModel';
import { MyContext } from '../types/context';
import { escapeMarkdownV2Text } from '../utils/markdownUtils';
import { ICONS } from '../utils/iconUtils';

const disableLinkPreview = {
  is_disabled: true,
};

/**
 * Bans a user and adds them to the blacklist.
 */
export async function banUser(
  userId: bigint,
  userName: string | undefined,
  bannedBy: bigint | undefined,
  bannedByName: string | undefined,
  reason: string | undefined,
  ctx: MyContext,
): Promise<boolean> {
  try {
    const alreadyBlacklisted = await isUserBlacklisted(userId);

    if (alreadyBlacklisted) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-blacklist-already-banned', {
          icon: ICONS.reject,
          userId: escapeMarkdownV2Text(userId.toString()),
        }),
        { link_preview_options: disableLinkPreview },
      );
      return false;
    }

    const blacklistData: Prisma.BlacklistedUserCreateInput = {
      userId,
      userName: userName || null,
      bannedBy: bannedBy || null,
      bannedByName: bannedByName || null,
      reason: reason || null,
    };

    await addToBlacklist(blacklistData);

    await ctx.replyWithMarkdownV2(
      ctx.t('msg-blacklist-user-banned', {
        icon: ICONS.approve,
        userId: escapeMarkdownV2Text(userId.toString()),
        userName: userName
          ? escapeMarkdownV2Text(userName)
          : ctx.t('msg-blacklist-unknown-user'),
      }),
      { link_preview_options: disableLinkPreview },
    );

    console.log(
      `User banned: userId=${userId}, userName=${userName}, bannedBy=${bannedBy}`,
    );
    return true;
  } catch (error) {
    console.error(`Error banning user ${userId}:`, error);
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-blacklist-ban-error', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
    return false;
  }
}

/**
 * Unbans a user and removes them from the blacklist.
 */
export async function unbanUser(
  userId: bigint,
  ctx: MyContext,
): Promise<boolean> {
  try {
    const blacklistedUser = await findBlacklistedUser(userId);

    if (!blacklistedUser) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-blacklist-not-found', {
          icon: ICONS.reject,
          userId: escapeMarkdownV2Text(userId.toString()),
        }),
        { link_preview_options: disableLinkPreview },
      );
      return false;
    }

    await removeFromBlacklist(userId);

    await ctx.replyWithMarkdownV2(
      ctx.t('msg-blacklist-user-unbanned', {
        icon: ICONS.approve,
        userId: escapeMarkdownV2Text(userId.toString()),
        userName: blacklistedUser.userName
          ? escapeMarkdownV2Text(blacklistedUser.userName)
          : ctx.t('msg-blacklist-unknown-user'),
      }),
      { link_preview_options: disableLinkPreview },
    );

    console.log(`User unbanned: userId=${userId}`);
    return true;
  } catch (error) {
    console.error(`Error unbanning user ${userId}:`, error);
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-blacklist-unban-error', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
    return false;
  }
}

/**
 * Lists all blacklisted users.
 */
export async function listBlacklistedUsers(ctx: MyContext): Promise<void> {
  try {
    const blacklistedUsers = await getAllBlacklistedUsers();

    if (blacklistedUsers.length === 0) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-blacklist-empty', { icon: ICONS.approve }),
        { link_preview_options: disableLinkPreview },
      );
      return;
    }

    let message = ctx.t('msg-blacklist-header', {
      icon: ICONS.reject,
      count: escapeMarkdownV2Text(blacklistedUsers.length.toString()),
    });
    message += '\n\n';

    for (const user of blacklistedUsers) {
      const userId = escapeMarkdownV2Text(user.userId.toString());
      const userName = user.userName
        ? escapeMarkdownV2Text(user.userName)
        : ctx.t('msg-blacklist-unknown-user');
      const bannedAt = escapeMarkdownV2Text(
        user.bannedAt.toLocaleString('de-DE'),
      );
      const bannedByName = user.bannedByName
        ? escapeMarkdownV2Text(user.bannedByName)
        : ctx.t('msg-blacklist-unknown-admin');
      const reason = user.reason
        ? escapeMarkdownV2Text(user.reason)
        : ctx.t('msg-blacklist-no-reason');

      message += ctx.t('msg-blacklist-entry', {
        userId,
        userName,
        bannedAt,
        bannedByName,
        reason,
      });
      message += '\n\n';
    }

    await ctx.replyWithMarkdownV2(message, {
      link_preview_options: disableLinkPreview,
    });
  } catch (error) {
    console.error('Error listing blacklisted users:', error);
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-blacklist-list-error', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
  }
}

/**
 * Lists all users who have submitted events.
 */
export async function listAllEventUsers(ctx: MyContext): Promise<void> {
  try {
    const submitters = await getAllEventSubmitters();

    if (submitters.length === 0) {
      await ctx.replyWithMarkdownV2(
        ctx.t('msg-blacklist-no-users', { icon: ICONS.reject }),
        { link_preview_options: disableLinkPreview },
      );
      return;
    }

    let message = ctx.t('msg-blacklist-users-header', {
      icon: ICONS.approve,
      count: escapeMarkdownV2Text(submitters.length.toString()),
    });
    message += '\n\n';

    for (const submitter of submitters) {
      const userId = escapeMarkdownV2Text(submitter.submittedById.toString());
      const userName = escapeMarkdownV2Text(submitter.submittedBy);

      message += ctx.t('msg-blacklist-user-entry', {
        userId,
        userName,
      });
      message += '\n';
    }

    await ctx.replyWithMarkdownV2(message, {
      link_preview_options: disableLinkPreview,
    });
  } catch (error) {
    console.error('Error listing event users:', error);
    await ctx.replyWithMarkdownV2(
      ctx.t('msg-blacklist-users-list-error', { icon: ICONS.reject }),
      { link_preview_options: disableLinkPreview },
    );
  }
}

/**
 * Checks if a user is blacklisted and returns the blacklist entry if found.
 */
export async function checkUserBlacklist(userId: bigint) {
  const isBlacklisted = await isUserBlacklisted(userId);
  if (isBlacklisted) {
    return await findBlacklistedUser(userId);
  }
  return null;
}
