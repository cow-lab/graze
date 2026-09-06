-- AlterTable
ALTER TABLE "Post" ADD COLUMN "citationCount" INTEGER;
ALTER TABLE "Post" ADD COLUMN "retractedAt" DATETIME;

-- CreateTable
CREATE TABLE "ApiResponseCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "queryKey" TEXT NOT NULL,
    "responseJson" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiResponseCache_source_queryKey_key" ON "ApiResponseCache"("source", "queryKey");

