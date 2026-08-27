import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import NewFieldForm from "@/components/NewFieldForm";

export default async function NewFieldPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-panel/95 border border-border-strong rounded-lg p-6 shadow-sm">
        <h1 className="font-heading text-2xl font-semibold mb-1">Start a new Field</h1>
        <p className="text-sm text-fg-muted mb-6">
          Fields are open — no approval needed, similar to starting a subreddit.
        </p>
        <NewFieldForm />
      </div>
    </div>
  );
}
