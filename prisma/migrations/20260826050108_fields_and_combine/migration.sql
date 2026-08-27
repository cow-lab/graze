-- CreateTable
CREATE TABLE "AllowlistJournal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issn" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publisher" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Board" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "searchKeywordsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    CONSTRAINT "Board_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Board" ("createdAt", "description", "id", "name", "slug") SELECT "createdAt", "description", "id", "name", "slug" FROM "Board";
DROP TABLE "Board";
ALTER TABLE "new_Board" RENAME TO "Board";
CREATE UNIQUE INDEX "Board_slug_key" ON "Board"("slug");
CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
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
INSERT INTO "new_Post" ("abstract", "authorId", "authors", "boardId", "createdAt", "description", "externalUrl", "field", "fileUrl", "id", "refPostId", "title", "type", "unblocks", "viewCount", "year") SELECT "abstract", "authorId", "authors", "boardId", "createdAt", "description", "externalUrl", "field", "fileUrl", "id", "refPostId", "title", "type", "unblocks", "viewCount", "year" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE UNIQUE INDEX "Post_doi_key" ON "Post"("doi");
CREATE INDEX "Post_boardId_idx" ON "Post"("boardId");
CREATE INDEX "Post_type_idx" ON "Post"("type");
CREATE INDEX "Post_status_idx" ON "Post"("status");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "passwordHash", "verified") SELECT "createdAt", "email", "id", "name", "passwordHash", "verified" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AllowlistJournal_issn_key" ON "AllowlistJournal"("issn");
