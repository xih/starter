import { ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { cn } from "~/lib/utils";

export type PortfolioCardLink = {
  label: string;
  href: string;
};

export type PortfolioArtwork = "nell" | "agi-krea" | "skydio";

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
      "Worked with the co-founder of SoundCloud to build out generative AI experiences, raising from Index Ventures.",
    artwork: "nell",
    artworkLabel: "Nell mobile creation flow screen",
    links: [{ label: "Case Study", href: "/work/nell" }],
  },
  {
    year: "2022",
    company: "Skydio Cloud",
    role: "First Product Designer",
    description:
      "First designer on Skydio Cloud, building out the platform from 0-1.",
    artwork: "skydio",
    artworkLabel: "Skydio Cloud fleet map",
    links: [
      { label: "Case Study", href: "/work/skydio" },
      { label: "Platform", href: "https://www.skydio.com/" },
    ],
  },
  {
    year: "2023-2025",
    company: "Krea + AGI",
    role: "Product Design Consultant",
    description:
      "Collaborated with the founders of AGI and Krea to design and build out AI Agent Phones as well as text-to-image workflows for inpainting and outpainting.",
    artwork: "agi-krea",
    artworkLabel: "Krea and AGI combined phone prototype graphic",
    links: [{ label: "Case Study", href: "/work/agi-krea" }],
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
      {artwork === "agi-krea" ? <AgiKreaArtwork /> : null}
      {artwork === "skydio" ? <SkydioArtwork /> : null}
    </>
  );

  if (href) {
    return (
      <Link
        aria-label={`${label} — ${title} case study`}
        className="relative block aspect-[332/327] w-full overflow-hidden rounded-token-xs bg-[#f3f3f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121318] focus-visible:ring-offset-2 md:aspect-[730/327]"
        href={href}
      >
        {artworkContent}
      </Link>
    );
  }

  return (
    <div
      aria-label={label}
      className="relative aspect-[332/327] w-full overflow-hidden rounded-token-xs bg-[#f3f3f3] md:aspect-[730/327]"
      role="img"
    >
      {artworkContent}
    </div>
  );
}

function NellArtwork() {
  return (
    <div className="absolute left-[24.4%] top-[4.28%] h-[91.74%] w-[50.9%] md:left-[34.25%] md:top-0 md:h-[100.31%] md:w-[25.34%]">
      <Image
        alt=""
        className="object-contain"
        fill
        sizes="(min-width: 768px) 185px, 169px"
        src="/portfolio/nell-creation-flow.png"
      />
    </div>
  );
}

function SkydioArtwork() {
  return (
    <div className="absolute left-[5.12%] top-[23.55%] h-[56.88%] w-[89.46%] md:left-[16.16%] md:top-[8.87%] md:h-[82.76%] md:w-[59.31%]">
      <Image
        alt=""
        className="object-contain"
        fill
        sizes="(min-width: 768px) 433px, 297px"
        src="/portfolio/skydio-map.png"
      />
    </div>
  );
}

function AgiKreaArtwork() {
  return (
    <div className="absolute left-1/2 top-[8.26%] h-[83.79%] w-[38.55%] -translate-x-1/2 md:w-[17.53%]">
      <Image
        alt=""
        className="object-contain"
        fill
        quality={90}
        sizes="(min-width: 768px) 128px, 39vw"
        src="/portfolio/agi-krea-phone.png"
      />
    </div>
  );
}
