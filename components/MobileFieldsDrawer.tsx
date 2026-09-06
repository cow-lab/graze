"use client";

import { useState, type ReactNode } from "react";
import { ListFilter, ChevronDown } from "lucide-react";

export default function MobileFieldsDrawer({
  activeLabel,
  children,
}: {
  activeLabel: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-panel/80 backdrop-blur-sm border border-border text-sm text-fg text-left"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <ListFilter size={14} className="shrink-0" aria-hidden="true" />
          {activeLabel}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        aria-hidden="true" />
      </button>

      {open && (
        <div
          className="absolute z-10 mt-1 w-full bg-panel border border-border-strong rounded-lg p-3 shadow-md max-h-[70vh] overflow-y-auto"
          // Close on navigation only. Closing on *any* inner click would make the
          // report form unusable — picking a Field or typing a reason would dismiss
          // the drawer mid-entry.
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
