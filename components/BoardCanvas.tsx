"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { GripVertical, Trash2, Waypoints, X, Check, Pencil, Telescope } from "lucide-react";
import SourceLink from "@/components/SourceLink";
import InlineError from "@/components/InlineError";
import Spinner from "@/components/Spinner";
import {
  moveCard,
  updateCardNote,
  removeCard,
  createLink,
  updateLinkLabel,
  deleteLink,
} from "@/lib/actions/board";
import { CARD_WIDTH, CARD_HEIGHT, type BoardCard, type BoardLink } from "@/lib/board";

// The connection labels worth offering as one click. Anything else is typed — the label is
// the user's reading of the relationship, so the presets are a shortcut, not a taxonomy.
const PRESET_LABELS = ["contradicts", "builds on", "same method"];

const CANVAS_MIN_WIDTH = 1100;
const CANVAS_MIN_HEIGHT = 700;
const CANVAS_PADDING = 320;
const NUDGE = 20;
const FINE_NUDGE = 5;
// Under this much pointer travel, a press on a connect anchor is a click, not a drag —
// so tapping the anchor falls back to the pick-two-cards flow instead of doing nothing.
const DRAG_THRESHOLD_PX = 6;

type Linking = { fromId: string; x: number; y: number; moved: boolean };

