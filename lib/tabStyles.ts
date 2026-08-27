// Shared visual language for every tab-style control in the app (feed type/sort filters,
// research library sort, etc.) — same size, same font, and always a visible border so tab
// text never reads as floating, unbordered text. Active state swaps the border/background.
export function tabClass(active: boolean): string {
  return `px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
    active
      ? "border-moss bg-panel-2 text-moss"
      : "border-border text-fg-muted hover:text-fg hover:border-border-strong"
  }`;
}
