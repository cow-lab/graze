import Link from "next/link";
import { Quote, Sparkles } from "lucide-react";
import type { PostListItem } from "@/lib/posts";
import FieldTested from "@/components/FieldTested";
import { fieldTestedState } from "@/lib/fieldTested";
import FieldChips from "@/components/FieldChips";
import AuthorDisplay from "@/components/AuthorDisplay";
import ChewButton from "@/components/ChewButton";
import JargonText from "@/components/JargonText";
import LanguageBadge from "@/components/LanguageBadge";
import { parseTerms } from "@/lib/jargon";
import { formatAuthors, plural } from "@/lib/utils";
import VoteButtons from "@/components/VoteButtons";
import AddToBoardButton from "@/components/AddToBoardButton";

export default function ResearchCard({
  post,
  isLoggedIn,
  isOnBoard = false,
}: {
  post: PostListItem;
  isLoggedIn: boolean;
  isOnBoard?: boolean;
}) {
  const terms = parseTerms(post.explainer?.termsJson);

  return (
    // Same overlay-link pattern as PostCard: jargon terms are buttons and can't live
    // inside an <a>, so the link covers the card instead of wrapping the content.
    <article className="relative rounded-lg border border-border-strong bg-panel px-4 py-3.5 shadow-sm transition hover:border-moss/60 hover:shadow-md">
      <Link
        href={`/post/${post.id}`}
        className="absolute inset-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
      >
        <span className="sr-only">{post.title}</span>
      </Link>

      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <FieldTested
            size="compact"
            state={fieldTestedState({
              reliability: post.reliability,
              retracted: !!post.retractedAt,
            })}
            breakdown={{
              peerReviewed:
                post.reliability === "PREPRINT"
                  ? false
                  : post.workType
                    ? true
                    : null,
              doajListed:
                post.reliability === "PEER_REVIEWED_LISTED" ? true : null,
              retracted: !!post.retractedAt,
              retractionChecked: post.source === "COMBINE",
              citationCount: post.citationCount,
            }}
            source={post.source}
            sourceName={post.sourceName}
          />
          <LanguageBadge code={post.language} />
        </div>
        <h3 className="font-heading text-[15px] font-semibold leading-snug text-ink">
          <JargonText text={post.title} terms={terms} />
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
          {formatAuthors(post.authors)} · {post.field} · {post.year}
          {post.citationCount != null && (
            <>
              {" · "}
              <span className="inline-flex items-center gap-1 align-middle">
                <Quote size={11} aria-hidden="true" />{" "}
                <span className="tabular-nums">
                  {post.citationCount.toLocaleString()}
                </span>{" "}
                citations
              </span>
            </>
          )}
        </p>
        {post.explainer?.tldr && (
          <p className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-relaxed text-fg">
            <Sparkles
              size={13}
              className="mt-0.5 shrink-0 text-teal"
              aria-hidden="true"
            />
            <span className="line-clamp-2">{post.explainer.tldr}</span>
          </p>
        )}

        <div className="relative z-10 mt-3 flex w-fit flex-wrap items-center gap-2">
          <ChewButton
            postId={post.id}
            paper={{ postId: post.id, doi: post.doi }}
            sourceUrl={post.externalUrl ?? post.fileUrl}
            language={post.language}
          />
          <AddToBoardButton
            postId={post.id}
            initialOnBoard={isOnBoard}
            isLoggedIn={isLoggedIn}
          />
          <div className="inline-flex items-center rounded-md border border-border-strong bg-panel px-1.5 py-0.5 shadow-sm">
            <VoteButtons
              postId={post.id}
              score={post.score}
              userVote={post.userVote}
              isLoggedIn={isLoggedIn}
              orientation="horizontal"
            />
          </div>
        </div>

        <div className="relative z-10 mt-2.5 flex w-fit flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] tabular-nums text-fg-muted">
          <AuthorDisplay
            userId={post.author.id}
            name={post.author.name}
            isAnonymous={post.isAnonymous}
            cowNumber={post.author.cowNumber}
            linkToProfile={false}
          />
          <span aria-hidden="true">·</span>
          <span>{plural(post.viewCount, "view")}</span>
          <span aria-hidden="true">·</span>
          <FieldChips fields={post.fields} />
        </div>
      </div>
    </article>
  );
}
