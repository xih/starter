import Link from "next/link";

import { LatestPost } from "~/app/_components/post";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { Sidebar } from "~/components/Sidebar";
import { VideoPlayer } from "~/components/VideoPlayer";
import { KeyboardShortcuts } from "~/components/KeyboardShortcuts";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });
  const session = await auth();

  if (session?.user) {
    void api.post.getLatest.prefetch();
  }

  return (
    <HydrateClient>
      <div className="flex min-h-screen">
        {/* Sidebar on the left */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Main content - Video Player */}
        <main className="flex flex-1 flex-col items-center justify-center overflow-hidden">
          <VideoPlayer />
        </main>

        {/* Keyboard shortcuts card */}
        <KeyboardShortcuts />
      </div>
    </HydrateClient>
  );
}
