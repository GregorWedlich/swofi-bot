-- CreateTable
CREATE TABLE "EventTemplate" (
    "id" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT[],
    "links" TEXT[],
    "groupLink" TEXT,
    "location" TEXT NOT NULL,
    "imageBase64" TEXT,
    "userId" BIGINT NOT NULL,
    "userName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventTemplate_userId_idx" ON "EventTemplate"("userId");

-- CreateIndex
CREATE INDEX "EventTemplate_templateName_idx" ON "EventTemplate"("templateName");
