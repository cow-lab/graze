-- AlterTable
ALTER TABLE "User" ADD COLUMN "cowNumber" INTEGER;
ALTER TABLE "User" ADD COLUMN "githubUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "googleScholarUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "linkedinUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "websiteUrl" TEXT;

-- CreateTable
CREATE TABLE "Affiliation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Affiliation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "body" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
INSERT INTO "new_Comment" ("authorId", "body", "createdAt", "id", "parentId", "postId") SELECT "authorId", "body", "createdAt", "id", "parentId", "postId" FROM "Comment";
DROP TABLE "Comment";
ALTER TABLE "new_Comment" RENAME TO "Comment";
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");
CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'USER',
    "sourceName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "doi" TEXT,
    "description" TEXT,
    "unblocks" TEXT,
    "authors" TEXT,
    "field" TEXT,
    "year" INTEGER,
    "abstract" TEXT,
    "externalUrl" TEXT,
    "fileUrl" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "refPostId" TEXT,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Post_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Post_refPostId_fkey" FOREIGN KEY ("refPostId") REFERENCES "Post" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("abstract", "authorId", "authors", "boardId", "createdAt", "description", "doi", "externalUrl", "field", "fileUrl", "id", "refPostId", "source", "sourceName", "status", "title", "type", "unblocks", "viewCount", "year") SELECT "abstract", "authorId", "authors", "boardId", "createdAt", "description", "doi", "externalUrl", "field", "fileUrl", "id", "refPostId", "source", "sourceName", "status", "title", "type", "unblocks", "viewCount", "year" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE UNIQUE INDEX "Post_doi_key" ON "Post"("doi");
CREATE INDEX "Post_boardId_idx" ON "Post"("boardId");
CREATE INDEX "Post_type_idx" ON "Post"("type");
CREATE INDEX "Post_status_idx" ON "Post"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Affiliation_userId_idx" ON "Affiliation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_cowNumber_key" ON "User"("cowNumber");