export default function BoardCanvas({
  cards: initialCards,
  links: initialLinks,
}: {
  cards: BoardCard[];
  links: BoardLink[];
}) {
  const [cards, setCards] = useState(initialCards);
  const [links, setLinks] = useState(initialLinks);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [linking, setLinking] = useState<Linking | null>(null);
  const [linkTarget, setLinkTarget] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<{ from: string; to: string } | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canvasRef = useRef<HTMLDivElement>(null);
  // Per-card timers, so nudging one card with the keyboard doesn't cancel the pending
  // save of another.
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  // Latest position per card, readable synchronously. Held-down arrow keys fire faster
  // than React re-renders, and each nudge has to build on the previous one rather than on
  // the position that happens to be rendered — otherwise repeats silently cancel out.
  const positions = useRef(new Map<string, { x: number; y: number }>());

  // Seeded from the server once and then owned locally. Every mutation here is applied
  // optimistically and confirmed by a server action, so re-syncing from props on each
  // revalidation would only ever fight the user mid-drag.

  useEffect(() => {
    const timers = saveTimers.current;
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const cardById = useCallback((id: string) => cards.find((c) => c.id === id), [cards]);

  // Board writes are small and frequent, and a canvas that saves silently is a canvas you
  // can't trust with your own notes. One indicator for all of them.
  const report = useCallback((result: { ok: boolean; message?: string }) => {
    setError(result.ok ? null : (result.message ?? "Something went wrong."));
  }, []);

  const persistPosition = useCallback(
    (id: string, x: number, y: number) => {
      const timers = saveTimers.current;
      const existing = timers.get(id);
      if (existing) clearTimeout(existing);
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          startTransition(async () => {
            report(await moveCard(id, x, y));
          });
        }, 400),
      );
    },
    [report],
  );

  const setPosition = useCallback(
    (id: string, x: number, y: number) => {
      const next = { x: Math.max(0, x), y: Math.max(0, y) };
      positions.current.set(id, next);
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...next } : c)));
      persistPosition(id, next.x, next.y);
      return next;
    },
    [persistPosition],
  );

  function pointerToCanvas(e: { clientX: number; clientY: number }) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function beginConnection(from: string, to: string) {
    if (from === to) return;
    const already = links.some(
      (l) =>
        (l.fromCardId === from && l.toCardId === to) ||
        (l.fromCardId === to && l.toCardId === from),
    );
    if (already) {
      setStatus("Those two are already connected.");
      return;
    }
    setPendingLink({ from, to });
    setStatus("Now say what the connection is.");
  }

  // Click path, kept alongside the drag: it's the one that works from the keyboard.
  function handleConnectClick(cardId: string) {
    if (connectFrom === null) {
      setConnectFrom(cardId);
      setStatus(`Connecting from “${cardById(cardId)?.title ?? "card"}”. Pick a second card.`);
      return;
    }
    if (connectFrom === cardId) {
      setConnectFrom(null);
      setStatus("Connection cancelled.");
      return;
    }
    const from = connectFrom;
    setConnectFrom(null);
    beginConnection(from, cardId);
  }

  // Drag path: press an anchor on a card's edge, drag to another card, let go.
  function handleAnchorDown(cardId: string, e: React.PointerEvent) {
    const point = pointerToCanvas(e);
    if (!point) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setConnectFrom(null);
    setLinking({ fromId: cardId, x: point.x, y: point.y, moved: false });
    setStatus(`Connecting from “${cardById(cardId)?.title ?? "card"}”. Drag to another card.`);
  }

  function handleAnchorMove(e: React.PointerEvent) {
    if (!linking) return;
    const point = pointerToCanvas(e);
    if (!point) return;
    const moved =
      linking.moved ||
      Math.abs(point.x - linking.x) > DRAG_THRESHOLD_PX ||
      Math.abs(point.y - linking.y) > DRAG_THRESHOLD_PX;
    setLinking({ ...linking, x: point.x, y: point.y, moved });

    // Pointer capture routes the events here, so the card under the cursor has to be
    // found by hit-testing rather than by listening on the cards themselves.
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const overId = el?.closest<HTMLElement>("[data-card-id]")?.dataset.cardId ?? null;
    setLinkTarget(overId && overId !== linking.fromId ? overId : null);
  }

  function handleAnchorUp() {
    if (!linking) return;
    const { fromId, moved } = linking;
    const target = linkTarget;
    setLinking(null);
    setLinkTarget(null);

    if (target) {
      beginConnection(fromId, target);
      return;
    }
    if (!moved) {
      // A tap on the anchor: fall through to the two-click flow rather than doing nothing.
      handleConnectClick(fromId);
      return;
    }
    setStatus("Let go over another card to connect them.");
  }

  function saveLink(label: string) {
    if (!pendingLink) return;
    const { from, to } = pendingLink;
    setPendingLink(null);
    startTransition(async () => {
      const result = await createLink(from, to, label);
      if (result.ok) {
        setError(null);
        setLinks((prev) => [...prev, result.data]);
        setStatus(
          `Connected “${cardById(from)?.title}” and “${cardById(to)?.title}”${
            label ? ` as ${label}` : ""
          }.`,
        );
      } else {
        setError(result.message);
        setStatus(result.message);
      }
    });
  }

  function handleRemoveCard(id: string) {
    const title = cardById(id)?.title ?? "card";
    const snapshotCards = cards;
    const snapshotLinks = links;
    setCards((prev) => prev.filter((c) => c.id !== id));
    setLinks((prev) => prev.filter((l) => l.fromCardId !== id && l.toCardId !== id));
    setStatus(`Removed “${title}” from your board.`);
    startTransition(async () => {
      const result = await removeCard(id);
      if (!result.ok) {
        // Put the card and its connections back rather than leaving someone looking at a
        // board that lost a card it still has.
        setCards(snapshotCards);
        setLinks(snapshotLinks);
        setError(result.message);
      }
    });
  }

  function handleDeleteLink(id: string) {
    const snapshot = links;
    setLinks((prev) => prev.filter((l) => l.id !== id));
    setStatus("Connection removed.");
    startTransition(async () => {
      const result = await deleteLink(id);
      if (!result.ok) {
        setLinks(snapshot);
        setError(result.message);
      }
    });
  }

  function handleRelabelLink(id: string, label: string) {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, label } : l)));
    startTransition(async () => {
      report(await updateLinkLabel(id, label));
    });
  }

  const width = Math.max(CANVAS_MIN_WIDTH, ...cards.map((c) => c.x + CARD_WIDTH + CANVAS_PADDING));
  const height = Math.max(
    CANVAS_MIN_HEIGHT,
    ...cards.map((c) => c.y + CARD_HEIGHT + CANVAS_PADDING),
  );

  const centre = (card: BoardCard) => ({
    x: card.x + CARD_WIDTH / 2,
    y: card.y + CARD_HEIGHT / 2,
  });

  const linkingFrom = linking ? cardById(linking.fromId) : null;

  return (
    <div className="flex flex-col gap-4">
      {pendingLink && (
        <LinkLabelForm
          fromTitle={cardById(pendingLink.from)?.title ?? ""}
          toTitle={cardById(pendingLink.to)?.title ?? ""}
          onSave={saveLink}
          onCancel={() => {
            setPendingLink(null);
            setStatus("Connection cancelled.");
          }}
        />
      )}

      {connectFrom && (
        <p className="rounded-md border border-teal/40 bg-panel px-3 py-2 text-sm text-teal shadow-sm">
          Connecting from <strong>{cardById(connectFrom)?.title}</strong> — choose the card it
          relates to.{" "}
          <button
            type="button"
            onClick={() => {
              setConnectFrom(null);
              setStatus("Connection cancelled.");
            }}
            className="underline font-medium"
          >
            Cancel
          </button>
        </p>
      )}

      <p aria-live="polite" className="sr-only">
        {status}
      </p>

      <div className="relative">
        <SaveIndicator saving={isPending} />
        {/* A flat, opaque work surface with a faint dot grid: the page's illustrated
            background is charming everywhere else and unreadable behind small note text. */}
        <div className="overflow-auto rounded-lg border border-border-strong bg-panel-2 shadow-inner max-h-[70vh]">
          <div
            ref={canvasRef}
            className="relative"
            style={{
              width,
              height,
              backgroundImage: "radial-gradient(var(--color-border-strong) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          >
            {/* Lines sit under the cards, so a connection reads as running between two card
                edges without any geometry to clip it there. */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={width}
              height={height}
              aria-hidden="true"
            >
              {links.map((link) => {
                const from = cardById(link.fromCardId);
                const to = cardById(link.toCardId);
                if (!from || !to) return null;
                const a = centre(from);
                const b = centre(to);
                return (
                  <line
                    key={link.id}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="var(--color-moss)"
                    strokeWidth={2}
                    strokeOpacity={0.55}
                  />
                );
              })}
              {/* The line being drawn right now, following the pointer. */}
              {linking && linkingFrom && (
                <line
                  x1={centre(linkingFrom).x}
                  y1={centre(linkingFrom).y}
                  x2={linking.x}
                  y2={linking.y}
                  stroke="var(--color-teal)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                />
              )}
            </svg>

            {cards.length === 0 && <EmptyCanvasHint />}
            {cards.length > 0 && links.length === 0 && <ConnectHint />}

            {cards.map((card) => (
              <CardView
                key={card.id}
                card={card}
                canvasRef={canvasRef}
                connectMode={connectFrom !== null}
                isConnectSource={connectFrom === card.id || linking?.fromId === card.id}
                isLinkTarget={linkTarget === card.id}
                isLinking={linking !== null}
                onAnchorDown={(e) => handleAnchorDown(card.id, e)}
                onAnchorMove={handleAnchorMove}
                onAnchorUp={handleAnchorUp}
                onDragTo={(x, y) => setPosition(card.id, x, y)}
                onNudge={(dx, dy) => {
                  const current = positions.current.get(card.id) ?? { x: card.x, y: card.y };
                  const next = setPosition(card.id, current.x + dx, current.y + dy);
                  setStatus(`${card.title} moved to ${Math.round(next.x)}, ${Math.round(next.y)}.`);
                }}
                onNote={(note) => {
                  setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, note } : c)));
                  startTransition(async () => {
                    report(await updateCardNote(card.id, note));
                  });
                }}
                onConnect={() => handleConnectClick(card.id)}
                onRemove={() => handleRemoveCard(card.id)}
              />
            ))}

            {links.map((link) => {
              const from = cardById(link.fromCardId);
              const to = cardById(link.toCardId);
              if (!from || !to) return null;
              const a = centre(from);
              const b = centre(to);
              return (
                <span
                  key={link.id}
                  aria-hidden="true"
                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-moss/40 bg-panel px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-moss shadow-sm"
                  style={{ left: (a.x + b.x) / 2, top: (a.y + b.y) / 2 }}
                >
                  {link.label || "connected"}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <InlineError message={error} className="text-sm" />

      {cards.length > 0 && (
        <ConnectionList
          links={links}
          cards={cards}
          onRelabel={handleRelabelLink}
          onDelete={handleDeleteLink}
        />
      )}
    </div>
  );
}

// Every board write is optimistic, which is exactly why it needs to say so — otherwise
// "did that save?" has no answer short of reloading.
function SaveIndicator({ saving }: { saving: boolean }) {
  const [justSaved, setJustSaved] = useState(false);
  const wasSaving = useRef(false);

  useEffect(() => {
    if (wasSaving.current && !saving) {
      setJustSaved(true);
      const timer = setTimeout(() => setJustSaved(false), 1800);
      wasSaving.current = saving;
      return () => clearTimeout(timer);
    }
    wasSaving.current = saving;
  }, [saving]);

  if (!saving && !justSaved) return null;

  return (
    <p
      role="status"
      aria-live="polite"
      className="absolute right-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-panel px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-fg-muted shadow-sm"
    >
      {saving ? (
        <>
          <Spinner size={10} className="text-moss" /> Saving…
        </>
      ) : (
        <>
          <Check size={11} className="text-moss" aria-hidden="true" /> Saved
        </>
      )}
    </p>
  );
}

// Shown once, on a board with nothing on it. There's no dismiss button because there's
// nothing to dismiss: the first card replaces it permanently.
function EmptyCanvasHint() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
      <div className="max-w-sm text-center">
        <p className="font-heading text-base text-fg-muted/70">
          Save a paper from Discover to add it here, then drag between two related ones to
          connect them.
        </p>
        <p className="mt-3 pointer-events-auto">
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-moss hover:underline"
          >
            <Telescope size={13} aria-hidden="true" /> Search the literature
          </Link>
          <span className="mx-2 text-fg-muted/50">·</span>
          <Link
            href="/research"
            className="font-mono text-[11px] uppercase tracking-wide text-moss hover:underline"
          >
            Browse the library
          </Link>
        </p>
      </div>
    </div>
  );
}

