# Archived SQLite migrations

The history from when Graze ran on a local SQLite file, kept for reference and not used
by Prisma any more (it only reads `prisma/migrations`).

They can't run on Postgres: several rebuild tables the SQLite way — `PRAGMA foreign_keys=OFF`,
create-copy-drop-rename — because SQLite can't drop a column that carries a foreign key.
Postgres does that with `ALTER TABLE ... DROP COLUMN`, so replaying these would fail on the
first `PRAGMA`.

The live history starts at `prisma/migrations/0_init`, which is the same schema these
migrations arrived at, expressed as one Postgres migration.
