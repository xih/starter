"use client";

import { ExternalLink } from "lucide-react";

import { ArchiveScrollTimelineDemo } from "./ArchiveScrollTimelineDemo";
import type { InteractionPattern } from "./types";

type InteractionPatternDetailProps = {
  pattern: InteractionPattern;
};

export function InteractionPatternDetail({
  pattern,
}: InteractionPatternDetailProps) {
  return (
    <main className="min-h-svh bg-white text-neutral-950">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-10 px-6 py-8 lg:px-10">
        <header className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-normal text-neutral-500">
            <span>{pattern.category}</span>
            <span aria-hidden="true">/</span>
            <span>{pattern.status}</span>
          </div>
          <h1 className="mt-4 text-5xl font-semibold leading-none tracking-normal">
            {pattern.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-neutral-600">
            {pattern.summary}
          </p>
          <a
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-neutral-950 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-950"
            href={pattern.sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            Study source: {pattern.sourceName}
            <ExternalLink className="size-4" />
          </a>
        </header>

        <ArchiveScrollTimelineDemo pattern={pattern} />

        <section className="grid gap-8 border-t border-neutral-200 pt-8 lg:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-normal text-neutral-500">
              Interaction notes
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral-700">
              {pattern.interactionNotes.map((note) => (
                <li className="border-l-2 border-[#009ee8] pl-3" key={note}>
                  {note}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-normal text-neutral-500">
              Implementation notes
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral-700">
              {pattern.implementationNotes.map((note) => (
                <li className="border-l-2 border-neutral-300 pl-3" key={note}>
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
