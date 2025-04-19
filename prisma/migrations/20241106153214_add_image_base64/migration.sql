/*
  Warnings:

  - You are about to drop the column `imagePath` on the `Event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "imagePath",
ADD COLUMN     "imageBase64" TEXT,
ALTER COLUMN "links" DROP DEFAULT;
