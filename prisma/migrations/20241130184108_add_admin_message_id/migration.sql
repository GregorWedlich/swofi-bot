/*
  Warnings:

  - Made the column `entryDate` on table `Event` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "adminMessageId" INTEGER,
ALTER COLUMN "entryDate" SET NOT NULL;
