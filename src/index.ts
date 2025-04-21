import { startBot } from './bot';
import { archiveOldEvents } from './jobs/archiveEvents';
import cron from 'node-cron';

startBot();

// cron.schedule('0 0 * * *', () => {
//   // add midnight cron job
//   archiveOldEvents().catch((e) => console.error(e));
// });

// every 5 minutes
// cron.schedule('*/5 * * * *', () => {
//   // add every 5 minutes cron job
//   archiveOldEvents().catch((e) => console.error(e));
// });

// every 15 minutes
cron.schedule('*/15 * * * *', () => {
  // add every 15 minutes cron job
  archiveOldEvents().catch((e) => console.error(e));
});
