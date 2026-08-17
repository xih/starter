"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { PortfolioFooter } from "@starter/design-system";

import { PortfolioHeader } from "~/components/PortfolioHeader";
import { SkeuomorphicClock } from "~/components/SkeuomorphicClock";
import { cn } from "~/lib/utils";
import type {
  CaseStudy as CaseStudyData,
  CaseStudyImage,
  CaseStudyIntroSection,
  CaseStudyTextBlock,
} from "./cases";

const IMAGE_ASPECT = "1006 / 562";
const SURFACE_LINK_CLASS =
  "font-body inline-block text-[15px] leading-[20px] font-[400]";
const SURFACE_GROUP_CLASS =
  "font-body inline-block text-[15px] leading-[20px] font-[600] text-[#1e1f24]";

function useActiveSection(sectionIds: string[]) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) return;

    const visibility = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibility.set(entry.target.id, entry.intersectionRatio);
        }

        let bestId: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of visibility) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }

        setActiveId(bestId && bestRatio > 0 ? bestId : null);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [sectionIds]);

  return activeId;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
// Exact host match — `.endsWith("youtube.com")` would match `evil-youtube.com`
// (CodeQL "Incomplete URL substring sanitization").
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
]);

/**
 * Parse a YouTube URL into its video id and optional start offset.
 *   https://www.youtube.com/watch?v=ID
 *   https://www.youtube.com/watch?v=ID&t=16s   → { id, startSeconds: 16 }
 *   https://youtu.be/ID?t=1m30s                 → { id, startSeconds: 90 }
 * Returns null if the URL is not a recognisable YouTube URL.
 */
function parseYouTubeUrl(
  url: string,
): { id: string; startSeconds: number } | null {
  try {
    const parsed = new URL(url);
    let id: string | null = null;
    if (parsed.hostname === "youtu.be") {
      id = parsed.pathname.replace(/^\//, "");
    } else if (YOUTUBE_HOSTS.has(parsed.hostname)) {
      id = parsed.searchParams.get("v");
    }
    if (!id || !YOUTUBE_ID.test(id)) return null;
    const startSeconds = parseYouTubeStart(
      parsed.searchParams.get("t") ?? parsed.searchParams.get("start"),
    );
    return { id, startSeconds };
  } catch {
    return null;
  }
}

/**
 * Accepts "16", "16s", "1m30s", "1h2m3s" and returns whole seconds. Falls
 * back to 0 for anything unrecognisable — YouTube ignores a 0 start param.
 */
function parseYouTubeStart(raw: string | null | undefined): number {
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Number(raw);
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw);
  if (!match) return 0;
  const [, h, m, s] = match;
  return Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
}

/**
 * Reduced-chrome YouTube embed for case-study walkthroughs. YouTube's iframe
 * UI is cross-origin, so we cannot style internals directly. The closest
 * iframe-only option is to hide controls and disable pointer hover affordances.
 */
