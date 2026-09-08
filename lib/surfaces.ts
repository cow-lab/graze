// The two surfaces a page is built from.
//
// These were one class string copy-pasted into a dozen files, which meant a page's header
// and its content sat on the identical white panel — so the header read as just another
// card in the stack rather than as the thing introducing it. Splitting them gives a page an
// actual top: warm tan chrome, white content beneath it.

/** Introduces a page. Warm, recessive, and never the same surface as the content below. */
export const PAGE_HEADER = "rounded-lg border border-border-strong bg-panel-2 p-5 shadow-sm";

/** Holds content — a paper, a comment thread, a form. The white reading surface. */
export const PANEL = "rounded-lg border border-border-strong bg-panel p-5 shadow-sm";

/**
 * Says something about the site rather than being part of it: the cookie note, the
 * low-bandwidth suggestion.
 *
 * These were plain white panels, identical to the content around them, so a notice at the
 * top of a page read as the page's first card and pushed the real heading down. The moss
 * edge marks them as chrome without needing a colour that shouts, and it works on both the
 * cream page and the tan footer — which a background tint alone would not.
 */
export const NOTICE =
  "rounded-lg border border-border-strong border-l-[3px] border-l-moss bg-panel px-4 py-3 shadow-sm";
