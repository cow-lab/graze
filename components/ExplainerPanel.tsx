"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, CheckCircle2, XCircle, X } from "lucide-react";

type Term = { term: string; definition: string };
type QuizQuestion = { question: string; options: string[]; correctIndex: number };

export default function ExplainerPanel({
  postId,
  summary,
  terms,
  quiz,
  isDemo,
}: {
  postId: string;
  summary: string;
  terms: Term[];
  quiz: QuizQuestion[];
  isDemo: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(() => quiz.map(() => null));
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = answers.every((a) => a !== null);
  const correctCount = quiz.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0);

  function selectAnswer(qi: number, oi: number) {
    if (submitted) return;
    setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)));
  }

  function reset() {
    setAnswers(quiz.map(() => null));
    setSubmitted(false);
  }

  // Standard modal hygiene: Escape closes it, and the page underneath doesn't scroll
  // while it's open — matters even more on mobile, where the panel is full-screen and
  // there's no visible backdrop to signal "this is an overlay."
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  let verdict: { title: string; sub: string; tone: string } | null = null;
  if (submitted) {
    if (correctCount === quiz.length) {
      verdict = {
        title: "You're ready to contribute",
        sub: "Head to the comments below, or post something referencing this paper.",
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
        sub: "Try asking the author a question in the comments before diving in.",
        tone: "text-rose border-rose/30 bg-rose/10",
      };
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium border border-teal/40 bg-teal/15 text-teal hover:brightness-110 transition"
      >
        <Sparkles size={14} />
        {open ? "Hide this" : "Chew on this"}
      </button>

      {open && (
        // Full-screen on mobile (no backdrop needed — it covers everything), a centered
        // fixed-width dialog with a dimmed backdrop from sm: up.
        <div
          className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:bg-ink/40 sm:backdrop-blur-[1px] sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-panel w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-lg sm:border sm:border-border-strong sm:shadow-lg overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-panel/95 backdrop-blur-sm border-b border-border px-5 py-3">
              <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-fg-muted flex items-center gap-1.5">
                <Sparkles size={14} className="text-teal" /> Chew on this
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="p-1 -mr-1 text-fg-muted hover:text-ink transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
          {isDemo && (
            <p className="font-mono text-[10px] uppercase tracking-wide text-fg-muted mb-3">
              Demo explainer — set ANTHROPIC_API_KEY for live generation
            </p>
          )}

          <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-fg-muted mb-1.5">
            Plain-language summary
          </h3>
          <p className="text-sm leading-relaxed mb-4">{summary}</p>

          <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-fg-muted mb-1.5">
            Glossary
          </h3>
          <dl className="mb-5 flex flex-col gap-1.5">
            {terms.map((t) => (
              <div key={t.term} className="text-sm">
                <dt className="inline font-medium">{t.term}</dt>
                <dd className="inline text-fg-muted"> — {t.definition}</dd>
              </div>
            ))}
          </dl>

          <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-fg-muted mb-2">
            Comprehension check
          </h3>
          <div className="flex flex-col gap-4">
            {quiz.map((q, qi) => (
              <div key={qi}>
                <p className="text-sm font-medium mb-1.5">{q.question}</p>
                <div className="flex flex-col gap-1">
                  {q.options.map((opt, oi) => {
                    const isSelected = answers[qi] === oi;
                    const isCorrect = oi === q.correctIndex;
                    let optClass = "border-border-strong hover:border-ink/40";
                    if (submitted && isSelected && isCorrect) {
                      optClass = "border-teal bg-teal/10 text-teal";
                    } else if (submitted && isSelected && !isCorrect) {
                      optClass = "border-rose bg-rose/10 text-rose";
                    } else if (submitted && isCorrect) {
                      optClass = "border-teal/50 text-teal/80";
                    } else if (isSelected) {
                      optClass = "border-ink bg-ink/5";
                    }
                    return (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => selectAnswer(qi, oi)}
                        disabled={submitted}
                        className={`flex items-center justify-between gap-2 text-left text-sm px-3 py-1.5 rounded border transition-colors disabled:cursor-default ${optClass}`}
                      >
                        <span>{opt}</span>
                        {submitted && isCorrect && <CheckCircle2 size={14} className="shrink-0" />}
                        {submitted && isSelected && !isCorrect && (
                          <XCircle size={14} className="shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            {!submitted ? (
              <button
                type="button"
                onClick={() => setSubmitted(true)}
                disabled={!allAnswered}
                className="px-4 py-1.5 rounded-md bg-moss text-white text-sm font-medium hover:brightness-110 transition disabled:opacity-40"
              >
                Check my answers
              </button>
            ) : (
              <button
                type="button"
                onClick={reset}
                className="px-4 py-1.5 rounded-md border border-border-strong text-sm font-medium hover:bg-ink/5 transition"
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

          {verdict && (
            <div className={`mt-4 rounded-md border px-3 py-2.5 ${verdict.tone}`}>
              <p className="text-sm font-semibold">{verdict.title}</p>
              <p className="text-xs mt-0.5 opacity-90">{verdict.sub}</p>
              {correctCount === quiz.length && (
                <Link
                  href={`/submit?type=POST&refPostId=${postId}`}
                  className="inline-block mt-2 text-xs font-medium underline"
                >
                  Post something referencing this paper →
                </Link>
              )}
            </div>
          )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
