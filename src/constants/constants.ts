import * as path from 'path';

export function getAdminChatId(): string {
  return process.env.ADMIN_CHAT_ID || '';
}

export function getChannelUsername(): string {
  return process.env.CHANNEL_CHAT_ID || '';
}

export function getTelegramToken(): string {
  return process.env.TELEGRAM_TOKEN || '';
}

export function getTimezone(): string {
  return process.env.TIMEZONE || 'UTC';
}

export function getDateFormat(): string {
  // Standard auf deutsches Format mit Zeit geändert
  return process.env.DATE_FORMAT || 'dd.MM.yyyy HH:mm';
}

export function getDateOnlyFormat(): string {
  // Standard auf deutsches Format geändert
  return process.env.DATE_ONLY_FORMAT || 'dd.MM.yyyy';
}

export function getLocale(): string {
  return process.env.LOCALE || 'en';
}

export function getMaxEventEdits(): number {
  return parseInt(process.env.MAX_EVENT_EDITS || '0', 10);
}

export function getEventsRequireApproval(): boolean {
  return process.env.EVENTS_REQUIRE_APPROVAL === 'true';
}

export function getMaxRetryAttempts(): number {
  return parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10);
}

export function getMaxDelaySeconds(): number {
  return parseInt(process.env.MAX_DELAY_SECONDS || '60', 10);
}

export function getRateLimitTimeFrame(): number {
  return parseInt(process.env.RATE_LIMIT_TIME_FRAME || '5000', 10);
}

export function getRateLimitRequests(): number {
  return parseInt(process.env.RATE_LIMIT_REQUESTS || '5', 10);
}

export function getMaxCategories(): number {
  return parseInt(process.env.MAX_CATEGORIES || '3', 10);
}

export function getArchiveCron(): string {
  return process.env.ARCHIVE_CRON || '0 0 * * *';
}

export function getSupportEmail(): string | undefined {
  return process.env.SUPPORT_EMAIL || undefined;
}

export function getSupportTelegramUser(): string | undefined {
  return process.env.SUPPORT_TELEGRAM_USER || undefined;
}

export function getRules(): string | undefined {
  return process.env.RULES || undefined;
}

export function getPushMinAgeDays(): number {
  return parseInt(process.env.PUSH_MIN_AGE_DAYS || '7', 10);
}

export function getPlaceholderImagePath(): string {
  return path.join(__dirname, '../../swofi.png');
}
