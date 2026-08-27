import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBoardsWithCounts } from "@/lib/posts";
import SubmitForm from "@/components/SubmitForm";
import type { PostType } from "@prisma/client";

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; refPostId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const boards = await getBoardsWithCounts();
  const initialType: PostType = ["RESEARCH", "POST"].includes(params.type ?? "")
    ? (params.type as PostType)
    : "RESEARCH";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-panel/95 border border-border-strong rounded-lg p-6 shadow-sm">
        <h1 className="font-heading text-2xl font-semibold mb-1">Submit a post</h1>
        <p className="text-sm text-fg-muted mb-6">
          Share a paper, or post a question, analysis, or project for the field.
        </p>
        <SubmitForm
          boards={boards.map((b) => ({ slug: b.slug, name: b.name }))}
          initialType={initialType}
          initialRefPostId={params.refPostId}
        />
      </div>
    </div>
  );
}
