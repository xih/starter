import { ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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
    links: [{ label: "Case Study", href: "/work/nell" }],
  },
  {
    year: "2025",
    company: "AGI",
    role: "Product Designer",
    description:
      "Designed mobile-first AI workflows that made multimodal assistance feel direct, useful, and ready for everyday use.",
    artwork: "agi",
    artworkLabel: "People walking around a Samsung phone mockup",
    links: [{ label: "Case Study", href: "/work/agi" }],
  },
  {
    year: "2023",
    company: "Krea",
    role: "Designer",
    description:
      "Worked with Krea's founders on inpainting and outpainting tools during the launch of ControlNet-powered creation workflows.",
    artwork: "krea",
    artworkLabel: "Krea creative tool displayed on a monitor",
    links: [{ label: "Case Study", href: "/work/krea" }],
  },
  {
    year: "2022",
    company: "Skydio Cloud",
    role: "First Product Designer",
    description:
      "Joined as the first designer on Skydio Cloud, building the drone operations platform from zero to one.",
    artwork: "skydio",
    artworkLabel: "Skydio Cloud operations screens in a command center",
    links: [
      { label: "Case Study", href: "/work/skydio" },
      { label: "Platform", href: "https://www.skydio.com/" },
    ],
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
  const caseStudyHref = links.find((link) => link.label === "Case Study")?.href;
  return (
    <article className={cn("grid w-full gap-[13px]", className)}>
      <PortfolioCardArtwork
        artwork={artwork}
        href={caseStudyHref}
        label={artworkLabel}
        title={company}
      />

      <div className="grid gap-[8px] font-body text-[14px] font-[400] leading-[18px] text-[#121318]">
        <div className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px]">
          <span className="text-[#595a5d]">{year}</span>
          <span>{company}</span>
          <span className="text-[#595a5d]">{role}</span>
        </div>

        <p>{description}</p>

        {links.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-token-12 gap-y-token-4 pt-token-4">
            {links.map((link) => {
              const linkClassName =
                "inline-flex items-center gap-1 text-[#121318] underline-offset-4 transition-colors hover:text-[#68696d] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121318] focus-visible:ring-offset-2";
              const key = `${link.label}-${link.href}`;

              return link.href.startsWith("/") ? (
                <Link className={linkClassName} href={link.href} key={key}>
                  {link.label}
                </Link>
              ) : (
                <a className={linkClassName} href={link.href} key={key}>
                  {link.label}
                  <ExternalLink aria-hidden="true" className="size-[14px]" />
                </a>
              );
            })}
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
  href,
  label,
  title,
}: {
  artwork: PortfolioArtwork;
  href?: string;
  label: string;
  title: string;
}) {
  const artworkContent = (
    <>
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
    </>
  );

  if (href) {
    return (
      <Link
        aria-label={`${label} — ${title} case study`}
        className="relative block aspect-[332/327] w-full overflow-hidden rounded-token-xs bg-[#b20000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121318] focus-visible:ring-offset-2 md:aspect-[730/327]"
        href={href}
      >
        {artworkContent}
      </Link>
    );
  }

  return (
    <div
      aria-label={label}
      className="relative aspect-[332/327] w-full overflow-hidden rounded-token-xs bg-[#b20000] md:aspect-[730/327]"
      role="img"
    >
      {artworkContent}
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
