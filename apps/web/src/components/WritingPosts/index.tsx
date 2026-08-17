import Link from "next/link";

import { cn } from "~/lib/utils";

export type WritingPost = {
  title: string;
  href: string;
  description: string;
  publishedAt: string;
  slug?: string;
};

export type WritingPostListProps = {
  posts: WritingPost[];
  className?: string;
  emptyMessage?: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatWritingPostDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFormatter.format(date);
}

function isExternalHref(href: string) {
  return /^https?:\/\//.test(href);
}

export function WritingPostList({
  posts,
  className,
  emptyMessage = "No writing yet.",
}: WritingPostListProps) {
  if (posts.length === 0) {
    return (
      <p
        className={cn(
          "font-body text-[16px] leading-[19.2px] text-text-secondary",
          className,
        )}
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-token-32 font-body text-text-primary md:w-[692px]",
        className,
      )}
    >
      {posts.map((post) => (
        <article
          className="grid w-full grid-cols-1 gap-token-8 md:grid-cols-[75px_1fr] md:gap-token-20"
          key={`${post.href}-${post.publishedAt}`}
        >
          <time
            className="font-body text-[16px] leading-[19.2px] text-text-secondary"
            dateTime={post.publishedAt}
          >
            {formatWritingPostDate(post.publishedAt)}
          </time>

          <div className="flex min-w-0 flex-col gap-token-4">
            {isExternalHref(post.href) ? (
              <a
                className="block w-full font-body text-[16px] leading-[19.2px] text-text-primary underline decoration-solid underline-offset-[2px] transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121318] focus-visible:ring-offset-2"
                href={post.href}
                rel="noreferrer"
                target="_blank"
              >
                {post.title}
              </a>
            ) : (
              <Link
                className="block w-full font-body text-[16px] leading-[19.2px] text-text-primary underline decoration-solid underline-offset-[2px] transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121318] focus-visible:ring-offset-2"
                href={post.href}
              >
                {post.title}
              </Link>
            )}
            <p className="w-full font-body text-[15px] leading-[18px] text-text-secondary">
              {post.description}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
