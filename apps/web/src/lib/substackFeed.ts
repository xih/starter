import "server-only";

import Parser from "rss-parser";

import type { WritingPost } from "~/components/WritingPosts";

const SUBSTACK_FEED_URL = "https://systeminterface.substack.com/feed";
const USER_AGENT =
  "dennisxing.com feed reader; contact: https://www.dennisxing.com";
const LAST_KNOWN_SUBSTACK_POSTS: WritingPost[] = [
  {
    title:
      "Tuning Into the Hacker Mindset: OSINT Video Agents, Man-In-The-Malware, Flipper Zero Recon, and Social Engineering - Lessons from DEFCON33",
    href: "https://systeminterface.substack.com/p/tuning-into-the-hacker-mindset-osint",
    description:
      "Real-world lessons from DEFCON33 on how hackers use tools, tricks, and mindset to peel away the abstractions of systems",
    publishedAt: "2025-09-23T02:01:59.000Z",
    slug: "tuning-into-the-hacker-mindset-osint",
  },
];

let lastSuccessfulPosts = LAST_KNOWN_SUBSTACK_POSTS;

type SubstackFeedItem = {
  title?: string;
  link?: string;
  contentSnippet?: string;
  content?: string;
  pubDate?: string;
  isoDate?: string;
};

const parser = new Parser<Record<string, unknown>, SubstackFeedItem>({
  customFields: {
    item: [["content:encoded", "content"]],
  },
});

function getPostSlug(link: string) {
  try {
    const url = new URL(link);
    return url.pathname.split("/").filter(Boolean).at(-1) ?? link;
  } catch {
    return link;
  }
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDescription(item: SubstackFeedItem) {
  const source = item.contentSnippet ?? item.content ?? "";
  return stripHtml(source);
}

function clonePosts(posts: WritingPost[]) {
  return posts.map((post) => ({ ...post }));
}

function getStaleWritingPosts() {
  return clonePosts(lastSuccessfulPosts);
}

export async function getSubstackWritingPosts(): Promise<WritingPost[]> {
  try {
    const response = await fetch(SUBSTACK_FEED_URL, {
      headers: {
        Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
        "User-Agent": USER_AGENT,
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.error(`Substack feed fetch failed: ${response.status}`);
      return getStaleWritingPosts();
    }

    const feed = await parser.parseString(await response.text());

    const posts = feed.items.reduce<WritingPost[]>((posts, item) => {
      const href = item.link;

      if (!href || !item.title) {
        return posts;
      }

      posts.push({
        title: item.title,
        href,
        description: normalizeDescription(item),
        publishedAt: item.isoDate ?? item.pubDate ?? "",
        slug: getPostSlug(href),
      });

      return posts;
    }, []);

    if (posts.length > 0) {
      lastSuccessfulPosts = clonePosts(posts);
    }

    return posts;
  } catch (error) {
    console.error("Failed to load Substack writing feed.", error);
    return getStaleWritingPosts();
  }
}

export { SUBSTACK_FEED_URL };
