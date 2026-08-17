# Substack as CMS research for dennisxing.com

Date checked: 2026-08-17

Target profile: <https://substack.com/@dennisxing>

Primary publication discovered from the profile HTML: `The {system} Interface`, hosted at <https://systeminterface.substack.com>. The legacy-looking `dennisxing.substack.com` hostname currently redirects to the profile.

## Bottom line

Use Substack RSS as the practical CMS interface. Do not build against an assumed posts API.

As of this check, Substack has official Developer API terms, but those terms describe public profile/publication metadata only: name, LinkedIn URL, social identity URLs, subscriber count, bestseller status, leaderboard recognitions, profile summary, profile URL, and publication URL. They do not list post bodies, post lists, drafts, publishing, Notes, comments, or subscriber data as authorized data. See Substack's public [Developer API Terms of Use](https://substack.com/api-tos), last updated 2026-01-08. The terms also say API limits and quotas are at Substack's discretion, and that cached API data must be refreshed or deleted to match the current public state.

Substack's technical support article for the Developer API exists at <https://support.substack.com/hc/en-us/articles/45099095296916-Substack-Developer-API>, but it redirected to a sign-in page during this check. The public terms page is enough to conclude that the official API is not a general posts CMS API.

## Official and observed sources

| Question                                         | Finding                                                                                                                                                      | Source                                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Can a Substack profile show posts?               | Yes. Substack's help article says a profile can show posts, notes/restacks, likes, and reads, subject to privacy/publication settings.                       | [How can I publish on Substack?](https://support.substack.com/hc/en-us/articles/29152946791188-How-can-I-publish-on-Substack)                   |
| Is there an official RSS feed for a publication? | Yes. Substack documents publication feeds at `https://your.substack.com/feed`.                                                                               | [Is there an RSS feed for my publication?](https://support.substack.com/hc/en-us/articles/360038239391-Is-there-an-RSS-feed-for-my-publication) |
| Does the official Developer API expose posts?    | No evidence of an official posts API. Public API terms scope "Authorized Data" to profile/publication metadata, not posts.                                   | [Substack Developer API Terms of Use](https://substack.com/api-tos)                                                                             |
| What does RSS `content:encoded` mean?            | RSS best-practice guidance treats `content:encoded` as the full item content when present, while `description` may be a summary or publisher-chosen excerpt. | [RSS Advisory Board best practices](https://www.rssboard.org/rss-profile), [RSS 2.0 spec](https://www.rssboard.org/rss-specification)           |

## URL behavior for Dennis Xing

Checked with `curl -I` and direct body fetches on 2026-08-17.

| URL                                                            | Result                                      | Notes                                                                                                                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <https://substack.com/@dennisxing>                             | `200 text/html`                             | Profile page. It has canonical URL `https://substack.com/@dennisxing`, `robots` `noindex`, and embedded profile data including `primaryPublication` with subdomain `systeminterface`. |
| <https://substack.com/@dennisxing/feed>                        | `404 text/html`                             | No profile-level RSS feed at this path.                                                                                                                                               |
| <https://dennisxing.substack.com/feed>                         | `302` to <https://substack.com/@dennisxing> | Not a working publication RSS feed now.                                                                                                                                               |
| <https://systeminterface.substack.com/feed>                    | `200 application/xml`                       | Working publication RSS feed. This is the usable CMS feed for the current primary publication.                                                                                        |
| <https://systeminterface.substack.com/api/v1/archive?sort=new> | `200 application/json`                      | Undocumented web endpoint. Useful for observation, not recommended as a stable contract. List response omits `body_html` and `body_json`.                                             |
| <https://systeminterface.substack.com/sitemap.xml>             | `404 text/html`                             | Response body said the publication does not have a sitemap.                                                                                                                           |
| <https://www.dennisxing.com/feed>                              | `404 text/html` from Vercel                 | Current personal domain feed path is not wired to Substack.                                                                                                                           |

## Feed fields observed

Feed URL: <https://systeminterface.substack.com/feed>

Response headers observed:

- `content-type: application/xml; charset=utf-8`
- `cache-control: no-cache`
- `cf-cache-status: HIT` or `MISS`, depending on request
- `etag: W/"..."`
- `x-sub: systeminterface`
- `x-robots-tag: noindex, noarchive, nofollow`
- `x-served-by: Substack`

The feed is RSS 2.0 with these namespaces:

- `dc="http://purl.org/dc/elements/1.1/"`
- `content="http://purl.org/rss/1.0/modules/content/"`
- `atom="http://www.w3.org/2005/Atom"`
- `itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"`
- `googleplay="http://www.google.com/schemas/play-podcasts/1.0"`

Channel fields observed:

- `title`: `The {system} Interface`
- `description`: `Exploring technology at its boundaries`
- `link`: `https://systeminterface.substack.com`
- `image/url`
- `generator`: `Substack`
- `lastBuildDate`
- `atom:link rel="self" type="application/rss+xml"`
- `copyright`
- `language`
- `webMaster`
- podcast-owner metadata, even though the publication is not currently a podcast-first feed

Item fields observed for the single public post:

- `title`
- `description`: post subtitle/excerpt
- `link`: canonical post URL
- `guid isPermaLink="false"`: same URL string
- `dc:creator`
- `pubDate`
- `enclosure`: cover image URL, `length="0"`, `type="image/jpeg"` even when the original source image is PNG
- `content:encoded`: full HTML body for the public post, including images, links, headings, lists, and Substack-specific classes/widgets

Observed item count: 1.

Observed feed size: about 232 KB.

Current public post in the feed:

- Title: "Tuning Into the Hacker Mindset: OSINT Video Agents, Man-In-The-Malware, Flipper Zero Recon, and Social Engineering - Lessons from DEFCON33"
- Published: `Tue, 23 Sep 2025 02:01:59 GMT`
- URL: <https://systeminterface.substack.com/p/tuning-into-the-hacker-mindset-osint>

## Full content vs excerpts

For the current public post, RSS contains the full HTML article in `content:encoded`. `description` is only the subtitle/excerpt.

This should be treated as observed behavior for public, freely readable posts, not a hard API guarantee. Practical edge cases:

- Paid posts may expose only the public preview or no useful body.
- Audience-specific content, dynamic content, embeds, or subscribe widgets may appear in `content:encoded` as Substack HTML that needs sanitizing or filtering.
- Image metadata in RSS `enclosure` can be lossy; for example, the observed cover image enclosure reports `type="image/jpeg"` while the underlying media URL points at a PNG source transformed through Substack's image CDN.
- RSS does not expose stable rich CMS fields like custom SEO title, all tags, reactions, comments, or author profile metadata in a documented way.

The undocumented archive endpoint includes richer list metadata, including `id`, `publication_id`, `title`, `social_title`, `slug`, `post_date`, `audience`, `canonical_url`, `subtitle`, `cover_image`, `description`, `wordcount`, tags, reactions, and restacks. In the observed list response, `body_html` and `body_json` were `null`. Because this endpoint is not documented as public API, it should not be the primary integration.

## Rate and caching considerations

No RSS-specific rate limit documentation was found in official sources during this check. Substack's Developer API terms reserve rate limits, quotas, and access controls for the official API, but those terms do not appear to govern RSS specifically.

Practical guidance:

- Fetch server-side only. Do not fetch Substack directly from the browser; server fetch avoids CORS/cookie variability and lets the site cache centrally.
- Cache the parsed feed in Next.js with `revalidate`, for example 1 hour for a personal site. A slower cadence such as 6-24 hours is also reasonable if posts are infrequent.
- Avoid build-time-only ingestion unless publishing delays are acceptable. ISR or a scheduled refresh gives better freshness.
- Do not rely heavily on conditional requests. The observed feed had `cache-control: no-cache`, Cloudflare cache status sometimes `HIT`, and weak ETags that changed between quick requests because `lastBuildDate` appears to be regenerated.
- Keep a stale fallback. If Substack returns 403, 429, 5xx, or a malformed feed, serve the last successfully parsed feed from durable cache if available.
- Link back to Substack canonical URLs for full reading, commenting, subscribing, and attribution.

## Recommended Next.js implementation shape

Recommended shape for this repo's Next.js app:

1. Create a server-only library module, for example `apps/web/src/lib/substackFeed.ts`.
2. Fetch `https://systeminterface.substack.com/feed` from the server with a descriptive `User-Agent` and `next: { revalidate: 3600 }`.
3. Parse RSS XML with a real XML/feed parser, not string splitting. Options: `fast-xml-parser`, `rss-parser`, or a small server-only XML parser. The app does not currently list either `rss-parser` or `fast-xml-parser` in `apps/web/package.json`, so add one intentionally if implementing.
4. Normalize to a small local content shape:

```ts
type SubstackPost = {
  title: string;
  slug: string;
  url: string;
  description: string;
  publishedAt: string;
  author: string;
  coverImageUrl?: string;
  html?: string;
};
```

5. Sanitize `content:encoded` before rendering. Allow basic article markup (`p`, `h2`-`h4`, `ul`, `ol`, `li`, `blockquote`, `a`, `strong`, `em`, `code`, `pre`, `img`, `figure`, `figcaption`) and strip scripts, forms, inline event handlers, Substack subscribe widgets, and unknown embeds unless explicitly supported.
6. Use `next/image` only if `substackcdn.com` and `substack-post-media.s3.amazonaws.com` are configured in `next.config.js`; otherwise render ordinary `img` tags for feed content after sanitization.
7. Prefer rendering excerpts/cards on the personal homepage and link to the canonical Substack post. Render full mirrored articles only if you are comfortable owning sanitization, styling, attribution, and future feed changes.
8. Add a manual override layer for featured posts if editorial control matters; RSS is chronological and intentionally generic.

Minimal server-side fetch sketch:

```ts
import "server-only";

const FEED_URL = "https://systeminterface.substack.com/feed";

export async function getSubstackFeedXml() {
  const response = await fetch(FEED_URL, {
    headers: {
      "User-Agent":
        "dennisxing.com feed reader; contact: https://www.dennisxing.com",
      Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Substack feed fetch failed: ${response.status}`);
  }

  return response.text();
}
```

## Recommendation

For a personal website, treat Substack as an upstream publication system and RSS as the supported syndication interface:

- Primary integration: `https://systeminterface.substack.com/feed`
- Display: homepage/blog index cards from RSS metadata
- Optional full article mirror: `content:encoded`, sanitized and cached
- Canonical URL: always the Substack post URL
- Avoid: undocumented `/api/v1/archive` as the source of truth
- Avoid: profile URL scraping, because `substack.com/@dennisxing` is a dynamic HTML profile surface, not a feed/API contract

This gives the site a low-maintenance CMS flow while staying close to Substack's documented RSS behavior and away from brittle internal APIs.
