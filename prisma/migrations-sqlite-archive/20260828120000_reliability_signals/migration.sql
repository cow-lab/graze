-- Reliability filtering: peer-review status as a first-class signal, a second independent
-- paper-mill/retraction check, and one composite indicator per paper instead of a row of
-- small badges.
--
-- Additive columns only, so no table rebuild and no cascade risk. Existing rows are
-- backfilled below from what's already known about them.

ALTER TABLE "Post" ADD COLUMN "workType" TEXT;
ALTER TABLE "Post" ADD COLUMN "reliability" TEXT NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE "Post" ADD COLUMN "reviewReason" TEXT;

-- Backfill: everything The Combine published passed the DOAJ check, and every source it
-- imports from is filtered to journal articles, so those rows are peer-reviewed and listed.
-- Anything still pending review keeps the default UNVERIFIED until a person looks at it.
UPDATE "Post"
   SET "reliability" = 'PEER_REVIEWED_LISTED',
       "workType" = 'journal-article'
 WHERE "source" = 'COMBINE' AND "status" = 'PUBLISHED';

CREATE INDEX "Post_reliability_idx" ON "Post"("reliability");
