import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getBoard } from "@/lib/board";
import BoardCanvas from "@/components/BoardCanvas";
import { PAGE_HEADER } from "@/lib/surfaces";

export default async function BoardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { cards, links } = await getBoard(user.id);

  return (
    <div className="max-w-6xl mx-auto">
      <div className={`${PAGE_HEADER} mb-5`}>
        <h1 className="font-heading text-2xl font-semibold mb-1">Your board</h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          Every paper you keep lands here as a card. Move them into an arrangement that means
          something to you, write down why each one matters, and draw the connections
          yourself — that last part is the work, and it&apos;s deliberately yours to do.
        </p>
        <p className="text-xs text-fg-muted mt-2 max-w-2xl">
          Private to you. Nothing on this board is shown to anyone else.
        </p>
      </div>

      {/* The canvas renders even with nothing on it: an empty board is where the one-time
          hint lives, and it's the thing being explained. */}
      <BoardCanvas cards={cards} links={links} />
    </div>
  );
}
