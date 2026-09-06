-- Simplification pass: the profile carried two things left over from the original
-- company-marketplace concept — institutional affiliations and personal contact links
-- (website/LinkedIn/Scholar/GitHub). Neither serves a personal research tool, so both go,
-- schema included.
--
-- Note this also removes the only data source for the "Verified" badge shown next to an
-- author's name: credibility signals now attach to papers (citation count, DOAJ-listed
-- journal, retraction status), not to people.

-- Both pragmas, matching what Prisma generates for a SQLite table rebuild. defer_foreign_keys
-- postpones constraint *checking*, but DROP TABLE still fires ON DELETE CASCADE into child
-- tables — and User is the parent of nearly every row in this database, so without
-- foreign_keys=OFF this rebuild would empty the app.
PRAGMA defer_foreign_keys = ON;
PRAGMA foreign_keys = OFF;

DROP TABLE "Affiliation";

CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cowNumber" INTEGER
);
INSERT INTO "new_User" ("id", "email", "passwordHash", "name", "verified", "role", "createdAt", "cowNumber")
SELECT "id", "email", "passwordHash", "name", "verified", "role", "createdAt", "cowNumber" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_cowNumber_key" ON "User"("cowNumber");

PRAGMA foreign_keys = ON;
PRAGMA defer_foreign_keys = OFF;
