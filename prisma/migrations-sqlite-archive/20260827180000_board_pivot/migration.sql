-- The board pivot. Three things happen here:
--   1. The standalone community-post type is cut. Discussion attaches to papers as
--      comments and nowhere else, so POST-type rows (and everything hanging off them) go,
--      along with the columns that only existed to serve them.
--   2. SavedItem becomes CanvasCard: saving a paper places a card on the user's Board
--      instead of appending to a flat list. Existing saves are carried over and laid out
--      on a grid rather than dropped.
--   3. New tables for the two things the Board and comments now depend on: the connections
--      a user draws between their own cards, and what a person actually did with a paper.

-- Both pragmas, matching what Prisma generates for a SQLite table rebuild. defer_foreign_keys
-- alone is not enough: it postpones constraint *checking*, but DROP TABLE still fires ON
-- DELETE CASCADE into child tables, which would take every comment, vote, and explainer
-- down with the old Post table.
PRAGMA defer_foreign_keys = ON;
PRAGMA foreign_keys = OFF;

-- ---------------------------------------------------------------------------
-- 1. Remove the community-post type
-- ---------------------------------------------------------------------------

-- Ordered by dependency: comment votes, then notifications, then comments (the reply
-- self-relation is NoAction, so replies have to go before their parents), then the posts.
DELETE FROM "CommentVote" WHERE "commentId" IN (
    SELECT "id" FROM "Comment" WHERE "postId" IN (SELECT "id" FROM "Post" WHERE "type" = 'POST')
);
DELETE FROM "Notification" WHERE "postId" IN (SELECT "id" FROM "Post" WHERE "type" = 'POST');
DELETE FROM "Comment" WHERE "postId" IN (SELECT "id" FROM "Post" WHERE "type" = 'POST') AND "parentId" IS NOT NULL;
DELETE FROM "Comment" WHERE "postId" IN (SELECT "id" FROM "Post" WHERE "type" = 'POST');
DELETE FROM "Vote" WHERE "postId" IN (SELECT "id" FROM "Post" WHERE "type" = 'POST');
DELETE FROM "SavedItem" WHERE "postId" IN (SELECT "id" FROM "Post" WHERE "type" = 'POST');
DELETE FROM "ResearchExplainer" WHERE "postId" IN (SELECT "id" FROM "Post" WHERE "type" = 'POST');
DELETE FROM "Post" WHERE "type" = 'POST';

-- ---------------------------------------------------------------------------
-- 2. SavedItem -> CanvasCard
-- ---------------------------------------------------------------------------

CREATE TABLE "CanvasCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "externalDoi" TEXT,
    "externalTitle" TEXT,
    "externalAuthors" TEXT,
    "externalVenue" TEXT,
    "externalYear" INTEGER,
    "externalUrl" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "x" REAL NOT NULL DEFAULT 0,
    "y" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CanvasCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CanvasCard_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Carried-over saves get the same three-column layout a freshly added card would land in,
-- so an existing user opens their Board to their bookmarks arranged rather than stacked.
INSERT INTO "CanvasCard" (
    "id", "userId", "postId", "externalDoi", "externalTitle", "externalAuthors",
    "externalVenue", "externalYear", "externalUrl", "note", "x", "y", "createdAt", "updatedAt"
)
SELECT
    "id", "userId", "postId", "externalDoi", "externalTitle", "externalAuthors",
    "externalVenue", "externalYear", "externalUrl", '',
    40 + ((ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt") - 1) % 3) * 300,
    40 + ((ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt") - 1) / 3) * 230,
    "createdAt", CURRENT_TIMESTAMP
FROM "SavedItem";

DROP TABLE "SavedItem";

CREATE INDEX "CanvasCard_userId_idx" ON "CanvasCard"("userId");
CREATE UNIQUE INDEX "CanvasCard_userId_postId_key" ON "CanvasCard"("userId", "postId");
CREATE UNIQUE INDEX "CanvasCard_userId_externalDoi_key" ON "CanvasCard"("userId", "externalDoi");

CREATE TABLE "CanvasLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fromCardId" TEXT NOT NULL,
    "toCardId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CanvasLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CanvasLink_fromCardId_fkey" FOREIGN KEY ("fromCardId") REFERENCES "CanvasCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CanvasLink_toCardId_fkey" FOREIGN KEY ("toCardId") REFERENCES "CanvasCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CanvasLink_userId_idx" ON "CanvasLink"("userId");
CREATE UNIQUE INDEX "CanvasLink_fromCardId_toCardId_key" ON "CanvasLink"("fromCardId", "toCardId");

-- ---------------------------------------------------------------------------
-- 3. Engagement: what someone actually did with a paper
-- ---------------------------------------------------------------------------

CREATE TABLE "PaperEngagement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "doi" TEXT,
    "kind" TEXT NOT NULL,
    "afterExplainer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaperEngagement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaperEngagement_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "PaperEngagement_postId_kind_idx" ON "PaperEngagement"("postId", "kind");
CREATE UNIQUE INDEX "PaperEngagement_userId_postId_kind_key" ON "PaperEngagement"("userId", "postId", "kind");
CREATE UNIQUE INDEX "PaperEngagement_userId_doi_kind_key" ON "PaperEngagement"("userId", "doi", "kind");

-- ---------------------------------------------------------------------------
-- 4. Column drops (table rebuilds)
-- ---------------------------------------------------------------------------

CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'USER',
    "sourceName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "doi" TEXT,
    "authors" TEXT,
    "field" TEXT,
    "year" INTEGER,
    "abstract" TEXT,
    "externalUrl" TEXT,
    "fileUrl" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "citationCount" INTEGER,
    "language" TEXT,
    "retractedAt" DATETIME,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Post_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("id", "title", "createdAt", "authorId", "boardId", "isAnonymous", "source", "sourceName", "status", "doi", "authors", "field", "year", "abstract", "externalUrl", "fileUrl", "viewCount", "citationCount", "language", "retractedAt")
SELECT "id", "title", "createdAt", "authorId", "boardId", "isAnonymous", "source", "sourceName", "status", "doi", "authors", "field", "year", "abstract", "externalUrl", "fileUrl", "viewCount", "citationCount", "language", "retractedAt" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE UNIQUE INDEX "Post_doi_key" ON "Post"("doi");
CREATE INDEX "Post_boardId_idx" ON "Post"("boardId");
CREATE INDEX "Post_status_idx" ON "Post"("status");

-- Vote-count notifications no longer exist as a type, so the rows go with the column.
DELETE FROM "Notification" WHERE "type" = 'VOTES_ON_POST';

CREATE TABLE "new_Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "postId" TEXT,
    "commentId" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Notification_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Notification" ("id", "type", "userId", "actorId", "postId", "commentId", "readAt", "createdAt")
SELECT "id", "type", "userId", "actorId", "postId", "commentId", "readAt", "createdAt" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

PRAGMA foreign_keys = ON;
PRAGMA defer_foreign_keys = OFF;
