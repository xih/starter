"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "~/lib/utils";
import { filterInteractionPatterns } from "./timeline-utils";
import type { InteractionPattern } from "./types";

type InteractionPatternSidebarProps = {
  activeSlug: string;
  patterns: InteractionPattern[];
};

export function InteractionPatternSidebar({
  activeSlug,
  patterns,
}: InteractionPatternSidebarProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = useMemo(
    () => [
      "All",
      ...Array.from(new Set(patterns.map((item) => item.category))),
    ],
    [patterns],
  );
  const filteredPatterns = filterInteractionPatterns(patterns, query, category);

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-neutral-200 bg-neutral-50 text-neutral-950">
      <div className="border-b border-neutral-200 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-normal text-neutral-500">
          Interaction log
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Pattern index
        </h1>
      </div>

      <div className="space-y-3 border-b border-neutral-200 px-4 py-4">
        <label className="relative block">
          <span className="sr-only">Search interaction patterns</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            className="h-9 w-full rounded-md border border-neutral-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search patterns"
            type="search"
            value={query}
          />
        </label>
        <div className="flex flex-wrap gap-2" aria-label="Pattern categories">
          {categories.map((item) => (
            <button
              className={cn(
                "h-8 rounded-md border px-3 text-xs font-medium transition",
                item === category
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400",
              )}
              key={item}
              onClick={() => setCategory(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-3" aria-label="Patterns">
        {filteredPatterns.length > 0 ? (
          <ol className="space-y-2">
            {filteredPatterns.map((pattern) => {
              const isActive = pattern.slug === activeSlug;

              return (
                <li key={pattern.slug}>
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "block rounded-md border p-3 transition",
                      isActive
                        ? "border-neutral-950 bg-white shadow-sm"
                        : "border-transparent hover:border-neutral-200 hover:bg-white",
                    )}
                    href={`/interactions/${pattern.slug}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold leading-5">
                        {pattern.title}
                      </span>
                      <span className="rounded-sm bg-neutral-100 px-2 py-1 text-[11px] font-medium uppercase text-neutral-500">
                        {pattern.status}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-neutral-500">
                      {pattern.summary}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ol>
        ) : (
          <div
            className="rounded-md border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-500"
            role="status"
          >
            No patterns match this search.
          </div>
        )}
      </nav>
    </aside>
  );
}
