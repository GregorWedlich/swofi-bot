/*
  Warnings:

  - You are about to drop the column `approved` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `threadId` on the `Event` table. All the data in the column will be lost.
  - Added the required column `date` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Made the column `endDate` on table `Event` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'APPROVED', 'EDITED_PENDING', 'EDITED_APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "approved",
DROP COLUMN "startDate",
DROP COLUMN "threadId",
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "messageId" INTEGER,
ADD COLUMN     "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "endDate" SET NOT NULL;
