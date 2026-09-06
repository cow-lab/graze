// Plain module, deliberately not part of the "use client" component that renders these:
// a server component importing a non-component export across a client boundary gets
// `undefined`, not the value.
//
// Only the long, low-visibility admin wait rotates through a list. The two waits people
// actually sit and watch — live search and "Chew on this" — get the running cow and a
// single short line instead (components/RunningCowLoader.tsx); a rotating list on a
// three-second wait just means nobody finishes reading the first message.
export const LOADING_MESSAGES = {
  combine: [
    "The Combine is out in the field…",
    "Asking Crossref, OpenAlex, and friends…",
    "Checking journals against DOAJ…",
    "Still going — this one takes a minute…",
  ],
} as const;
