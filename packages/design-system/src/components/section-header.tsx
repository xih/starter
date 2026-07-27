import { ArrowLeft, ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../utils";

export type SectionHeaderProps = {
  actionLabel?: string;
  className?: string;
  onBack?: () => void;
  showBackButton?: boolean;
  showSortOrder?: boolean;
  subtext?: string;
  title: string;
};

export function SectionHeader({
  actionLabel,
  className,
  onBack,
  showBackButton = false,
  showSortOrder = false,
  subtext,
  title,
}: SectionHeaderProps) {
  const rightAction: ReactNode = showSortOrder ? (
    <span className="gap-token-4 inline-flex items-center">
      <span>Newest first</span>
      <ArrowUpDown className="size-token-20" strokeWidth={2} />
    </span>
  ) : actionLabel ? (
    actionLabel
  ) : null;

  return (
    <header
      className={cn(
        "flex w-full flex-col items-start gap-[3px] text-[#121318]",
        className,
      )}
      data-testid="section-header"
    >
      {showBackButton ? (
        <button
          aria-label="Go back"
          className="size-token-24 flex items-center justify-center text-[#121318] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121318]"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="size-token-24" strokeWidth={2} />
        </button>
      ) : null}
      <div className="gap-token-8 flex w-full flex-col items-start">
        <div className="min-h-token-32 flex w-full items-center justify-between gap-[3px]">
          <h1 className="font-title text-title leading-lhTitle font-regular min-w-0 flex-1 break-words tracking-normal">
            {title}
          </h1>
          {rightAction ? (
            <button
              className="font-body h-token-20 text-cta leading-lhSubtext font-regular inline-flex shrink-0 items-center justify-end tracking-normal text-[#121318] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121318]"
              type="button"
            >
              {rightAction}
            </button>
          ) : null}
        </div>
        {subtext ? (
          <p className="font-body text-cta leading-lhSubtext font-regular line-clamp-2 tracking-normal text-[#4a4a4a]">
            {subtext}
          </p>
        ) : null}
      </div>
    </header>
  );
}
