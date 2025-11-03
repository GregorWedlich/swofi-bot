-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "pushedAt" TIMESTAMP(3),
ADD COLUMN     "pushedCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EventArchive" ADD COLUMN     "pushedAt" TIMESTAMP(3),
ADD COLUMN     "pushedCount" INTEGER NOT NULL DEFAULT 0;
