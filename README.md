# Graze

A Reddit-style community marketplace connecting real industry problems, academic research, and student/practitioner solutions — all in one ranked feed, organized into topic Fields. The name comes from the idea of open browsing across a shared field of problems and research: anyone can graze the feed, take what's useful, and contribute back.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- SQLite via Prisma
- NextAuth v5 (email/password)
- Claude API (`@anthropic-ai/sdk`) for research-paper explainers, with a demo-mode fallback
- lucide-react for icons

## Getting started

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Every seeded user logs in with the password `password123` (see `prisma/seed.ts` for emails — e.g. `dana@quantcredit.io`). The seeded admin account is `admin@graze.app` / `password123` — see `/admin/queue`.

## Environment variables

Copy `.env.example` to `.env` if you don't already have one (a `.env` is created for you on first setup). Relevant variables:

- `DATABASE_URL` — SQLite file path, defaults to `file:./dev.db`.
- `NEXTAUTH_SECRET` — change this before deploying anywhere real.
- `ANTHROPIC_API_KEY` — optional. Without it, research-paper explainers (plain-language summary, glossary, comprehension quiz) are generated as clearly-labeled placeholders instead of via the live Claude API. All seed papers ship with hand-written demo explainers either way, so the feature is fully explorable without a key.

## Data model

See `prisma/schema.prisma`. Core entities: `User` (has a `role`, `USER` or `ADMIN`, plus contact-link columns and a lazily-assigned `cowNumber` for anonymous posting), `Affiliation` (a user's roles/institutions — the real verification mechanism, see below), `Board` (shown as "Field" in the UI — a real table with `searchKeywordsJson`, so anyone can create one at `/fields/new`, no code change needed), `Post` (one model covering Problem/Research/Solution via a `type` enum, plus `source`/`sourceName`/`status`/`doi` for The Combine and `isAnonymous`), `Vote`, `CommentVote`, `Comment` (self-referential for threading, also has `isAnonymous`), `Interest` ("I'm interested" signals on problems), `ResearchExplainer` (the generated/placeholder summary+glossary+quiz, stored once per research post), and `AllowlistJournal` (the DOAJ/curated validity allowlist, see below).

## The Combine — automated research ingestion

Besides user uploads, the research library is populated automatically by a background pipeline (`lib/combine/`) that queries free academic APIs for each Field's `searchKeywordsJson`:

- **Crossref**, **OpenAlex**, **Semantic Scholar**, and **PubMed** for candidate articles
- **DOAJ** (Directory of Open Access Journals) as the validity filter — a candidate is only eligible if its journal's ISSN is DOAJ-listed (checked live, then cached into `AllowlistJournal`) or already in the curated allowlist. No ISSN or no match means it's dropped.
- Candidates are deduped by DOI against existing posts, dropped if they have no usable abstract, and capped per Field per run
- Survivors get the same Claude-API/demo-mode explainer generation as user uploads, then **publish straight to the public feed and research library** — passing every check (DOAJ/allowlist-verified journal, not a duplicate, has a real abstract) is treated as "checked out," so nothing sits waiting on a person
- Auto-imported posts show a small "Auto-imported from [source]" badge everywhere they appear, so they're never visually confused with something a person chose to post

**`/admin/queue`** still exists (seeded admin: `admin@graze.app`) for anything a future, stricter check might flag for manual review, and its "Run The Combine now" button is the practical way to trigger an on-demand run — useful since the real schedule (`instrumentation.ts`) is a lightweight daily interval suited to a single long-running `npm run dev` process, not a substitute for a real scheduler (Vercel Cron, node-cron, etc.) in production. It intentionally doesn't fire on every server restart, to avoid hammering five external APIs every time you run `npm run dev`.

There is deliberately no automated "bias checker" — DOAJ/allowlist membership is a checkable fact (peer review happened), whereas "bias" isn't something an API can reliably score, so validity is enforced by the allowlist rather than any content judgment.

## Search all literature (`/search`)

A second, separate tier from the curated library above: `/search` queries OpenAlex's live index of 250M+ scholarly works directly, in real time, on every search — nothing is stored just from searching. Each result has an **"Add to Graze"** button (any signed-in user, not admin-only) that runs it through the exact same pipeline as The Combine (`lib/combine/run.ts`'s `promoteCandidate`, shared by both callers): DOAJ/allowlist check, dedup by DOI, explainer generation. The one difference from the automated pipeline: a result whose journal isn't allowlisted still gets added, just to `/admin/queue` for review, rather than dropped outright — a human specifically chose that one paper.

## Affiliations, contact links & anonymous posting

- **Affiliations** (`Affiliation` model) are the real verification mechanism, replacing the old single account-level `verified` flag — add one or more from your own profile (role + institution + an email at that institution). It's auto-verified using the same domain heuristic as the rest of the app (`.edu` or a non-free-provider company domain — see `lib/verification.ts`), since no SMTP provider is configured for a live email-confirmation round-trip. A verified affiliation shows a checkmark next to your name everywhere it appears, in `components/AuthorDisplay.tsx`.
- **Contact links** (website, LinkedIn, Google Scholar, GitHub) are plain URLs, editable from your own profile, shown publicly on it.
- **Anonymous posting**: a "Post anonymously" checkbox on `/submit` and every comment form. An anonymous post/comment displays as "Cow #XXXX" with a generic cow avatar — a random 4-digit number assigned once per account (`lib/cow.ts`) and reused for all of that account's anonymous activity, never shown alongside affiliations or a real name. The real `authorId` is always stored (needed for moderation and so you can find your own anonymous posts), but the public profile post list explicitly excludes anonymous posts — `app/profile/[id]/page.tsx` filters them out of what's shown publicly and surfaces them only in a "Your anonymous posts" section visible solely when you're viewing your own profile.

## Notes

- Uploaded PDFs are stored locally under `public/uploads` — fine for local dev, swap for real object storage before deploying anywhere persistent.
- Reputation on a profile page is the net vote score (upvotes − downvotes) summed across a user's posts and comments (including anonymous ones — the number is private to the profile, it doesn't reveal which posts were anonymous).
