"use client";

import { InteractionPatternDetail } from "./InteractionPatternDetail";
import { InteractionPatternSidebar } from "./InteractionPatternSidebar";
import type { InteractionPattern } from "./types";

type InteractionLogShellProps = {
  activePattern: InteractionPattern;
  patterns: InteractionPattern[];
};

export function InteractionLogShell({
  activePattern,
  patterns,
}: InteractionLogShellProps) {
  return (
    <div className="grid min-h-svh bg-white text-neutral-950 md:grid-cols-[320px_minmax(0,1fr)]">
      <div className="min-h-0 md:sticky md:top-0 md:h-svh">
        <InteractionPatternSidebar
          activeSlug={activePattern.slug}
          patterns={patterns}
        />
      </div>
      <InteractionPatternDetail pattern={activePattern} />
    </div>
  );
}