// The second half of the same nudge, for a board that has cards but nothing joined up
// yet. Gone for good once one connection exists.
function ConnectHint() {
  return (
    <p className="absolute left-1/2 bottom-6 -translate-x-1/2 text-center font-mono text-[11px] uppercase tracking-wide text-fg-muted/60 pointer-events-none">
      Drag from the dot on a card&apos;s edge to another card to connect them
    </p>
  );
}

function CardView({
  card,
  canvasRef,
  connectMode,
  isConnectSource,
  isLinkTarget,
  isLinking,
  onAnchorDown,
  onAnchorMove,
  onAnchorUp,
  onDragTo,
  onNudge,
  onNote,
  onConnect,
  onRemove,
}: {
  card: BoardCard;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  connectMode: boolean;
  isConnectSource: boolean;
  isLinkTarget: boolean;
  isLinking: boolean;
  onAnchorDown: (e: React.PointerEvent) => void;
  onAnchorMove: (e: React.PointerEvent) => void;
  onAnchorUp: (e: React.PointerEvent) => void;
  /** Absolute position, from a pointer drag. */
  onDragTo: (x: number, y: number) => void;
  /** Relative movement, from the arrow keys. */
  onNudge: (dx: number, dy: number) => void;
  onNote: (note: string) => void;
  onConnect: () => void;
  onRemove: () => void;
}) {
  const [note, setNote] = useState(card.note);
  const [editingNote, setEditingNote] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const dragOffset = useRef<{ dx: number; dy: number } | null>(null);

  function pointerPosition(e: React.PointerEvent) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const point = pointerPosition(e);
    if (!point) return;
    dragOffset.current = { dx: point.x - card.x, dy: point.y - card.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragOffset.current) return;
    const point = pointerPosition(e);
    if (!point) return;
    onDragTo(point.x - dragOffset.current.dx, point.y - dragOffset.current.dy);
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragOffset.current) return;
    dragOffset.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  // Dragging with a mouse is the fast path, not the only one: the same handle takes arrow
  // keys, so a keyboard user can arrange their board too.
  function handleKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? FINE_NUDGE : NUDGE;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = moves[e.key];
    if (!delta) return;
    e.preventDefault();
    onNudge(delta[0], delta[1]);
  }

  function saveNote() {
    setEditingNote(false);
    if (note === card.note) return;
    onNote(note);
  }

  const hasNote = card.note.trim().length > 0;

  return (
    <article
      data-card-id={card.id}
      className={`group absolute flex flex-col rounded-lg border bg-panel shadow-sm transition-shadow ${
        isConnectSource
          ? "border-teal ring-2 ring-teal/40"
          : isLinkTarget
            ? "border-teal ring-2 ring-teal/60 shadow-md"
            : "border-border-strong"
      }`}
      style={{ left: card.x, top: card.y, width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      {/* The signifier for the whole feature: four anchors that appear on hover (always,
          on touch) and say what they're for. Drag-to-connect is not a pattern anyone
          arrives already knowing, so it can't be invisible. */}
      {CONNECT_ANCHORS.map((anchor) => (
        <button
          key={anchor.name}
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          title="Drag to another card to connect them"
          onPointerDown={onAnchorDown}
          onPointerMove={onAnchorMove}
          onPointerUp={onAnchorUp}
          onPointerCancel={onAnchorUp}
          className={`absolute z-20 h-3 w-3 rounded-full border-2 border-panel bg-moss shadow-sm cursor-crosshair transition-opacity ${
            anchor.className
          } ${
            isLinking || isConnectSource
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(pointer:coarse)]:opacity-100"
          }`}
        />
      ))}

      <div
        role="button"
        tabIndex={0}
        aria-label={`Move card: ${card.title}. Use the arrow keys, or drag.`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-1 px-2 py-1 border-b border-border text-fg-muted cursor-grab active:cursor-grabbing touch-none rounded-t-lg focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-moss"
      >
        <GripVertical size={14} aria-hidden="true" />
        <span className="font-mono text-[10px] uppercase tracking-wide">Drag</span>
      </div>

      <div className="px-2.5 pt-1.5 min-w-0">
        <h3 className="font-heading text-[13px] font-semibold leading-snug line-clamp-2">
          {card.href ? (
            card.postId ? (
              <Link href={card.href} className="hover:text-moss transition-colors">
                {card.title}
              </Link>
            ) : (
              <SourceLink
                href={card.href}
                paper={{ postId: card.postId, doi: card.doi }}
                className="hover:text-moss transition-colors"
                showIcon={false}
              >
                {card.title}
              </SourceLink>
            )
          ) : (
            card.title
          )}
        </h3>
        <p className="mt-0.5 text-[11px] text-fg-muted line-clamp-1">
          {[card.authors, card.meta].filter(Boolean).join(" · ")}
        </p>
      </div>

      {/* Collapsed by default. A board of twenty cards each showing a full paragraph is
          unreadable as a whole, and the note is for the person who wrote it — they know
          what it says; they need to find it, not re-read it. */}
      <div className="relative px-2.5 pt-1.5 flex-1">
        {editingNote ? (
          <div className="absolute left-2.5 right-2.5 top-1.5 z-30">
            <label className="sr-only" htmlFor={`note-${card.id}`}>
              Your note on {card.title}
            </label>
            <textarea
              id={`note-${card.id}`}
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={saveNote}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setNote(card.note);
                  setEditingNote(false);
                }
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveNote();
              }}
              maxLength={600}
              rows={5}
              placeholder="Why does this matter to you? What did you take from it?"
              className="w-full resize-none rounded border border-moss/50 bg-panel px-2 py-1.5 text-[11px] leading-snug text-fg shadow-lg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-moss"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingNote(true)}
            aria-label={hasNote ? `Edit your note on ${card.title}` : `Add a note on ${card.title}`}
            className={`w-full h-full rounded border px-2 py-1 text-left text-[11px] leading-snug transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss ${
              hasNote
                ? "border-border bg-panel-2/60 text-fg hover:border-moss/50"
                : "border-dashed border-border-strong text-fg-muted hover:border-moss hover:text-moss"
            }`}
          >
            {hasNote ? (
              <span className="line-clamp-2">{card.note}</span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Pencil size={11} aria-hidden="true" /> Add a note
              </span>
            )}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-1 px-2 py-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onConnect}
            className={`inline-flex items-center gap-1 rounded px-1.5 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss ${
              isConnectSource
                ? "text-teal"
                : connectMode
                  ? "text-teal hover:brightness-110"
                  : "text-fg-muted hover:text-moss"
            }`}
          >
            <Waypoints size={12} aria-hidden="true" />
            {isConnectSource ? "Cancel" : connectMode ? "Connect to this" : "Connect"}
          </button>
          {card.sourceUrl && (
            <SourceLink
              href={card.sourceUrl}
              paper={{ postId: card.postId, doi: card.doi }}
              className="inline-flex items-center gap-1 rounded px-1.5 py-1 font-mono text-[10px] uppercase tracking-wide text-fg-muted hover:text-moss transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
            >
              Source
            </SourceLink>
          )}
        </div>

        <div className="flex items-center gap-1">
          {confirmRemove ? (
            <>
              <button
                type="button"
                onClick={onRemove}
                aria-label={`Confirm removing ${card.title} from your board`}
                className="rounded p-1 text-rose hover:bg-rose/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose"
              >
                <Check size={13} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemove(false)}
                aria-label="Keep this card"
                className="rounded p-1 text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
              >
                <X size={13} aria-hidden="true" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              aria-label={`Remove ${card.title} from your board`}
              className="rounded p-1 text-fg-muted hover:text-rose focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose"
            >
              <Trash2 size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// One per edge, so whichever side faces the card you're aiming at has a handle on it.
const CONNECT_ANCHORS = [
  { name: "top", className: "left-1/2 -top-1.5 -translate-x-1/2" },
  { name: "right", className: "-right-1.5 top-1/2 -translate-y-1/2" },
  { name: "bottom", className: "left-1/2 -bottom-1.5 -translate-x-1/2" },
  { name: "left", className: "-left-1.5 top-1/2 -translate-y-1/2" },
];

function LinkLabelForm({
  fromTitle,
  toTitle,
  onSave,
  onCancel,
}: {
  fromTitle: string;
  toTitle: string;
  onSave: (label: string) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(label);
      }}
      className="rounded-lg border border-moss/40 bg-panel p-3 shadow-sm"
    >
      <p className="text-sm mb-2">
        How does <strong>{fromTitle}</strong> relate to <strong>{toTitle}</strong>?
      </p>
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {PRESET_LABELS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onSave(preset)}
            className="rounded-full border border-border-strong bg-panel px-2.5 py-1 font-mono text-[11px] text-fg hover:border-moss hover:text-moss transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
          >
            {preset}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="link-label" className="sr-only">
          Describe the connection
        </label>
        <input
          id="link-label"
          ref={inputRef}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={40}
          placeholder="…or say it in your own words"
          className="flex-1 rounded-md border border-border bg-panel px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-moss"
        />
        <button
          type="submit"
          className="rounded-md bg-moss px-3 py-1.5 text-sm font-medium text-white hover:brightness-110 transition"
        >
          Connect
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border-strong px-3 py-1.5 text-sm hover:bg-ink/5 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// The same connections the lines show, as text — the canvas is a spatial view, and this is
// the one that works with a screen reader, survives a small screen, and reads back as a
// list of claims the user made about their own papers.
function ConnectionList({
  links,
  cards,
  onRelabel,
  onDelete,
}: {
  links: BoardLink[];
  cards: BoardCard[];
  onRelabel: (id: string, label: string) => void;
  onDelete: (id: string) => void;
}) {
  const title = (id: string) => cards.find((c) => c.id === id)?.title ?? "Removed card";

  return (
    <section
      aria-labelledby="connections-heading"
      className="rounded-lg border border-border-strong bg-panel/95 p-4 shadow-sm"
    >
      <h2
        id="connections-heading"
        className="font-mono text-[11px] uppercase tracking-wide text-fg-muted mb-2"
      >
        Connections you&apos;ve drawn ({links.length})
      </h2>
      {links.length === 0 ? (
        <p className="text-sm text-fg-muted">
          None yet. Drag from the dot on a card&apos;s edge to another card — or hit{" "}
          <strong>Connect</strong> on two cards in turn — and say what the relationship is.
          That&apos;s the part no summary can do for you.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex items-center gap-2 rounded-md border border-border bg-panel/95 px-3 py-2 text-sm flex-wrap"
            >
              <span className="font-medium">{title(link.fromCardId)}</span>
              <label className="sr-only" htmlFor={`label-${link.id}`}>
                Label for the connection between {title(link.fromCardId)} and{" "}
                {title(link.toCardId)}
              </label>
              <input
                id={`label-${link.id}`}
                defaultValue={link.label}
                maxLength={40}
                placeholder="unlabelled"
                onBlur={(e) => {
                  if (e.target.value !== link.label) onRelabel(link.id, e.target.value);
                }}
                className="w-36 rounded border border-border bg-panel-2/60 px-2 py-0.5 font-mono text-[11px] text-moss focus:outline-none focus:ring-1 focus:ring-moss"
              />
              <span className="font-medium">{title(link.toCardId)}</span>
              <button
                type="button"
                onClick={() => onDelete(link.id)}
                aria-label={`Remove the connection between ${title(link.fromCardId)} and ${title(link.toCardId)}`}
                className="ml-auto rounded p-1 text-fg-muted hover:text-rose focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose"
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
