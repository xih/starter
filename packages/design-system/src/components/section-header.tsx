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
    <span className="inline-flex items-center gap-[4px]">
      <span>Newest first</span>
      <ArrowUpDown className="size-[20px]" strokeWidth={2} />
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
          className="flex size-[24px] items-center justify-center text-[#121318] focus-visible:ring-2 focus-visible:ring-[#121318] focus-visible:outline-none"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="size-[24px]" strokeWidth={2} />
        </button>
      ) : null}
      <div className="flex w-full flex-col items-start gap-[8px]">
        <div className="flex min-h-[32px] w-full items-center justify-between gap-[3px]">
          <h1 className="font-title min-w-0 flex-1 text-[28px] leading-[31.1px] font-[400] tracking-normal break-words">
            {title}
          </h1>
          {rightAction ? (
            <button
              className="font-body inline-flex h-[20px] shrink-0 items-center justify-end text-[16px] leading-[19.2px] font-[400] tracking-normal text-[#121318] focus-visible:ring-2 focus-visible:ring-[#121318] focus-visible:outline-none"
              type="button"
            >
              {rightAction}
            </button>
          ) : null}
        </div>
        {subtext ? (
          <p className="font-body line-clamp-2 text-[16px] leading-[19.2px] font-[400] tracking-normal text-[#4a4a4a]">
            {subtext}
          </p>
        ) : null}
      </div>
    </header>
  );
}
