/*
  Warnings:

  - You are about to drop the column `fileId` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `fileName` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `fileUrl` on the `Event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "fileId",
DROP COLUMN "fileName",
DROP COLUMN "fileUrl";
