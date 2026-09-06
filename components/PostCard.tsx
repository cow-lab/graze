import Link from "next/link";
import { Quote, Sparkles } from "lucide-react";
import type { PostListItem } from "@/lib/posts";
import VoteButtons from "@/components/VoteButtons";
import AddToBoardButton from "@/components/AddToBoardButton";
import FieldTested from "@/components/FieldTested";
import { fieldTestedState } from "@/lib/fieldTested";
import FieldChips from "@/components/FieldChips";
import AuthorDisplay from "@/components/AuthorDisplay";
import ChewButton from "@/components/ChewButton";
import JargonText from "@/components/JargonText";
import LanguageBadge from "@/components/LanguageBadge";
import { parseTerms } from "@/lib/jargon";
import { timeAgo } from "@/lib/utils";

// One line, not a paragraph. A card's job is to help someone decide whether to open the
// paper; the abstract itself is one click away on the paper's own page.
//
// The TL;DR wins when there is one: it's written to be read cold, whereas the abstract's
// first 110 characters are usually the authors clearing their throat.
const SNIPPET_CHARS = 110;

function snippetFor(post: PostListItem): string {
  const text = post.abstract;
  if (!text) return "";
  return text.length > SNIPPET_CHARS ? `${text.slice(0, SNIPPET_CHARS).trimEnd()}…` : text;
}

export default function PostCard({
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
    // `relative` anchors the card-wide overlay link below. Jargon terms are <button>s, so
    // the title can't simply be wrapped in an <a> — interactive elements can't nest inside
    // one. Instead an absolutely-positioned link covers the card for the "click anywhere"
    // behaviour, and the genuinely interactive bits sit above it on z-10.
    <div className="relative flex gap-3 bg-panel/95 border border-border-strong rounded-lg px-3 py-3 shadow-sm hover:border-moss/50 transition-colors">
      <Link
        href={`/post/${post.id}`}
        className="absolute inset-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
      >
        <span className="sr-only">{post.title}</span>
      </Link>

      <div className="relative z-10">
        <VoteButtons
          postId={post.id}
          score={post.score}
          userVote={post.userVote}
          isLoggedIn={isLoggedIn}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="relative z-10 flex items-center gap-2 mb-1 flex-wrap w-fit">
          <FieldChips fields={post.fields} />
          <FieldTested
            size="compact"
            state={fieldTestedState({
              reliability: post.reliability,
              retracted: !!post.retractedAt,
            })}
            breakdown={{
              peerReviewed: post.reliability === "PREPRINT" ? false : post.workType ? true : null,
              doajListed: post.reliability === "PEER_REVIEWED_LISTED" ? true : null,
              retracted: !!post.retractedAt,
              retractionChecked: post.source === "COMBINE",
              citationCount: post.citationCount,
            }}
            source={post.source}
            sourceName={post.sourceName}
          />
          <LanguageBadge code={post.language} />
        </div>
        <h3 className="font-heading text-base font-medium text-fg leading-snug">
          <JargonText text={post.title} terms={terms} />
        </h3>
        {post.explainer?.tldr ? (
          // The lowest-effort tier of "Chew on this", visible without clicking anything.
          <p className="mt-1 flex items-start gap-1.5 text-sm text-fg">
            <Sparkles size={13} className="mt-0.5 shrink-0 text-teal" aria-hidden="true" />
            <span className="line-clamp-2">{post.explainer.tldr}</span>
          </p>
        ) : (
          snippetFor(post) && (
            <p className="text-sm text-fg-muted mt-1 line-clamp-1">
              <JargonText text={snippetFor(post)} terms={terms} />
            </p>
          )
        )}

        {/* The primary action on a paper. Everything else on this card is secondary to it. */}
        <div className="relative z-10 mt-2.5 flex items-center gap-2 flex-wrap w-fit">
          <ChewButton
            postId={post.id}
            paper={{ postId: post.id, doi: post.doi }}
            sourceUrl={post.externalUrl ?? post.fileUrl}
            language={post.language}
          />
        </div>
        <div className="relative z-10 flex items-center gap-2 mt-2 font-mono text-[11px] text-fg-muted flex-wrap w-fit">
          <AuthorDisplay
            userId={post.author.id}
            name={post.author.name}
            isAnonymous={post.isAnonymous}
            cowNumber={post.author.cowNumber}
          />
          <span>·</span>
          <AddToBoardButton
            postId={post.id}
            initialOnBoard={isOnBoard}
            isLoggedIn={isLoggedIn}
            compact
          />
          <span>·</span>
          <span>
            {post._count.comments} {post._count.comments === 1 ? "comment" : "comments"}
          </span>
          <span>·</span>
          <span>{timeAgo(post.createdAt)}</span>
          {post.citationCount != null && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Quote size={11} aria-hidden="true" /> {post.citationCount.toLocaleString()} citations
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
