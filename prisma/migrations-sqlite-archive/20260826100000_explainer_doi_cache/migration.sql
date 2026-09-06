-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ResearchExplainer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT,
    "doi" TEXT,
    "summary" TEXT NOT NULL,
    "termsJson" TEXT NOT NULL,
    "quizJson" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResearchExplainer_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ResearchExplainer" ("createdAt", "id", "isDemo", "postId", "quizJson", "summary", "termsJson") SELECT "createdAt", "id", "isDemo", "postId", "quizJson", "summary", "termsJson" FROM "ResearchExplainer";
DROP TABLE "ResearchExplainer";
ALTER TABLE "new_ResearchExplainer" RENAME TO "ResearchExplainer";
CREATE UNIQUE INDEX "ResearchExplainer_postId_key" ON "ResearchExplainer"("postId");
CREATE UNIQUE INDEX "ResearchExplainer_doi_key" ON "ResearchExplainer"("doi");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

