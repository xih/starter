import type { Metadata } from "next";

import { getSubstackWritingPosts, SUBSTACK_FEED_URL } from "~/lib/substackFeed";
import { WritingClient } from "./writing-client";

export const metadata: Metadata = {
  title: "Writing",
  description: "Writing from Dennis Xing.",
  alternates: {
    canonical: "/writing",
    types: {
      "application/rss+xml": SUBSTACK_FEED_URL,
    },
  },
};

export default async function WritingPage() {
  const posts = await getSubstackWritingPosts();

  return <WritingClient posts={posts} />;
}
