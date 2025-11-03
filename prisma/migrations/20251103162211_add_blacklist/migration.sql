-- CreateTable
CREATE TABLE "BlacklistedUser" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "userName" TEXT,
    "bannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bannedBy" BIGINT,
    "bannedByName" TEXT,
    "reason" TEXT,

    CONSTRAINT "BlacklistedUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlacklistedUser_userId_key" ON "BlacklistedUser"("userId");

-- CreateIndex
CREATE INDEX "BlacklistedUser_userId_idx" ON "BlacklistedUser"("userId");
