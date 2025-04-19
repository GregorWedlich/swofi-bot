-- CreateTable
CREATE TABLE "EventArchive" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "category" TEXT[],
    "links" TEXT[],
    "imageBase64" TEXT,
    "submittedById" INTEGER NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "messageId" INTEGER,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventArchive_date_idx" ON "EventArchive"("date");

-- CreateIndex
CREATE INDEX "EventArchive_title_idx" ON "EventArchive"("title");

-- CreateIndex
CREATE INDEX "EventArchive_category_idx" ON "EventArchive"("category");
