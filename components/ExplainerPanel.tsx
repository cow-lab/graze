"use client";

import { useState, useEffect, useRef, useId, useCallback } from "react";
import Link from "next/link";
import { Sparkles, CheckCircle2, XCircle, X } from "lucide-react";
import ListenButton from "@/components/ListenButton";
import RunningCowLoader from "@/components/RunningCowLoader";
import Portal from "@/components/Portal";
import SourceLink from "@/components/SourceLink";
import { logChewCurated } from "@/lib/actions/metrics";
import {
  recordComprehensionPass,
  type PaperRef,
} from "@/lib/actions/engagement";
import { markChewed } from "@/lib/chewSession";
import ReadingControls, {
  useReadingPrefs,
  TEXT_SIZE_CLASS,
} from "@/components/ReadingControls";
import { isNonEnglish, languageName } from "@/lib/language";

export type Term = { term: string; definition: string };
export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
};
export type ExplainerData = {
  tldr: string | null;
  keyFindings: string[];
  summary: string;
  terms: Term[];
  quiz: QuizQuestion[];
  isDemo: boolean;
};

type LoadResult =
  { ok: true; explainer: ExplainerData } | { ok: false; message: string };

export default function ExplainerPanel({
  explainer,
  load,
  discussHref,
  sourceUrl,
  paper,
  language,
}: {
  /** Preloaded explainer (curated library, where it's already stored). */
  explainer?: ExplainerData;
  /** Lazy loader for papers not in the library — generates on first open, then caches. */
  load?: () => Promise<LoadResult>;
  /** Optional link to this paper's comments, offered once the check is passed. */
  discussHref?: string;
  /** The original paper. The whole point of the summary is to get someone here. */
  sourceUrl?: string | null;
  /** Which paper this is, for engagement tracking. */
  paper: PaperRef;
  /** ISO 639-1 code of the paper's original language, when it isn't English. */
  language?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ExplainerData | null>(explainer ?? null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Seeded straight from the preloaded explainer; the lazy path fills this in once the
  // generated explainer arrives (see handleOpen).
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => explainer?.quiz.map(() => null) ?? [],
  );
  const [submitted, setSubmitted] = useState(false);

  const { size, dyslexic } = useReadingPrefs();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const quiz = data?.quiz ?? [];
  const allAnswered =
    quiz.length > 0 &&
    answers.length === quiz.length &&
    answers.every((a) => a !== null);
  const correctCount = quiz.reduce(
    (acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0),
    0,
  );

  const close = useCallback(() => {
    setOpen(false);
    // Send focus back where it came from, or the trigger vanishes from under the user.
    triggerRef.current?.focus();
  }, []);

  async function handleOpen() {
    setOpen(true);
    setLoadError(null);
    // Remembered for the rest of the session so a later click on the source link can be
    // counted as "went to the paper after reading the summary" — the path that matters.
    markChewed(paper.postId ?? paper.doi ?? null);
    // Preloaded means this paper is in the curated library; the lazy path records itself
    // server-side when it generates or hits cache.
    if (explainer) void logChewCurated();
    if (data || !load) return;
    setLoading(true);
    setLoadError(null);
    try {
      const result = await load();
      if (result.ok) {
        setData(result.explainer);
        setAnswers(result.explainer.quiz.map(() => null));
      } else {
        setLoadError(result.message);
      }
    } catch {
      // A server action can reject outright (network dropped, the deployment restarted
      // mid-call). Without this the panel sat on the loading cow forever, which reads as
      // "still working" rather than "this failed" — the one state a spinner must never mean.
      setLoadError(
        "Couldn't generate this explainer just now. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    setSubmitted(true);
    // Passing the check is real evidence someone engaged with the paper rather than
    // skimming a summary, so it's recorded — it's what earns their comments a marker.
    if (quiz.length > 0 && correctCount === quiz.length) {
      void recordComprehensionPass(paper);
    }
  }

  function selectAnswer(qi: number, oi: number) {
    if (submitted) return;
    setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)));
  }

  function reset() {
    setAnswers(quiz.map(() => null));
    setSubmitted(false);
  }

  // Modal behaviour: Escape closes, the page beneath doesn't scroll, focus moves into the
  // dialog on open, and Tab is trapped inside it so keyboard users can't wander off into
  // the inert page behind the overlay.
  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    dialog?.focus();

    function focusable(): HTMLElement[] {
      if (!dialog) return [];
      const all = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      // Mirror native radio behaviour: a radio group contributes exactly one tab stop —
      // the checked option, or the first when nothing is chosen yet. Arrow keys still move
      // within the group, which is the expected pattern for a single-choice question.
      const radios = all.filter(
        (el): el is HTMLInputElement =>
          el instanceof HTMLInputElement && el.type === "radio",
      );
      return all.filter((el) => {
        if (!(el instanceof HTMLInputElement) || el.type !== "radio")
          return true;
        const group = radios.filter((r) => r.name === el.name);
        return el === (group.find((r) => r.checked) ?? group[0]);
      });
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== "Tab") return;

      // Drive Tab entirely from here rather than only patching the first/last elements.
      // Letting the browser handle the in-between cases let focus escape the modal onto
      // the page behind it, because the set of tabbable elements shifts as the quiz is
      // answered (the submit button enables, radio tab stops move between options).
      const items = focusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }

      e.preventDefault();
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (index === -1) {
        (e.shiftKey ? items[items.length - 1] : items[0]).focus();
        return;
      }
      const next = e.shiftKey
        ? (index - 1 + items.length) % items.length
        : (index + 1) % items.length;
      items[next].focus();
    }

    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, data]);

  let verdict: { title: string; sub: string; tone: string } | null = null;
  if (submitted && quiz.length > 0) {
    if (correctCount === quiz.length) {
      verdict = {
        title: "You're ready to read the real thing",
        sub: "This summary is a starting point, not the paper. Go to the source, then leave a comment on what it actually says.",
        tone: "text-teal border-teal/30 bg-teal/10",
      };
    } else if (correctCount > 0) {
      verdict = {
        title: "Almost there",
        sub: "Re-read the summary and glossary above, then give the quiz another try.",
        tone: "text-moss border-moss/30 bg-moss/10",
      };
    } else {
      verdict = {
        title: "Not quite there yet",
        sub: "Re-read the summary, or ask what you're missing in the comments before diving in.",
        tone: "text-rose border-rose/30 bg-rose/10",
      };
    }
  }

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 rounded-md bg-teal px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      >
        <Sparkles size={18} aria-hidden="true" />
        Chew on this
        <span className="sr-only">
          {" "}
          — read a plain-language explainer and take a comprehension check
        </span>
      </button>

      {open && (
        // Portalled to <body>: rendered in place, this dialog's z-50 resolves inside the
        // card's own `relative z-10` box, and the next card's z-10 button paints over it.
        <Portal>
          {/* Full-screen on mobile, centred dialog with a dimmed backdrop from sm: up. */}
          <div
            className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:bg-ink/40 sm:backdrop-blur-[1px] sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              className="bg-panel w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-lg sm:border sm:border-border-strong sm:shadow-lg overflow-y-auto focus:outline-none"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-panel/95 backdrop-blur-sm border-b border-border px-5 py-3">
                <h2
                  id={titleId}
                  className="font-heading text-sm font-semibold uppercase tracking-wide text-fg-muted flex items-center gap-1.5"
                >
                  <Sparkles
                    size={14}
                    className="text-teal"
                    aria-hidden="true"
                  />{" "}
                  Chew on this
                </h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close explainer"
                  className="p-1 -mr-1 text-fg-muted hover:text-ink transition-colors rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              <div className="p-5">
                <div aria-live="polite" aria-atomic="true">
                  {/* Generating an explainer is a Claude call — several seconds, sometimes
                    more. The panel opens immediately and says what it's doing. */}
                  {loading && (
                    <RunningCowLoader
                      message="Chewing on this one…"
                      className="py-6"
                    />
                  )}
                  {loadError && (
                    <p className="text-sm text-rose">{loadError}</p>
                  )}
                </div>

                {data && (
                  <>
                    {data.isDemo && (
                      <p className="font-mono text-[10px] uppercase tracking-wide text-fg-muted mb-3">
                        Demo explainer — set ANTHROPIC_API_KEY for live
                        generation
                      </p>
                    )}

                    {isNonEnglish(language) && (
                      <p className="mb-3 rounded-md border border-border-strong bg-panel-2 px-3 py-2 text-xs text-fg-muted">
                        This paper was published in{" "}
                        <span className="font-medium text-fg">
                          {languageName(language)}
                        </span>
                        . The summary below is in English, so it&apos;s one step
                        removed from the original — worth keeping in mind if you
                        go back to the source to check it.
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-3 flex-wrap mb-1.5">
                      <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-fg-muted">
                        Plain-language summary
                      </h3>
                      <ReadingControls />
                    </div>
                    <p
                      className={`mb-3 ${TEXT_SIZE_CLASS[size]}`}
                      style={
                        dyslexic
                          ? {
                              fontFamily:
                                '"OpenDyslexic", var(--font-sans), sans-serif',
                            }
                          : undefined
                      }
                    >
                      {data.summary}
                    </p>
                    <div className="mb-4 flex items-center gap-3 flex-wrap">
                      <ListenButton text={data.summary} />
                      {sourceUrl && (
                        <SourceLink
                          href={sourceUrl}
                          paper={paper}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-moss/40 bg-moss/10 text-moss text-xs font-medium hover:brightness-105 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
                        >
                          Read the original paper
                        </SourceLink>
                      )}
                    </div>
                    {sourceUrl && (
                      <p className="-mt-2 mb-4 text-xs text-fg-muted">
                        A summary written by a model is a second-hand account.
                        If you&apos;re going to say something about this paper,
                        say it after reading the source.
                      </p>
                    )}

                    {data.keyFindings.length > 0 && (
                      <>
                        <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-fg-muted mb-1.5">
                          Key findings
                        </h3>
                        <ul className="mb-5 flex flex-col gap-1.5">
                          {data.keyFindings.map((finding, i) => (
                            <li
                              key={i}
                              className={`flex gap-2 ${TEXT_SIZE_CLASS[size]}`}
                              style={
                                dyslexic
                                  ? {
                                      fontFamily:
                                        '"OpenDyslexic", var(--font-sans), sans-serif',
                                    }
                                  : undefined
                              }
                            >
                              <span aria-hidden="true" className="text-teal">
                                →
                              </span>
                              <span>{finding}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-fg-muted mb-1.5">
                      Glossary
                    </h3>
                    <dl className="mb-5 flex flex-col gap-1.5">
                      {data.terms.map((t) => (
                        <div key={t.term} className="text-sm">
                          <dt className="inline font-medium">{t.term}</dt>
                          <dd className="inline text-fg-muted">
                            {" "}
                            — {t.definition}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-fg-muted mb-2">
                      Comprehension check
                    </h3>
                    <div className="flex flex-col gap-4">
                      {quiz.map((q, qi) => (
                        // Real radio inputs (visually hidden, styled via the label) rather
                        // than buttons: screen readers announce "option 2 of 4" and grouping
                        // for free, and arrow-key navigation within the group just works.
                        <fieldset key={qi} className="border-0 p-0 m-0">
                          <legend className="text-sm font-medium mb-1.5">
                            {q.question}
                          </legend>
                          <div className="flex flex-col gap-1">
                            {q.options.map((opt, oi) => {
                              const isSelected = answers[qi] === oi;
                              const isCorrect = oi === q.correctIndex;
                              let optClass =
                                "border-border-strong hover:border-ink/40";
                              if (submitted && isSelected && isCorrect) {
                                optClass = "border-teal bg-teal/10 text-teal";
                              } else if (
                                submitted &&
                                isSelected &&
                                !isCorrect
                              ) {
                                optClass = "border-rose bg-rose/10 text-rose";
                              } else if (submitted && isCorrect) {
                                optClass = "border-teal/50 text-teal";
                              } else if (isSelected) {
                                optClass = "border-ink bg-ink/5";
                              }
                              return (
                                <label
                                  key={oi}
                                  className={`flex items-center justify-between gap-2 text-left text-sm px-3 py-1.5 rounded border transition-colors ${optClass} ${
                                    submitted
                                      ? "cursor-default"
                                      : "cursor-pointer"
                                  } has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-moss`}
                                >
                                  <span className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`${titleId}-q${qi}`}
                                      className="sr-only"
                                      checked={isSelected}
                                      disabled={submitted}
                                      onChange={() => selectAnswer(qi, oi)}
                                    />
                                    <span>{opt}</span>
                                  </span>
                                  {submitted && isCorrect && (
                                    <>
                                      <CheckCircle2
                                        size={14}
                                        className="shrink-0"
                                        aria-hidden="true"
                                      />
                                      <span className="sr-only">
                                        Correct answer
                                      </span>
                                    </>
                                  )}
                                  {submitted && isSelected && !isCorrect && (
                                    <>
                                      <XCircle
                                        size={14}
                                        className="shrink-0"
                                        aria-hidden="true"
                                      />
                                      <span className="sr-only">
                                        Your answer, incorrect
                                      </span>
                                    </>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </fieldset>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      {!submitted ? (
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={!allAnswered}
                          className="px-4 py-1.5 rounded-md bg-moss text-white text-sm font-medium hover:brightness-110 transition disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
                        >
                          Check my answers
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={reset}
                          className="px-4 py-1.5 rounded-md border border-border-strong text-sm font-medium hover:bg-ink/5 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
                        >
                          Try again
                        </button>
                      )}
                      {submitted && (
                        <span className="font-mono text-xs text-fg-muted">
                          {correctCount}/{quiz.length} correct
                        </span>
                      )}
                    </div>

                    <div aria-live="polite" aria-atomic="true">
                      {verdict && (
                        <div
                          className={`mt-4 rounded-md border px-3 py-2.5 ${verdict.tone}`}
                        >
                          <p className="text-sm font-semibold">
                            {verdict.title}
                          </p>
                          <p className="text-xs mt-0.5 opacity-90">
                            {verdict.sub}
                          </p>
                          {correctCount === quiz.length && discussHref && (
                            <Link
                              href={discussHref}
                              onClick={close}
                              className="inline-block mt-2 text-xs font-medium underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                            >
                              Add what you took from it in the comments →
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
