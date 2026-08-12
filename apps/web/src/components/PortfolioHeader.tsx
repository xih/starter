import Link from "next/link";

import { cn } from "~/lib/utils";

export type PortfolioHeaderProps = {
  activePage?: "about" | "home";
  brandLabel?: string;
  className?: string;
  tone?: "dark" | "light";
};

export function PortfolioHeader({
  activePage,
  brandLabel = "Dennis Xing",
  className,
  tone = "light",
}: PortfolioHeaderProps) {
  return (
    <nav
      aria-label="Portfolio navigation"
      className={cn(
        "absolute left-0 top-[2px] z-20 flex h-[44px] w-full items-center px-[20px] py-[12px] font-body text-[16px] font-[400] leading-[19.2px] md:px-[116px]",
        tone === "light" ? "text-white" : "text-[#1e1f24]",
        className,
      )}
    >
      <div className="flex w-full items-center justify-between">
        <Link
          aria-current={activePage === "home" ? "page" : undefined}
          aria-label={`${brandLabel} home`}
          className="whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          href="/"
        >
          {brandLabel}
        </Link>
        <Link
          aria-current={activePage === "about" ? "page" : undefined}
          className="whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          href="/about"
        >
          About
        </Link>
      </div>
    </nav>
  );
}
