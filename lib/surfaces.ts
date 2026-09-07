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
