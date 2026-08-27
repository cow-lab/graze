-- DropIndex
DROP INDEX "Interest_userId_postId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Interest";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
INSERT INTO "new_Post" ("abstract", "authorId", "authors", "boardId", "createdAt", "description", "doi", "externalUrl", "field", "fileUrl", "id", "isAnonymous", "refPostId", "source", "sourceName", "status", "title", "type", "viewCount", "year") SELECT "abstract", "authorId", "authors", "boardId", "createdAt", "description", "doi", "externalUrl", "field", "fileUrl", "id", "isAnonymous", "refPostId", "source", "sourceName", "status", "title", "type", "viewCount", "year" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE UNIQUE INDEX "Post_doi_key" ON "Post"("doi");
CREATE INDEX "Post_boardId_idx" ON "Post"("boardId");
CREATE INDEX "Post_type_idx" ON "Post"("type");
CREATE INDEX "Post_status_idx" ON "Post"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

