# Graze

A research tool in two halves, built around three convictions: good research is underused, people lean on AI instead of doing their own thinking, and the fix is to make research easy to reach *and* ask for a small amount of real effort in return.

- **Discover** — the access half. Topic Fields, a curated library, live OpenAlex search across 250M+ works, and "Chew on this" plain-language explainers with a comprehension check.
- **Board** — the effort half. A private canvas where the papers you keep become cards you arrange, annotate, and *connect yourself*, with your own label for what the relationship is.

The one thing this deliberately does not have is an AI chat that answers questions about a paper or synthesises across several on your behalf. That's a faster way to skip the research, not a way to do it — so the connecting is left to the person, on the Board.

Success is measured by click-through to the original source after reading a summary, not by votes, saves, or notification counts.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Postgres via Prisma (Neon in production)
- NextAuth v5 (email/password)
- Claude API (`@anthropic-ai/sdk`) for research-paper explainers, with a demo-mode fallback
- lucide-react for icons

## Getting started

Graze runs on Postgres. There is no local-file database any more, so local development needs
a connection string too — the simplest route is a second free Neon database (or a Neon
branch of your production one, which gives you a copy of the real schema in seconds).

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL and DIRECT_URL
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Every seeded user logs in with the password `password123` (see `prisma/seed.ts` for emails — e.g. `dana@quantcredit.io`). The seeded admin account is `grazeoutreach@gmail.com` / `password123` — see `/admin/queue`.

## Environment variables

The complete list, with what breaks when each is missing. `.env.example` carries the same
notes inline.

| Variable | Needed | Without it |
| --- | --- | --- |
| `DATABASE_URL` | **Always** | Nothing runs. Postgres, **pooled** connection (Neon: the host with `-pooler`). |
| `DIRECT_URL` | **Always** | `prisma migrate` fails. Same string **without** `-pooler` — DDL can't run through a transaction pooler. |
| `NEXTAUTH_SECRET` | **Always** | Sessions can't be signed. `openssl rand -base64 32`. Changing it signs everyone out. |
| `NEXTAUTH_URL` | Production | Auth redirects can go to the wrong origin. Set to the site's public URL. |
| `BLOB_READ_WRITE_TOKEN` | Before real uploads | PDFs are written to local disk and **lost on redeploy**. Set by Vercel automatically when you add a Blob store. |
| `CRON_SECRET` | For ingestion | `/api/cron/combine` returns 503 and The Combine only runs when an admin clicks the button. |
| `ANTHROPIC_API_KEY` | For real explainers | "Chew on this" runs in demo mode — clearly-labelled placeholders, no cost. |
| `ERROR_WEBHOOK_URL` | Optional | Errors stay in memory only, which on serverless means effectively lost. |
| `ELSEVIER_API_KEY` | Optional | Field-Tested shows Scopus as "not checked" rather than claiming absence. |
| `CLARIVATE_API_KEY` | Optional | Same, for Web of Science. |

## Deploying

The steps that need your account credentials are yours to run — everything in the codebase
is already prepared for them.

**1. Create the database (Neon).** Neon is the recommendation: generous free tier, real
Postgres, branching, and Vercel has a first-party integration that sets the variables for
you.

