-- A paper can belong to more than one Field. Post.boardId becomes a PostField join table,
-- carrying how each assignment was made.

-- Both pragmas, matching what Prisma generates for a SQLite table rebuild. defer_foreign_keys
-- postpones constraint *checking*, but DROP TABLE still fires ON DELETE CASCADE into child
-- tables — and Post is the parent of comments, votes, board cards, engagement records and
-- explainers, all of which would go with it.
PRAGMA defer_foreign_keys = ON;
PRAGMA foreign_keys = OFF;

CREATE TABLE "PostField" (
    "postId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("postId", "boardId"),
    CONSTRAINT "PostField_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PostField_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Carry every existing single assignment across, attributed to whichever entry point put
-- it there: The Combine matched its Field by keyword, a person picked theirs by hand.
INSERT INTO "PostField" ("postId", "boardId", "assignedBy", "createdAt")
SELECT "id", "boardId",
       CASE WHEN "source" = 'COMBINE' THEN 'COMBINE' ELSE 'USER' END,
       "createdAt"
  FROM "Post";

CREATE INDEX "PostField_boardId_idx" ON "PostField"("boardId");

-- Post loses boardId (table rebuild — SQLite can't drop a column with a foreign key).
CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,
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
    "workType" TEXT,
    "reliability" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "reviewReason" TEXT,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("id", "title", "createdAt", "authorId", "isAnonymous", "source", "sourceName", "status", "doi", "authors", "field", "year", "abstract", "externalUrl", "fileUrl", "viewCount", "citationCount", "language", "retractedAt", "workType", "reliability", "reviewReason")
SELECT "id", "title", "createdAt", "authorId", "isAnonymous", "source", "sourceName", "status", "doi", "authors", "field", "year", "abstract", "externalUrl", "fileUrl", "viewCount", "citationCount", "language", "retractedAt", "workType", "reliability", "reviewReason" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE UNIQUE INDEX "Post_doi_key" ON "Post"("doi");
CREATE INDEX "Post_status_idx" ON "Post"("status");
CREATE INDEX "Post_reliability_idx" ON "Post"("reliability");

PRAGMA foreign_keys = ON;
PRAGMA defer_foreign_keys = OFF;
