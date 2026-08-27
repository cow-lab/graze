"use client";

import { useState, type ReactNode } from "react";
import { ListFilter, ChevronDown } from "lucide-react";

export default function MobileFieldsDrawer({
  activeLabel,
  children,
}: {
  activeLabel: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-panel/80 backdrop-blur-sm border border-border text-sm text-fg"
      >
        <span className="flex items-center gap-1.5">
          <ListFilter size={14} /> {activeLabel}
        </span>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute z-10 mt-1 w-full bg-panel border border-border-strong rounded-lg p-3 shadow-md max-h-[70vh] overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