function LiteYouTube({ url, alt }: { url: string; alt: string }) {
  const parsed = parseYouTubeUrl(url);
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || isVisible) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;

        setIsVisible(true);
        observer.disconnect();
      },
      { rootMargin: "160px 0px", threshold: 0.2 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [isVisible]);

  if (!parsed) return null;

  const { id, startSeconds } = parsed;
  const startParam = startSeconds > 0 ? `&start=${startSeconds}` : "";
  const embedSrc = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0&rel=0&playsinline=1${startParam}`;

  return (
    <div
      className="absolute inset-0"
      data-testid="youtube-embed-gate"
      ref={ref}
    >
      {isVisible ? (
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          className="pointer-events-none absolute inset-0 size-full"
          referrerPolicy="strict-origin-when-cross-origin"
          src={embedSrc}
          title={alt}
        />
      ) : null}
    </div>
  );
}

/**
 * Plays muted media while the section is on screen, then pauses it when the
 * user scrolls away. `preload="none"` keeps off-screen sections on posters.
 */
function LazyVideo({
  alt,
  poster,
  src,
}: {
  alt: string;
  poster: string;
  src: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      void element.play()?.catch(() => undefined);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void element.play()?.catch(() => undefined);
        } else {
          element.pause();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      aria-label={alt}
      className="absolute inset-0 size-full object-contain"
      loop
      muted
      playsInline
      poster={poster}
      preload="none"
      ref={ref}
      src={src}
    />
  );
}

function CaseStudyBody({ blocks }: { blocks?: CaseStudyTextBlock[] }) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="mt-[16px] flex flex-col gap-[18px] font-body text-[15px] font-[400] leading-[18px] text-[#1e1f24]">
      {blocks.map((block, index) => {
        const key = `${block.kind}-${index}`;

        if (block.kind === "subheading") {
          return (
            <p className="font-[600]" key={key}>
              {block.text}
            </p>
          );
        }

        if (block.kind === "ordered-list") {
          return (
            <ol className="list-decimal pl-[24px]" key={key}>
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          );
        }

        if (block.kind === "link") {
          return (
            <p key={key}>
              <a
                className="underline decoration-solid underline-offset-[2px] transition-colors hover:text-[#68696d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1f24]"
                href={block.href}
                rel="noreferrer"
                target="_blank"
              >
                {block.label}
              </a>
              {block.suffix}
            </p>
          );
        }

        return <p key={key}>{block.text}</p>;
      })}
    </div>
  );
}

function CaseStudyIntroSectionView({
  section,
}: {
  section: CaseStudyIntroSection;
}) {
  return (
    <section className="flex flex-col gap-[16px] text-[#1e1f24]">
      {section.heading ? (
        <h2 className="font-body text-[20px] font-[600] leading-[22px]">
          {section.heading}
        </h2>
      ) : null}

      {section.kind === "list" ? (
        <div className="font-body text-[13px] font-[400] leading-[15.6px] md:text-[15px] md:leading-[18px]">
          <p>{section.lead}</p>
          <ol className="list-[lower-alpha] pl-[39px] md:pl-[45px]">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <p className="mt-[15.6px] whitespace-pre-line md:mt-[18px]">
            {section.body}
          </p>
        </div>
      ) : (
        <p className="whitespace-pre-line font-body text-[13px] font-[400] leading-[15.6px] text-black md:text-[15px] md:leading-[18px]">
          {section.body}
        </p>
      )}
    </section>
  );
}

function CaseStudyIntro({
  lead,
  sections,
  title,
}: {
  lead?: string;
  sections?: CaseStudyIntroSection[];
  title?: string;
}) {
  if (!title || !lead) return null;

  return (
    <div className="flex flex-col gap-[16px] [word-break:break-word]">
      <section className="flex flex-col gap-[16px]">
        <h1
          className="font-body text-[20px] font-[600] leading-[22px] text-[#1e1f24] md:font-title md:text-[36px] md:font-[500] md:leading-[40px] md:tracking-[-0.02em]"
          id="case-study-intro-title"
        >
          {title}
        </h1>
        <p className="whitespace-pre-line font-body text-[13px] font-[400] leading-[15.6px] text-black md:text-[15px] md:leading-[18px]">
          {lead}
        </p>
      </section>

      {sections?.map((section) => (
        <CaseStudyIntroSectionView
          key={section.heading ?? section.kind}
          section={section}
        />
      ))}
    </div>
  );
}

function CaseStudyImageFrame({
  assetBase,
  image,
}: {
  assetBase: string;
  image: CaseStudyImage;
}) {
  const frameClassName =
    "relative w-full overflow-hidden rounded-[20px] bg-[#f3f3f3]";

  if (image.mobileSrc) {
    return (
      <>
        <div
          className={cn(frameClassName, "hidden md:block")}
          style={{ aspectRatio: image.aspectRatio ?? IMAGE_ASPECT }}
        >
          <Image
            alt={image.alt}
            className="object-contain"
            fill
            quality={90}
            sizes="1006px"
            src={`${assetBase}/${image.src}`}
          />
        </div>
        <div
          className={cn(frameClassName, "md:hidden")}
          style={{ aspectRatio: image.mobileAspectRatio ?? IMAGE_ASPECT }}
        >
          <Image
            alt={image.alt}
            className="object-contain"
            fill
            quality={90}
            sizes="100vw"
            src={`${assetBase}/${image.mobileSrc}`}
          />
        </div>
      </>
    );
  }

  return (
    <div
      className={frameClassName}
      style={{ aspectRatio: image.aspectRatio ?? IMAGE_ASPECT }}
    >
      {image.video ? (
        <LazyVideo
          alt={image.alt}
          poster={`${assetBase}/${image.src}`}
          src={`${assetBase}/${image.video}`}
        />
      ) : image.youtube ? (
        <LiteYouTube alt={image.alt} url={image.youtube} />
      ) : (
        <Image
          alt={image.alt}
          className="object-contain"
          fill
          quality={90}
          sizes="(max-width: 767px) 100vw, 1006px"
          src={`${assetBase}/${image.src}`}
        />
      )}
    </div>
  );
}

export function CaseStudy({ study }: { study: CaseStudyData }) {
  const sectionIds = useMemo(
    () => study.sections.map((section) => section.id),
    [study.sections],
  );
  const activeId = useActiveSection(sectionIds);
  const assetBase = `/work/${study.slug}`;
  const hasIntro = Boolean(study.introTitle && study.introLead);
  const headingId = hasIntro ? undefined : `case-${study.slug}-title`;

  const handleSurfaceClick = (target: string) => () => {
    document
      .getElementById(target)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen bg-white text-[#1e1f24]">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="relative h-[44px]">
          <PortfolioHeader tone="dark" />
        </div>

        <div className="px-[20px] pb-[48px] md:grid md:grid-cols-[192px_minmax(0,1012px)] md:gap-[34px] md:px-[117px]">
          {/* Fixed-vertical sidebar on desktop; stacks inline on mobile. */}
          <aside className="md:sticky md:top-0 md:flex md:h-screen md:flex-col md:self-start md:overflow-y-auto md:pb-[48px] md:pt-[71px]">
            <div className="pt-[34px] md:pt-0">
              <p className="font-body text-[15px] font-[600] leading-[18px]">
                {study.company}
              </p>
              <p className="mt-[7px] font-body text-[15px] font-[400] leading-[18px] text-[#595a5d] md:mt-[8px]">
                {study.role}
              </p>
              <p className="mt-[7px] font-body text-[15px] font-[400] leading-[18px] text-[#595a5d] md:mt-[2px]">
                {study.period}
              </p>
              <p className="mt-[42px] font-body text-[15px] font-[400] leading-[21px] text-[#595a5d] md:mt-[32px] md:max-w-[192px]">
                <span className="md:hidden">
                  {study.mobileDescription ?? study.description}
                </span>
                <span className="hidden md:inline">{study.description}</span>
              </p>
            </div>

            <nav
              aria-label="Product surfaces"
              className="mt-[14px] md:mt-[32px]"
            >
              <p className="font-body text-[20px] font-[600] leading-[22px]">
                Product Surfaces
              </p>
              <ul className="mt-[8px] flex flex-col">
                {study.surfaces.map((surface, index) => {
                  const isActive =
                    surface.target != null && surface.target === activeId;

                  if (surface.kind === "group") {
                    return (
                      <li
                        key={surface.label}
                        className={index === 0 ? undefined : "mt-[16px]"}
                      >
                        <span className={SURFACE_GROUP_CLASS}>
                          {surface.label}
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={surface.label}>
                      {surface.target ? (
                        <a
                          aria-current={isActive ? "true" : undefined}
                          className={cn(
                            SURFACE_LINK_CLASS,
                            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1f24]",
                            isActive
                              ? "font-[500] text-[#1e1f24]"
                              : "text-[#595a5d] hover:text-[#1e1f24]",
                          )}
                          href={`#${surface.target}`}
                          onClick={handleSurfaceClick(surface.target)}
                        >
                          {surface.label}
                        </a>
                      ) : (
                        <span
                          className={cn(SURFACE_LINK_CLASS, "text-[#595a5d]")}
                        >
                          {surface.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>

            {hasIntro ? (
              <div className="mt-[28px] h-[2px] w-full bg-[#1e1f24] md:hidden" />
            ) : null}
          </aside>

          {/* Scrolling main column. */}
          <div className="pt-[38px] md:pt-[60px]">
            <CaseStudyIntro
              lead={study.introLead}
              sections={study.introSections}
              title={study.introTitle}
            />

            {hasIntro ? (
              <div className="mt-[40px] h-[2px] w-full bg-[#1e1f24] md:hidden" />
            ) : null}

            {hasIntro ? (
              <h2 className="mt-[18px] font-title text-[28px] font-[500] leading-[31.1px] tracking-[-0.02em] text-[#1e1f24] md:mt-[40px]">
                {study.overline}
              </h2>
            ) : (
              <h1
                className="font-title text-[28px] font-[500] leading-[31.1px] tracking-[-0.02em] text-[#1e1f24]"
                id={headingId}
              >
                {study.overline}
              </h1>
            )}

            <div className="mt-[40px] flex flex-col gap-[64px]">
              {study.sections.map((section) => (
                <section
                  aria-labelledby={`${section.id}-label`}
                  className="scroll-mt-[24px]"
                  id={section.id}
                  key={section.id}
                >
                  <h2
                    className="font-body text-[20px] font-[600] leading-[22px] text-[#1e1f24]"
                    id={`${section.id}-label`}
                  >
                    {section.label}
                  </h2>
                  <CaseStudyBody blocks={section.body} />
                  {section.images.length > 0 ? (
                    <div className="mt-[16px] flex flex-col gap-[24px]">
                      {section.images.map((image) => (
                        <CaseStudyImageFrame
                          assetBase={assetBase}
                          image={image}
                          key={image.src}
                        />
                      ))}
                    </div>
                  ) : null}
                  <CaseStudyBody blocks={section.bodyAfterImages} />
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>

      <PortfolioFooter
        clock={
          <SkeuomorphicClock
            running
            secondHandMotion="sweep"
            showControls={false}
            size={135}
          />
        }
      />
    </main>
  );
}
