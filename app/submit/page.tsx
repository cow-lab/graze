import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBoardsWithCounts } from "@/lib/posts";
import SubmitForm from "@/components/SubmitForm";

export default async function SubmitPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const boards = await getBoardsWithCounts();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-panel/95 border border-border-strong rounded-lg p-6 shadow-sm">
        <h1 className="font-heading text-2xl font-semibold mb-1">Submit a paper</h1>
        <p className="text-sm text-fg-muted mb-6">
          Add research to the library so other people can find it, read it, and argue with it
          in the comments.
        </p>
        <SubmitForm boards={boards.map((b) => ({ slug: b.slug, name: b.name }))} />
      </div>
    </div>
  );
}
