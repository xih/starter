import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" version="2.0">
  <channel>
    <title>The {system} Interface</title>
    <item>
      <title><![CDATA[Test Post]]></title>
      <description><![CDATA[Short <strong>summary</strong>.]]></description>
      <link>https://systeminterface.substack.com/p/test-post</link>
      <guid isPermaLink="false">https://systeminterface.substack.com/p/test-post</guid>
      <dc:creator><![CDATA[Dennis Xing]]></dc:creator>
      <pubDate>Tue, 23 Sep 2025 02:01:59 GMT</pubDate>
      <content:encoded><![CDATA[<p>Full body</p>]]></content:encoded>
    </item>
  </channel>
</rss>`;

describe("getSubstackWritingPosts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("normalizes the Substack RSS feed into reusable writing posts", async () => {
    const { getSubstackWritingPosts } = await import("./substackFeed");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(feedXml, { status: 200 })),
    );

    await expect(getSubstackWritingPosts()).resolves.toEqual([
      {
        title: "Test Post",
        href: "https://systeminterface.substack.com/p/test-post",
        description: "Short summary.",
        publishedAt: "2025-09-23T02:01:59.000Z",
        slug: "test-post",
      },
    ]);
  });

  it("returns the last known feed when Substack responds with an error", async () => {
    const { getSubstackWritingPosts } = await import("./substackFeed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Too many requests", { status: 429 })),
    );

    await expect(getSubstackWritingPosts()).resolves.toMatchObject([
      {
        slug: "tuning-into-the-hacker-mindset-osint",
      },
    ]);

    consoleError.mockRestore();
  });

  it("returns the last known feed when the feed cannot be parsed", async () => {
    const { getSubstackWritingPosts } = await import("./substackFeed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<rss>", { status: 200 })),
    );

    await expect(getSubstackWritingPosts()).resolves.toMatchObject([
      {
        slug: "tuning-into-the-hacker-mindset-osint",
      },
    ]);

    consoleError.mockRestore();
  });

  it("preserves the latest successful in-process feed after a later failure", async () => {
    const { getSubstackWritingPosts } = await import("./substackFeed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(feedXml, { status: 200 }))
        .mockResolvedValueOnce(
          new Response("Too many requests", { status: 429 }),
        ),
    );

    await expect(getSubstackWritingPosts()).resolves.toEqual([
      {
        title: "Test Post",
        href: "https://systeminterface.substack.com/p/test-post",
        description: "Short summary.",
        publishedAt: "2025-09-23T02:01:59.000Z",
        slug: "test-post",
      },
    ]);

    await expect(getSubstackWritingPosts()).resolves.toEqual([
      {
        title: "Test Post",
        href: "https://systeminterface.substack.com/p/test-post",
        description: "Short summary.",
        publishedAt: "2025-09-23T02:01:59.000Z",
        slug: "test-post",
      },
    ]);

    consoleError.mockRestore();
  });
});
