"use client";

import * as React from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

type SourceContextValue = {
  href: string;
};

const SourceContext = React.createContext<SourceContextValue | null>(null);

function useSource() {
  const context = React.useContext(SourceContext);
  if (!context) {
    throw new Error("Source components must be used within Source.");
  }
  return context;
}

export type SourceProps = {
  children: React.ReactNode;
  href: string;
};

export function Source({ children, href }: SourceProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <SourceContext.Provider value={{ href }}>
        <Tooltip>{children}</Tooltip>
      </SourceContext.Provider>
    </TooltipProvider>
  );
}

export type SourceTriggerProps = {
  className?: string;
  label: string;
  showFavicon?: boolean;
};

export function SourceTrigger({
  className,
  label,
  showFavicon = false,
}: SourceTriggerProps) {
  const { href } = useSource();
  const hostname = getHostname(href);

  return (
    <TooltipTrigger asChild>
      <a
        className={cn(
          "inline-flex max-w-full items-center gap-1.5 rounded-sm border border-border bg-background px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          className,
        )}
        href={href}
        rel="noreferrer"
        target="_blank"
      >
        {showFavicon && hostname ? (
          <span
            aria-hidden="true"
            className="size-3 shrink-0"
            style={{
              backgroundImage: `url("https://www.google.com/s2/favicons?domain=${hostname}&sz=32")`,
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "contain",
            }}
          />
        ) : null}
        <span className="truncate">{label}</span>
      </a>
    </TooltipTrigger>
  );
}

export type SourceContentProps = {
  className?: string;
  description?: string;
  title: string;
};

export function SourceContent({
  className,
  description,
  title,
}: SourceContentProps) {
  const { href } = useSource();
  const hostname = getHostname(href);

  return (
    <TooltipContent
      className={cn(
        "max-w-80 rounded-md border border-border bg-background p-3 text-left text-foreground shadow-md",
        className,
      )}
      side="top"
    >
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="mt-1 line-clamp-4 whitespace-pre-line text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
      {hostname ? (
        <p className="mt-2 truncate text-xs text-muted-foreground">
          {hostname}
        </p>
      ) : null}
    </TooltipContent>
  );
}

function getHostname(href: string) {
  try {
    return new URL(href).hostname;
  } catch {
    return "";
  }
}
