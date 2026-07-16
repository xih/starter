import type { ReactNode } from "react";

import { cn } from "../utils";
import { ChatMessage, type ChatMessageData } from "./voice";

export type SourceData = {
  description?: string;
  faviconUrl?: string;
  provider: string;
  publishedAt?: string;
  title: string;
  url: string;
};

export type SourcesChipProps = {
  className?: string;
  index?: number;
  source: SourceData;
};

export function SourcesChip({ className, index, source }: SourcesChipProps) {
  const safeUrl = getSafeWebUrl(source.url);
  if (!safeUrl) {
    return null;
  }

  const faviconUrl = source.faviconUrl ?? getFaviconUrl(safeUrl);
  const label = typeof index === "number" ? `${index + 1}.` : "";

  return (
    <a
      aria-label={`${label} ${source.provider} source: ${source.title}`}
      className={cn(
        "font-body inline-flex h-[28px] w-[237px] shrink-0 items-center gap-[6px] rounded-[4px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] px-[9px] py-[5px] text-[length:var(--font-font-size-caption)] leading-[var(--font-line-height-lh-caption)] text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-background-secondary)] focus-visible:ring-2 focus-visible:ring-[var(--color-border-selected)] focus-visible:outline-none md:w-auto md:max-w-[380px]",
        className,
      )}
      href={safeUrl}
      rel="noreferrer"
      target="_blank"
      title={[
        source.title,
        source.description,
        source.publishedAt ? `Published ${source.publishedAt}` : undefined,
        `Provider: ${source.provider}`,
      ]
        .filter(Boolean)
        .join("\n")}
    >
      {faviconUrl ? (
        <img
          alt=""
          className="size-[12px] shrink-0 object-contain"
          src={faviconUrl}
        />
      ) : (
        <span
          aria-hidden="true"
          className="size-[12px] shrink-0 bg-[var(--livechat-color-panel,#101010)]"
        />
      )}
      <span className="gap-token-4 flex min-w-0 items-start overflow-hidden whitespace-nowrap">
        <span className="shrink-0 text-[var(--color-text-tertiary)]">
          {label} {source.provider}
        </span>
        <span className="truncate text-[var(--color-text-primary)]">
          {source.title}
        </span>
      </span>
    </a>
  );
}

export function SourcesRail({
  className,
  sources,
}: {
  className?: string;
  sources: SourceData[];
}) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="Sources"
      className={cn(
        "gap-token-8 pb-token-4 flex w-full max-w-[380px] overflow-x-auto overflow-y-hidden [scrollbar-width:thin] md:max-w-[477px]",
        className,
      )}
      role="list"
    >
      {sources.map((source, index) => (
        <div
          className="shrink-0"
          key={`${source.url}-${index}`}
          role="listitem"
        >
          <SourcesChip index={index} source={source} />
        </div>
      ))}
    </div>
  );
}

export type ChatMessageWithSourcesProps = {
  children?: ReactNode;
  className?: string;
  message: ChatMessageData;
  pending?: boolean;
  sources?: SourceData[];
};

export function ChatMessageWithSources({
  children,
  className,
  message,
  pending,
  sources = [],
}: ChatMessageWithSourcesProps) {
  return (
    <div
      className={cn(
        "flex w-full max-w-[380px] flex-col items-start gap-[7px] overflow-hidden md:max-w-[477px]",
        className,
      )}
    >
      {children ?? <ChatMessage message={message} pending={pending} />}
      <SourcesRail sources={sources} />
    </div>
  );
}

function getSafeWebUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return "";
    }
    return parsedUrl.toString();
  } catch {
    return "";
  }
}

function getFaviconUrl(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return hostname
      ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
      : "";
  } catch {
    return "";
  }
}
