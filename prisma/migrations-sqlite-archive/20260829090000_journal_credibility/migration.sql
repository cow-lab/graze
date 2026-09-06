-- Journal-level credibility signals, cached per ISSN, plus attributed flags against
-- specific journals. Additive only — no table rebuild, so nothing cascades.

CREATE TABLE "JournalCredibility" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issn" TEXT NOT NULL,
    "title" TEXT,
    "publisher" TEXT,
    "inDoaj" BOOLEAN,
    "inMedline" BOOLEAN,
    "inScopus" BOOLEAN,
    "inWebOfScience" BOOLEAN,
    "apcUsd" INTEGER,
    "apcDisclosureUrl" TEXT,
    "reviewProcess" TEXT,
    "reviewUrl" TEXT,
    "publicationTimeWeeks" INTEGER,
    "worksCount" INTEGER,
    "citedByCount" INTEGER,
    "meanCitedness" REAL,
    "hIndex" INTEGER,
    "retractions" INTEGER,
    "retractionRate" REAL,
    "broadScopeScore" INTEGER,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "JournalCredibility_issn_key" ON "JournalCredibility"("issn");

CREATE TABLE "JournalFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issn" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'CAUTION',
    "source" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JournalFlag_issn_fkey" FOREIGN KEY ("issn") REFERENCES "JournalCredibility" ("issn") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "JournalFlag_issn_idx" ON "JournalFlag"("issn");
CREATE UNIQUE INDEX "JournalFlag_issn_source_kind_key" ON "JournalFlag"("issn", "source", "kind");

-- Papers gain the ISSN they were imported with, so a library paper can reach its journal's
-- record. Existing rows stay null until the next Combine run or a manual backfill.
ALTER TABLE "Post" ADD COLUMN "issn" TEXT;
