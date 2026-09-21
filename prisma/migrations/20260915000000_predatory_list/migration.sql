-- CreateEnum
CREATE TYPE "PredatoryEntryKind" AS ENUM ('JOURNAL', 'PUBLISHER');

-- CreateTable
CREATE TABLE "PredatoryListEntry" (
    "id" TEXT NOT NULL,
    "kind" "PredatoryEntryKind" NOT NULL,
    "name" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "ambiguous" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredatoryListEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredatoryListSync" (
    "id" TEXT NOT NULL,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ok" BOOLEAN NOT NULL,
    "journalCount" INTEGER NOT NULL,
    "publisherCount" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "message" TEXT,

    CONSTRAINT "PredatoryListSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PredatoryListEntry_normalized_idx" ON "PredatoryListEntry"("normalized");

-- CreateIndex
CREATE UNIQUE INDEX "PredatoryListEntry_kind_normalized_key" ON "PredatoryListEntry"("kind", "normalized");

-- CreateIndex
CREATE INDEX "PredatoryListSync_ranAt_idx" ON "PredatoryListSync"("ranAt");

