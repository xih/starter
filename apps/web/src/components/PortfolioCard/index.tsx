import { ExternalLink } from "lucide-react";
import Image from "next/image";

import { cn } from "~/lib/utils";

export type PortfolioCardLink = {
  label: string;
  href: string;
};

export type PortfolioArtwork = "nell" | "agi" | "krea" | "skydio";

export type PortfolioCardProps = {
  year: string;
  company: string;
  role: string;
  description: string;
  artwork: PortfolioArtwork;
  artworkLabel: string;
  links?: PortfolioCardLink[];
  className?: string;
};

export const portfolioProjects: PortfolioCardProps[] = [
  {
    year: "2026",
    company: "Nell",
    role: "Founding Product Designer",
    description:
      "Worked with the co-founder of SoundCloud to build generative AI experiences, helping shape the product through its Index Ventures raise.",
    artwork: "nell",
    artworkLabel: "Nell brand mark on a red field",
    links: [{ label: "Case Study", href: "https://nell.ai" }],
  },
  {
    year: "2025",
    company: "AGI",
    role: "Product Designer",
    description:
      "Designed mobile-first AI workflows that made multimodal assistance feel direct, useful, and ready for everyday use.",
    artwork: "agi",
    artworkLabel: "People walking around a Samsung phone mockup",
    links: [{ label: "Product Work", href: "https://agi.tech" }],
  },
  {
    year: "2023",
    company: "Krea",
    role: "Designer",
    description:
      "Worked with Krea's founders on inpainting and outpainting tools during the launch of ControlNet-powered creation workflows.",
    artwork: "krea",
    artworkLabel: "Krea creative tool displayed on a monitor",
    links: [{ label: "Launch Notes", href: "https://www.krea.ai/" }],
  },
  {
    year: "2022",
    company: "Skydio Cloud",
    role: "First Product Designer",
    description:
      "Joined as the first designer on Skydio Cloud, building the drone operations platform from zero to one.",
    artwork: "skydio",
    artworkLabel: "Skydio Cloud operations screens in a command center",
    links: [{ label: "Platform", href: "https://www.skydio.com/" }],
  },
];

export function PortfolioCard({
  year,
  company,
  role,
  description,
  artwork,
  artworkLabel,
  links = [],
  className,
}: PortfolioCardProps) {
  return (
    <article className={cn("grid w-full gap-[13px]", className)}>
      <PortfolioCardArtwork artwork={artwork} label={artworkLabel} />

      <div className="grid gap-token-8 font-body text-body font-bold text-text-primary">
        <div className="flex flex-wrap items-center gap-x-token-8 gap-y-token-4">
          <span className="text-text-secondary">{year}</span>
          <span>{company}</span>
          <span className="text-text-secondary">{role}</span>
        </div>

        <p>{description}</p>

        {links.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-token-12 gap-y-token-4 pt-token-4">
            {links.map((link) => (
              <a
                className="inline-flex items-center gap-1 text-text-primary underline-offset-4 transition-colors hover:text-text-secondary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                href={link.href}
                key={`${link.label}-${link.href}`}
              >
                {link.label}
                <ExternalLink aria-hidden="true" className="size-[14px]" />
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function PortfolioCardGrid({
  projects = portfolioProjects,
  className,
}: {
  projects?: PortfolioCardProps[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 gap-x-[37px] gap-y-token-56 md:grid-cols-2",
        className,
      )}
    >
      {projects.map((project) => (
        <PortfolioCard
          key={`${project.year}-${project.company}`}
          {...project}
        />
      ))}
    </div>
  );
}

function PortfolioCardArtwork({
  artwork,
  label,
}: {
  artwork: PortfolioArtwork;
  label: string;
}) {
  return (
    <div
      aria-label={label}
      className="relative aspect-[730/327] w-full overflow-hidden rounded-token-xs bg-[#b20000]"
      role="img"
    >
      {artwork === "nell" ? <NellArtwork /> : null}
      {artwork === "agi" ? <AgiArtwork /> : null}
      {artwork === "krea" ? (
        <div className="absolute left-[-1.5%] top-[-42%] h-[184%] w-[103%]">
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="(min-width: 768px) 752px, calc(103vw - 32px)"
            src="/portfolio/krea.png"
          />
        </div>
      ) : null}
      {artwork === "skydio" ? (
        <div className="absolute left-[-0.2%] top-[-24.5%] h-[149%] w-[100.4%]">
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="(min-width: 768px) 733px, calc(100vw - 32px)"
            src="/portfolio/skydio-cloud.png"
          />
        </div>
      ) : null}
    </div>
  );
}

function NellArtwork() {
  return (
    <div className="absolute left-1/2 top-1/2 flex h-12 w-[171px] -translate-x-1/2 -translate-y-1/2 items-center gap-[12px]">
      <Image
        alt=""
        className="h-[42px] w-[66px]"
        height={42}
        src="/portfolio/nell-mark.svg"
        width={66}
      />
      <Image
        alt=""
        className="h-[46px] w-[86px]"
        height={46}
        src="/portfolio/nell-wordmark.svg"
        width={86}
      />
    </div>
  );
}

function AgiArtwork() {
  return (
    <>
      <div className="absolute left-[-9.6%] top-[-5.8%] h-[113.8%] w-[119.2%]">
        <Image
          alt=""
          className="object-cover"
          fill
          sizes="(min-width: 768px) 870px, 119vw"
          src="/portfolio/agi-background.png"
        />
      </div>
      <div className="absolute left-[41%] top-[9.2%] aspect-[1014/2077] w-[17.9%]">
        <div className="absolute left-[3.38%] top-[1.58%] h-[96.6%] w-[92.65%]">
          <Image
            alt=""
            className="rounded-[4px] object-cover"
            fill
            sizes="121px"
            src="/portfolio/samsung-screen.png"
          />
        </div>
        <Image
          alt=""
          className="absolute inset-0 size-full object-contain"
          fill
          sizes="131px"
          src="/portfolio/samsung-s24-ultra.png"
        />
      </div>
    </>
  );
}
