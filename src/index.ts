import { startBot } from './bot';
import { archiveOldEvents } from './jobs/archiveEvents';
import cron from 'node-cron';

startBot();

cron.schedule('0 0 * * *', () => {
  archiveOldEvents().catch((e) => console.error(e));
});
