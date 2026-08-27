"use client";

import { useTransition } from "react";
import { deletePost } from "@/lib/actions/posts";

export default function DeletePostButton({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    startTransition(() => deletePost(postId));
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className="px-3 py-1.5 rounded-md border border-rose/40 text-rose text-xs font-medium hover:bg-rose/10 transition disabled:opacity-60"
    >
      {isPending ? "Deleting…" : "Delete post"}
    </button>
  );
}
