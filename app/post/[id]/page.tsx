import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPostDetail } from "@/lib/posts";
import { getCommentTree } from "@/lib/comments";
import { recordView } from "@/lib/actions/posts";
import VoteButtons from "@/components/VoteButtons";
import ExplainerPanel from "@/components/ExplainerPanel";
import CommentForm from "@/components/CommentForm";
import CommentThread from "@/components/CommentThread";
import FieldTested from "@/components/FieldTested";
import { fieldTestedState } from "@/lib/fieldTested";
import FieldChips from "@/components/FieldChips";
import LanguageBadge from "@/components/LanguageBadge";
import AuthorDisplay from "@/components/AuthorDisplay";
import SourceLink from "@/components/SourceLink";
import { Quote } from "lucide-react";
import DeletePostButton from "@/components/DeletePostButton";
import AddToBoardButton from "@/components/AddToBoardButton";
import RelatedPapers from "@/components/RelatedPapers";
import { getRelatedPapers } from "@/lib/relatedPapers";
import { assessJournal } from "@/lib/credibility";
import { parseKeyFindings } from "@/lib/explainer";
import { prisma } from "@/lib/prisma";
import { plural, timeAgo } from "@/lib/utils";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const post = await getPostDetail(id, session?.user?.id);
  if (!post) notFound();

  const isLoggedIn = !!session?.user;
  const isAuthor = session?.user?.id === post.author.id;

  await recordView(post.id);

  const [comments, boardCard, relatedPapers, journal] = await Promise.all([
    getCommentTree(post.id, session?.user?.id),
    session?.user?.id
      ? prisma.canvasCard.findFirst({ where: { userId: session.user.id, postId: post.id } })
      : null,
    post.doi ? getRelatedPapers(post.doi) : Promise.resolve([]),
    // The thorough check: one journal, every source including the per-journal ones the
    // search page skips. Cached for a month after the first look.
    assessJournal(post.issn),
  ]);

  // What the "go and read it" links should point at, best first: a free full text if the
  // paper carries one, otherwise the publisher's page via its DOI.
  const sourceUrl =
    post.externalUrl ?? post.fileUrl ?? (post.doi ? `https://doi.org/${post.doi}` : null);
  const paperRef = { postId: post.id, doi: post.doi };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="bg-panel/95 border border-border-strong rounded-lg p-5 shadow-sm">
        <div className="flex gap-4">
          <VoteButtons
            postId={post.id}
            score={post.score}
            userVote={post.userVote}
            isLoggedIn={isLoggedIn}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <FieldChips fields={post.fields} />
                <FieldTested
                  state={fieldTestedState({
                    reliability: post.reliability,
                    retracted: !!post.retractedAt,
                  })}
                  breakdown={{
                    peerReviewed:
                      post.reliability === "PREPRINT" ? false : post.workType ? true : null,
                    doajListed:
                      post.reliability === "PEER_REVIEWED_LISTED"
                        ? true
                        : journal.indexes.find((index) => index.name === "DOAJ")?.state === "in"
                          ? true
                          : null,
                    retracted: !!post.retractedAt,
                    retractionChecked: post.source === "COMBINE",
                    citationCount: post.citationCount,
                  }}
                  journal={journal}
                  source={post.source}
                  sourceName={post.sourceName}
                />
                <LanguageBadge code={post.language} />
              </div>
              <div className="flex items-center gap-2">
                <AddToBoardButton
                  postId={post.id}
                  initialOnBoard={!!boardCard}
                  isLoggedIn={isLoggedIn}
                />
                {isAuthor && <DeletePostButton postId={post.id} />}
              </div>
            </div>
            <h1 className="font-heading text-2xl font-semibold leading-tight">{post.title}</h1>
            <div className="flex items-center gap-2 mt-2 font-mono text-[11px] text-fg-muted flex-wrap">
              <AuthorDisplay
                userId={post.author.id}
                name={post.author.name}
                isAnonymous={post.isAnonymous}
                cowNumber={post.author.cowNumber}
              />
              <span>·</span>
              <span>{timeAgo(post.createdAt)}</span>
              <span>·</span>
              <span>{plural(post.viewCount, "view")}</span>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <div className="font-mono text-xs text-fg-muted flex flex-wrap gap-x-4 gap-y-1">
                <span>Authors: {post.authors}</span>
                <span>Field: {post.field}</span>
                <span>Year: {post.year}</span>
                {post.doi && <span>DOI: {post.doi}</span>}
                {post.citationCount != null && (
                  <span className="inline-flex items-center gap-1">
                    <Quote size={11} aria-hidden="true" /> {post.citationCount.toLocaleString()} citations
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.abstract}</p>
              <div className="flex items-center gap-3 flex-wrap">
                {post.externalUrl && (
                  <SourceLink
                    href={post.externalUrl}
                    paper={paperRef}
                    showIcon={false}
                    className="px-3 py-1.5 rounded-md border border-border text-sm text-fg hover:border-moss hover:text-moss transition"
                  >
                    View external link ↗
                  </SourceLink>
                )}
                {post.fileUrl && (
                  <SourceLink
                    href={post.fileUrl}
                    paper={paperRef}
                    showIcon={false}
                    className="px-3 py-1.5 rounded-md border border-border text-sm text-fg hover:border-moss hover:text-moss transition"
                  >
                    Download PDF ↓
                  </SourceLink>
                )}
                {post.explainer && (
                  <ExplainerPanel
                    discussHref="#comments"
                    sourceUrl={sourceUrl}
                    paper={paperRef}
                    language={post.language}
                    explainer={{
                      tldr: post.explainer.tldr,
                      keyFindings: parseKeyFindings(post.explainer.keyFindingsJson),
                      summary: post.explainer.summary,
                      terms: JSON.parse(post.explainer.termsJson),
                      quiz: JSON.parse(post.explainer.quizJson),
                      isDemo: post.explainer.isDemo,
                    }}
                  />
                )}
              </div>

              <RelatedPapers papers={relatedPapers} />
            </div>
          </div>
        </div>
      </div>

      <div id="comments" className="bg-panel/95 border border-border-strong rounded-lg p-5 shadow-sm">
        <h2 className="font-heading text-base font-semibold mb-1">
          {post._count.comments} Comments
        </h2>
        <p className="text-sm text-fg-muted mb-3">
          The summary above is machine-written and the abstract is the authors&apos; own pitch.
          This is where people who read the paper say what it actually found, what the summary
          missed, and which part is worth your time.
        </p>
        {isLoggedIn ? (
          <CommentForm postId={post.id} />
        ) : (
          <p className="text-sm text-fg-muted">
            <Link href="/login" className="text-moss hover:underline">
              Log in
            </Link>{" "}
            to join the discussion.
          </p>
        )}
        <div className="mt-4 flex flex-col divide-y divide-border">
          {comments.map((c) => (
            <CommentThread
              key={c.id}
              comment={c}
              postId={post.id}
              isLoggedIn={isLoggedIn}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
