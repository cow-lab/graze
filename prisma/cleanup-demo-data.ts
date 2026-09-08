import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// The 11 invented "community" accounts from prisma/seed.ts (Dana Whitfield, Prof. Elena
// Vasquez, Raj Patel, Dr. Wei Zhang, Sofia Nguyen, Marcus Cole, Priya Iyer, Tom Becker,
// Grace Muthoni, Dr. Amara Obi, Lars Eriksen) — created for local development, never
// disclosed as demo content, and ended up live in production. This script removes them and
// everything they created: the 5 fabricated "papers," their comments, votes, click-through
// engagement, and board canvas notes.
//
// It deliberately leaves alone anything authored by "the-combine@graze.internal" (the real
// auto-import system account) and anything created by an actual signed-up user — those are
// real content, not seed data.
const FAKE_EMAILS = [
  "dana@quantcredit.io",
  "evasquez@mit.edu",
  "raj.patel@gmail.com",
  "wzhang@stanford.edu",
  "sofia@healthbridge.co",
  "marcus.cole@outlook.com",
  "piyer@berkeley.edu",
  "tbecker@gmail.com",
  "grace@aridsense.com",
  "amara@jhu.edu",
  "lars@nordicwind.no",
];

const OLD_ADMIN_EMAIL = "admin@graze.app";

async function main() {
  const newAdminEmail = process.env.NEW_ADMIN_EMAIL;
  const newAdminPassword = process.env.NEW_ADMIN_PASSWORD;

  if (!newAdminEmail || !newAdminPassword) {
    console.error(
      "Set NEW_ADMIN_EMAIL and NEW_ADMIN_PASSWORD before running this script, e.g.:\n\n" +
        "  NEW_ADMIN_EMAIL=you@example.com NEW_ADMIN_PASSWORD='a long random passphrase' npm run db:cleanup-demo\n",
    );
    process.exit(1);
  }
  if (newAdminPassword.length < 12) {
    console.error("Use a longer admin password — at least 12 characters, ideally a random passphrase.");
    process.exit(1);
  }

  const fakeUsers = await prisma.user.findMany({
    where: { email: { in: FAKE_EMAILS } },
    select: { id: true, email: true },
  });
  const fakeIds = fakeUsers.map((u) => u.id);

  if (fakeIds.length === 0) {
    console.log("No seed demo accounts found — already cleaned up, or this database was never seeded.");
  } else {
    console.log(`Found ${fakeIds.length} demo account(s) to remove: ${fakeUsers.map((u) => u.email).join(", ")}`);

    // "SpaceTech" and "TotallyReal" were created by fake accounts but now hold real,
    // Combine-imported papers — keep the fields, just detach the fake creator.
    const detached = await prisma.board.updateMany({
      where: { createdById: { in: fakeIds } },
      data: { createdById: null },
    });
    console.log(`Detached ${detached.count} field(s) from their demo creator (field itself kept).`);

    // A demo spam report one fake account filed against another's field — not real
    // moderation history.
    const reports = await prisma.fieldReport.deleteMany({ where: { reporterId: { in: fakeIds } } });
    console.log(`Removed ${reports.count} demo field report(s).`);

    // The 5 fabricated papers, plus everything hanging off them — comments, votes, the
    // plain-language explainer, field tags, and click-through engagement — cascade-delete
    // with the post.
    const posts = await prisma.post.deleteMany({ where: { authorId: { in: fakeIds } } });
    console.log(`Removed ${posts.count} demo paper(s) and everything attached to them.`);

    // Anything still on these accounts (board canvas cards/links, stray engagement rows)
    // cascades away with the account itself.
    const users = await prisma.user.deleteMany({ where: { id: { in: fakeIds } } });
    console.log(`Removed ${users.count} demo account(s).`);
  }

  // Replace the seeded admin login (admin@graze.app / password123) with a real one only
  // you know. The password is read from an environment variable you set in your own
  // terminal — it is never sent anywhere else.
  const passwordHash = await bcrypt.hash(newAdminPassword, 10);
  const existingAdmin = await prisma.user.findUnique({ where: { email: OLD_ADMIN_EMAIL } });

  if (existingAdmin) {
    await prisma.user.update({
      where: { email: OLD_ADMIN_EMAIL },
      data: { email: newAdminEmail, passwordHash, verified: true },
    });
    console.log(`Updated the admin account: it now signs in as ${newAdminEmail} with your new password.`);
  } else {
    const already = await prisma.user.findUnique({ where: { email: newAdminEmail } });
    if (already) {
      await prisma.user.update({
        where: { email: newAdminEmail },
        data: { passwordHash, role: "ADMIN", verified: true },
      });
      console.log(`${newAdminEmail} already existed — set its password and made it an admin.`);
    } else {
      await prisma.user.create({
        data: { email: newAdminEmail, name: "Admin", passwordHash, role: "ADMIN", verified: true },
      });
      console.log(`Created a new admin account: ${newAdminEmail}.`);
    }
  }

  console.log("\nDone. Sign in at /login with your new admin email and password.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
