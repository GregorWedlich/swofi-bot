import { Event } from '@prisma/client';

import {
  notifyAdminsOfEvent,
  postEventToChannel,
  sendSearchToUser,
  updateEventInChannel,
} from '../services/eventService';
import { MyContext } from '../types/context';

/**
 * Sends the provided event to the administrators for notification.
 *
 * @param event - The event to be sent to the administrators.
 * @param isEdit - Indicates if the event is an edited version.
 * @returns A promise that resolves when the event has been successfully sent to the administrators.
 */
export async function sendEventToAdmins(
  ctx: MyContext,
  event: Event,
  isEdit = false,
) {
  return notifyAdminsOfEvent(ctx, event, isEdit);
}

/**
 * Publishes the provided event to the event channel.
 *
 * @param event - The event to be published.
 * @returns A promise that resolves when the event has been successfully published to the event channel.
 */
export async function publishEvent(ctx: MyContext, event: Event) {
  console.log(
    `Publishing event: ID=${event.id}, status=${event.status}, messageId=${event.messageId}`,
  );
  if (event.status === 'APPROVED') {
    console.log('Calling postEventToChannel');
    return postEventToChannel(ctx, event);
  } else if (event.status === 'EDITED_APPROVED') {
    console.log('Calling updateEventInChannel');
    return updateEventInChannel(ctx, event);
  } else {
    console.warn(`Unhandled event status: ${event.status}`);
  }
}

/**
 * Sends the search results to the user.
 *
 * @param events - The events to be sent to the user.
 * @param dateText - The date text to be sent to the user.
 * @param chatId - The chat ID of the user to send the results to.
 * @returns A promise that resolves when the search results have been successfully sent to the user.
 */
export async function sendSearchResultsToUser(
  ctx: MyContext,
  events: Event[],
  dateText: string,
  chatId: string,
) {
  return sendSearchToUser(events, dateText, chatId, ctx);
}
