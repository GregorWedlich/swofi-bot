# AGENTS.md - Code Guidelines for Swofi Bot

## Commands
- **Build**: `pnpm build` (compiles TypeScript to ./dist)
- **Dev**: `pnpm dev` (auto-reload with nodemon and ESLint)
- **Lint**: `npx eslint src/**/*.ts`
- **Database**: `npx prisma migrate dev --name <migration-name>` (create migrations), `npx prisma generate` (after schema changes)
- **Tests**: No test framework configured yet

## Code Style
- **Formatting**: Prettier with semicolons, single quotes, trailing commas, 80-char width (see .prettierrc)
- **TypeScript**: Strict mode enabled, target ES2018, CommonJS modules
- **Imports**: Use absolute paths from src/, group by external libs → constants/models/services → utils
- **Naming**: camelCase for functions/variables, PascalCase for types/classes, UPPER_SNAKE_CASE for constants
- **Error Handling**: Always catch errors in async functions, log with `console.error()`, use try-catch blocks for Telegram API calls
- **Markdown**: Use `escapeMarkdownV2Text()` for all user-provided text, format with MarkdownV2 via `parseMode()`
- **Database**: Always create migrations (`prisma migrate dev`), never use `db push` in production
- **Conversations**: Use grammY conversations API, handle cancellation gracefully, track state by user ID
- **Language**: Code and comments in German (per .github/copilot-instructions.md), variable names in English

## Architecture Notes
- grammY framework with conversations, sessions, rate limiting, i18n (Fluent format in /locales)
- PostgreSQL + Prisma ORM (Event, EventArchive, EventTemplate models)
- Multi-step conversations for event submission/editing/deletion
- Admin approval workflow configurable via EVENTS_REQUIRE_APPROVAL