- Sign up at [neon.tech](https://neon.tech) (GitHub login works).
- Create a project — any name, pick the region closest to your Vercel region.
- On the dashboard, copy the connection string **twice**: once with `-pooler` in the host
  (that's `DATABASE_URL`) and once without (`DIRECT_URL`). Neon's connection dialog has a
  "Pooled connection" toggle that switches between them.

**2. Apply the schema.** With both URLs in your local `.env`:

```bash
npx prisma migrate deploy    # creates every table on the hosted database
npm run db:seed              # optional: demo Fields, papers and a worked board
```

**3. Push to GitHub.** The repo has commits but no remote yet. Create an empty repository on
GitHub (no README, no .gitignore — this repo has both), then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/graze.git
git push -u origin main
```

`.env` is gitignored, so no secrets travel with it — `.env.example` does.

**4. Deploy on Vercel.**

- At [vercel.com/new](https://vercel.com/new), import the GitHub repo. Framework detection
  picks Next.js on its own; leave the build settings alone.
- Before the first deploy, open **Environment Variables** and add everything from the table
  above that you have. At minimum: `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`,
  `NEXTAUTH_URL` (your `https://….vercel.app` URL — you can add it after the first deploy
  and redeploy), and `CRON_SECRET`.
- Add a Blob store: project → **Storage** → Create → Blob. Vercel sets
  `BLOB_READ_WRITE_TOKEN` for you.
- `vercel.json` already declares the daily cron for `/api/cron/combine`; Vercel registers it
  on deploy.

**5. Check it actually works.** Load the site, then confirm the database is really connected
rather than just the page rendering: open `/research` and confirm papers are listed, or
register an account and see it persist across a reload. A build can succeed with a broken
`DATABASE_URL` — pages that need data are the real test.

## What this costs once it's live

Nothing here bills you by existing; all three services bill by use, and two of them have
free tiers you'd have to work to exceed. The one to actually watch is the Claude API.

- **Neon (database)** — free tier is roughly 0.5 GB storage and a compute allowance that
  suspends when idle. Graze stores text, so storage is not the constraint; sustained traffic
  keeping the compute awake is. Realistically free for a personal or small-team site, and
  the first paid tier is around $19/month. Worth setting a spend limit in the Neon console.
- **Vercel Blob (PDF storage)** — free tier around 1 GB stored and a few GB of transfer.
  Only user-uploaded PDFs land here; papers ingested by The Combine are links, not files, so
  this grows only as fast as people upload. Cheap after that, per GB.
- **Vercel hosting** — the Hobby tier is free and covers a site of this size. Note it caps
  serverless execution at 60s, which matters only for `/api/cron/combine` on a large run.
- **Claude API — this is the one that can surprise you.** Every paper entering the library
  generates one explainer (~2k output tokens), and every "Chew on this" on a live search
  result that isn't cached generates another. Both are cached — per post and per DOI — so
  the same paper never generates twice. The cost is therefore driven by *new papers*, not by
  readers: a Combine run over a dozen Fields is a few dozen generations, while a thousand
  people reading the same explainer costs nothing extra. **Set a spend limit in the Anthropic
  console** rather than relying on that holding. Leaving `ANTHROPIC_API_KEY` unset keeps the
  feature in demo mode at zero cost while you watch the rest.

The free external APIs — OpenAlex, Crossref, DOAJ, PubMed, NLM — stay free, and the app
already caches and backs off against all of them.

## Discover is the homepage, and the search page

There is no landing route, and no `/search` route — one component, three states:

| URL | State |
| --- | --- |
| `/` | The landing: wordmark, tagline, mission line, one centred search box, a short "or browse:" row of the busiest Fields, and the illustrated scene cropped to a horizon strip along the bottom edge. The hero is sized to end exactly at the fold (viewport minus the measured header height), so the first screen is the search box and nothing else — the papers below are still one scroll away, they just never peek. |
| `/?q=…` | The same page in its results state: Graze's own library matches first, then the live OpenAlex tier under it, on the full illustrated background. |
| `/?board=…` | Browsing one Field, with the classic sidebar. |

Submitting the search box doesn't navigate to another route — it pushes `?q=` onto the route
it's already on and the same component re-renders. The query does go in the URL on purpose:
a search you can't link to, bookmark, or back out of isn't a search, and the results are
server-rendered from it. The form also works without JavaScript (`action="/"`), and
`/search` is kept only as a redirect for old links.

Sorting deliberately doesn't switch views, so re-sorting the list under the hero doesn't
rearrange the page around you. The scene is one drawing framed two ways —
`components/FieldScene.tsx`.

## Sorting

Three options everywhere papers are listed — **Most cited** (the default), **Most discussed** (comment count), **Newest**. There is no time-decayed "hot" score: that ranked papers by how fast they were collecting votes, which is a social-feed measure and says nothing about whether a paper is worth reading.

## The Board (`/board`)

Saving a paper doesn't append to a list — it puts a card on your board. The board is private to you, and it is where the product asks for effort:

- **Cards** carry the paper's title, authors, a link to it in Graze (or straight to the source), and a sticky note in your own words: why this matters to you, what you took from it.
- **Dragging** is free-form (pointer or arrow keys), and loose grouping is just where you choose to put things.
- **Connections** are the point. Draw a line between two cards and label it — `contradicts`, `builds on`, `same method`, or whatever you'd actually say. This is the one deliberately effortful interaction in the product, and it's the replacement for "let the AI find the connections."

Everything the canvas shows spatially is also listed as text under it ("Connections you've drawn"), which is what makes the feature usable with a screen reader and on a small screen.

Deliberately absent: drawing/annotation tools, real-time multiplayer, infinite canvas.

## Interaction patterns

Four rules the UI follows consistently, rather than in the one place they were first needed:

- **Signifiers before affordances.** Drag-to-connect is not a pattern anyone arrives already knowing, so each Board card grows four anchor dots on hover (always visible on touch) that say what they do. The click-two-cards path and the keyboard path both still work — the dots make the fast one findable.
- **Every wait over ~500ms says something.** The two waits people sit and watch — live OpenAlex search and "Chew on this" generation — get the running cow (`components/RunningCowLoader.tsx`): the same cow drawing as the background, legs cycling through a few discrete poses, running across a strip of hill, under one short line of text. Everything cheaper and more frequent (Board writes, The Combine's admin run) keeps a plain spinner, because a galloping cow on every card-position save stops being charming by about the fourth save. All the motion is gated behind `prefers-reduced-motion: no-preference`; under reduce the cow stands still and the text still says what's happening.
- **No raw errors reach a person.** Server actions return `ActionResult` (`lib/actions/result.ts`) rather than throwing: `guard()` captures the real error for `/admin/errors` and the webhook, and hands the UI a sentence saying what happened and what to try. Next's `redirect()`/`notFound()` control flow is re-thrown untouched. Optimistic UI reverts on failure, so a vote that didn't save doesn't keep showing as counted. Fire-and-forget calls (view counts, engagement tracking, preferences) log and swallow instead — they must never interrupt what someone was doing.
- **Progressive disclosure.** "Chew on this" reveals summary → glossary → quiz in stages; paper cards show a title and one line, with the abstract on the paper's own page; Board notes sit collapsed to a two-line preview and expand into an editor on click.

The Board also carries a single first-run hint: faded text on an empty canvas telling you to save a paper and then drag between two, replaced permanently by your first card, then a one-line connect nudge that goes for good once you've drawn a connection. No tour, no dismiss buttons, nothing stored — the hints are derived from whether your board has anything on it.

## Comments — the only collaboration surface

There is no standalone discussion post type. Comments attach to papers and nothing else, and they exist to do one job: check the machine-written summary, add the nuance it flattened, and tell people which part of the source is worth their time ("the real finding is in section 5, skip the intro").

A comment from someone who clicked through to the source, or who passed that paper's comprehension check, carries a light `read the source` marker — no badge, no levels. The same signal is weighted into comment ranking (`lib/comments.ts`): reading the source is worth two upvotes, passing the check one more, so a first-hand comment doesn't sit at the bottom waiting for votes.

Notifications are scoped to match: a new comment on a paper you submitted, a reply to your comment, or a comment on a paper you're tracking (it's on your board, or you've commented on it). Vote-count notifications are gone.

## Tracking what matters

`PaperEngagement` records what someone actually did with a paper — `SOURCE_CLICK` and `COMPREHENSION_PASS`, one row per person per paper per kind. Every link that leaves Graze for an original paper goes through `components/SourceLink.tsx`, which records the click at the click itself, flagged with whether the reader had opened "Chew on this" for that paper first (`lib/chewSession.ts`).

The counters are visible at `/admin/errors`, alongside errors. `source.clickthrough_after_chew` is the headline number.

## Data model

See `prisma/schema.prisma`. Core entities: `User` (has a `role`, `USER` or `ADMIN`, plus contact-link columns and a lazily-assigned `cowNumber` for anonymous posting), `Affiliation` (a user's roles/institutions — the real verification mechanism, see below), `Board` (shown as "Field" in the UI — a real table with `searchKeywordsJson`, so anyone can create one at `/fields/new`, no code change needed), `Post` (a research paper — every post is one — plus `source`/`sourceName`/`status`/`doi` for The Combine and `isAnonymous`), `CanvasCard` and `CanvasLink` (one user's Board: the cards on it and the connections they drew — named `Canvas*` because `Board` was already taken by the Field model), `PaperEngagement` (source click-throughs and passed comprehension checks), `Vote`, `CommentVote`, `Comment` (self-referential for threading, also has `isAnonymous`), `ResearchExplainer` (the generated/placeholder summary+glossary+quiz, stored per research post or cached by DOI for live-search papers), and `AllowlistJournal` (the DOAJ/curated validity allowlist, see below).

## The Combine — automated research ingestion

Besides user uploads, the research library is populated automatically by a background pipeline (`lib/combine/`) that queries free academic APIs for each Field's `searchKeywordsJson`:

- **Crossref**, **OpenAlex**, **Semantic Scholar**, and **PubMed** for candidate articles
- **DOAJ** (Directory of Open Access Journals) as the validity filter — a candidate is only eligible if its journal's ISSN is DOAJ-listed (checked live, then cached into `AllowlistJournal`) or already in the curated allowlist. No ISSN or no match means it's dropped.
- Candidates are deduped by DOI against existing posts, dropped if they have no usable abstract, and capped per Field per run
- Survivors get the same Claude-API/demo-mode explainer generation as user uploads, then **publish straight to the public feed and research library** — passing every check (DOAJ/allowlist-verified journal, not a duplicate, has a real abstract) is treated as "checked out," so nothing sits waiting on a person
- Auto-imported posts show a small "Auto-imported from [source]" badge everywhere they appear, so they're never visually confused with something a person chose to post

**`/admin/queue`** still exists (seeded admin: `grazeoutreach@gmail.com`) for anything a future, stricter check might flag for manual review, and its "Run The Combine now" button is the practical way to trigger an on-demand run — useful since the real schedule (`instrumentation.ts`) is a lightweight daily interval suited to a single long-running `npm run dev` process, not a substitute for a real scheduler (Vercel Cron, node-cron, etc.) in production. It intentionally doesn't fire on every server restart, to avoid hammering five external APIs every time you run `npm run dev`.

## Library and Search are strictly separate

**The Library is only what someone put there.** A paper appears in the library — and in any
Field's browsable list — only after a deliberate act: The Combine imported it and it cleared
the checks (or an admin approved it from the queue), someone submitted it, or someone clicked
"Add to Graze" on a search result. There is no path where a paper shows up because it exists
in OpenAlex.

Enforced by the data model, not by convention: the only three code paths that create a `Post`
are The Combine's ingestion, "Add to Graze" (which shares that same function), and `/submit`.
Live results are transient objects from an API call — nothing writes them. Every browse query
filters to `status: PUBLISHED`, so even a promoted paper waiting in the review queue stays out
of the library until a person approves it.

**Search is the only way to reach anything else**, and it lives in exactly one place: the box
on the homepage. The Library page has a *filter* over what's already posted — not a search of
the literature — and Field pages have no search box at all. "Add to Graze" is the one bridge
between the two, and the live section of a search result page says outright that nothing there
is stored unless you keep it.

The one other place external data appears is Related papers on a paper's own page: outbound
links, labelled as not being in Graze, with no way to file them into the library from there.

## Fields are many-to-many

A paper belongs to as many Fields as it fits — `PostField` joins `Post` and `Board`, and
records *how* each assignment was made (`COMBINE`, `KEYWORD_MATCH`, `USER`, `BACKFILL`), so
an odd-looking filing is debuggable later. A paper filed only under Fields that have all
been suspended drops out of listings; one that still has a live Field stays visible.

One matcher (`lib/fieldMatch.ts`) runs at all four points a paper can be filed, instead of
The Combine having one answer and the other entry points having none:

- **The Combine** — the Field whose keywords surfaced the paper, plus any other Field the
  same matcher says it belongs in.
- **"Add to Graze"** from live search — suggestions are computed server-side with the results
  and arrive pre-ticked, adjustable before confirming. No blank dropdown, nothing silent.
- **`/submit`** — suggestions recompute as the title and abstract are typed (debounced), also
  pre-ticked and editable. Unticking one is remembered, so a later re-suggestion doesn't put
  it back.
- **New Field creation** — its keywords run once against papers already in the library and
  auto-tag the matches, so a new Field opens with something in it and has a chance at the
  provisional → active traction threshold.

The matching is deliberately dumb and inspectable: word-boundary substring hits, a title hit
worth double a body hit, and the matched keywords surfaced in the UI ("Suggested — matched:
fraud detection, credit risk") so a suggestion can be checked rather than trusted. No model
is asked what a paper is about.

## Reliability filtering

Four checkable, source-based signals decide what enters the curated library. None of them is
a model's opinion — for the same reason there's no automated "bias checker": DOAJ membership
and a retraction record are facts an API can answer for, and "quality" isn't.

1. **Peer-review status.** Crossref/OpenAlex's own `type` field separates `journal-article`
   from `posted-content`/`preprint`. Only peer-reviewed types publish automatically; a
   preprint is never quietly promoted into the library as though it had been reviewed.
   Preprints stay fully readable through live search, labelled as what they are.
2. **DOAJ**, as before — the journal has to be listed.
3. **Retraction Watch**, as a second and independent check (`lib/combine/retractionWatch.ts`).
   Retraction Watch's database is distributed through Crossref, so this is a per-DOI
   retraction lookup plus a per-journal retraction rate, both cached. A journal is an outlier
   at ≥5 retractions and ≥0.5% of its output — roughly an order of magnitude above the
   literature-wide rate, so it's arithmetic rather than a judgment call.
4. **Retraction at import, not only on re-sync.** A paper already known to be retracted is
   rejected outright, so it never enters the library and then gets caught later. The periodic
   re-sync still runs, for papers retracted after they were imported.

**When two sources disagree, nothing here picks a winner.** DOAJ-listed but a retraction
outlier (or the reverse) routes the paper to `/admin/queue` with the reason attached, in a
sentence an admin can act on. That's the whole policy, stated once in
`lib/combine/reliability.ts`.

All of it surfaces as **one composite line per paper** rather than a row of small badges
(`components/ReliabilitySignal.tsx`), worst-first: `Retracted` → `Flagged — under review` →
`Preprint · not yet peer-reviewed` → `Peer-reviewed · DOAJ-listed` → `Peer-reviewed · journal
not DOAJ-listed` → `User-submitted · unverified`. Each one names the source it came from, so
a reader can go and check it.

## Search all literature (`/search`)

A second, separate tier from the curated library above: `/search` queries OpenAlex's live index of 250M+ scholarly works directly, in real time, on every search — nothing is stored just from searching. Each result can be added straight to your **board** (it keeps enough metadata inline to render as a card even though the paper was never imported), and has an **"Add to Graze"** button (any signed-in user, not admin-only) that runs it through the exact same pipeline as The Combine (`lib/combine/run.ts`'s `promoteCandidate`, shared by both callers): DOAJ/allowlist check, dedup by DOI, explainer generation. The one difference from the automated pipeline: a result whose journal isn't allowlisted still gets added, just to `/admin/queue` for review, rather than dropped outright — a human specifically chose that one paper.

## Anonymous posting

- **Anonymous posting**: a "Post anonymously" checkbox on `/submit` and every comment form. An anonymous post/comment displays as "Cow #XXXX" with a generic cow avatar — a random 4-digit number assigned once per account (`lib/cow.ts`) and reused for all of that account's anonymous activity, never shown alongside a real name. The real `authorId` is always stored (needed for moderation and so you can find your own anonymous posts), but the public profile post list explicitly excludes anonymous posts — `app/profile/[id]/page.tsx` filters them out of what's shown publicly and surfaces them only in a "Your anonymous posts" section visible solely when you're viewing your own profile.

## Notes

- Uploaded PDFs go to Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set, and to `public/uploads` otherwise. The local path is for development only: on a serverless host that directory is per-instance and ephemeral, so an upload written there is lost. `lib/storage.ts` logs a warning if it takes the local path in production.
- The Combine's schedule is `/api/cron/combine`, driven by Vercel Cron (`vercel.json`). The `setInterval` in `instrumentation.ts` is the local-development equivalent and is skipped on Vercel — a timer set inside a serverless instance almost never survives long enough to fire.
- The Board is the only way to keep a paper — there is no separate saved list, and no `/saved` route.
- Credibility signals attach to **papers**, not people: citation count, DOAJ-listed journal vs. user-submitted, and retraction status. There is no author verification badge, no institutional affiliations, and no profile contact links — all three were leftovers from an earlier company-marketplace concept.
- Reputation on a profile page is the net vote score (upvotes − downvotes) summed across a user's posts and comments (including anonymous ones — the number is private to the profile, it doesn't reveal which posts were anonymous).
