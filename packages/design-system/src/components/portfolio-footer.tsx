import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../utils";

export type PortfolioFooterProps = {
  aboutHref?: string;
  className?: string;
  clock?: ReactNode;
  linkedinHref?: string;
  substackHref?: string;
};

function FooterHeading({ children }: { children: string }) {
  return (
    <h2 className="font-title text-[28px] font-[700] leading-[31px] text-white md:text-[34px] md:leading-[38px]">
      {children}
    </h2>
  );
}

function FooterTextLink({
  children,
  href,
  showArrow = false,
}: {
  children: string;
  href: string;
  showArrow?: boolean;
}) {
  return (
    <a
      className="inline-flex w-fit items-center gap-[4px] font-body text-[12px] font-[700] leading-[18px] text-white underline decoration-transparent decoration-1 underline-offset-[3px] transition hover:decoration-white focus-visible:decoration-white focus-visible:outline-none md:text-[16px] md:leading-[21px]"
      href={href}
    >
      {children}
      {showArrow ? (
        <ArrowUpRight
          className="size-[14px] md:size-[18px]"
          strokeWidth={2.4}
        />
      ) : null}
    </a>
  );
}

export function PortfolioFooter({
  aboutHref = "/about",
  className,
  clock,
  linkedinHref = "https://www.linkedin.com/in/dennisxing",
  substackHref = "https://substack.com/@dennisxing",
}: PortfolioFooterProps) {
  return (
    <footer
      className={cn(
        "relative flex min-h-[494px] w-full flex-col overflow-hidden bg-black px-[26px] pb-[26px] pt-[18px] text-white md:min-h-[556px] md:px-[29px] md:pb-[22px] md:pt-[27px]",
        className,
      )}
    >
      <div className="grid grid-cols-2 gap-x-[28px] gap-y-[25px] md:grid-cols-[300px_1fr_180px_220px] md:items-start md:gap-[40px]">
        <div className="order-3 max-w-[300px] font-body text-[12px] leading-[16px] md:order-none md:text-[16px] md:leading-[20px]">
          <p className="mb-[15px] flex items-center gap-[6px]">
            <span className="size-[7px] rounded-full bg-[#52d34f]" />
            <span>2 visitors&nbsp; 2:16:05 PM</span>
          </p>
          <p>
            A curated collection of interactive work - prototypes, patterns, and
            polished systems - exploring how modern interfaces move, respond,
            and feel.
          </p>
          <p className="mt-[14px]">&copy; 2026, Dennis / portfolio archive</p>
        </div>

        <div className="order-4 justify-self-start md:order-none">{clock}</div>

        <nav className="order-1 flex flex-col gap-[6px] md:order-none">
          <FooterHeading>Info</FooterHeading>
          <FooterTextLink href={aboutHref}>About</FooterTextLink>
        </nav>

        <nav className="order-2 flex flex-col gap-[6px] md:order-none">
          <FooterHeading>Connect</FooterHeading>
          <FooterTextLink href={linkedinHref} showArrow>
            Linkedin
          </FooterTextLink>
          <FooterTextLink href={substackHref} showArrow>
            Substack
          </FooterTextLink>
        </nav>
      </div>

      <div className="mt-auto whitespace-nowrap font-title text-[42px] font-[400] leading-none text-white md:self-center md:text-[176px]">
        Dennis Xing
      </div>
    </footer>
  );
}
