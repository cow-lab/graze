// Shared visual language for every tab-style control in the app (Field sort filters, the
// research library's sort row, the Board's own tabs).
//
// The unselected state used to be a bare border with muted text and no background. On the
// pages these actually sit on, that meant pale-cream hairlines and brown-grey text laid
// directly over the illustrated green field — legible in a mockup, close to invisible in
// place. Both states now sit on their own opaque surface: the selected one is filled and
// unmistakable, the unselected ones are plainly readable without competing with it.
export function tabClass(active: boolean): string {
  return `px-3 py-1.5 rounded-md text-sm font-medium border shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss ${
    active
      ? "border-moss bg-moss text-white"
      : "border-border-strong bg-panel/95 text-fg hover:border-moss hover:text-moss"
  }`;
}
