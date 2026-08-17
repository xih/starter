"use client";

import Image from "next/image";
import { type DialConfig, useDialKit } from "dialkit";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { PortfolioFooter } from "@starter/design-system";

import { PortfolioHeader } from "~/components/PortfolioHeader";
import { SkeuomorphicClock } from "~/components/SkeuomorphicClock";
import { cn } from "~/lib/utils";
import type {
  CaseStudy as CaseStudyData,
  CaseStudyImage,
  CaseStudyTextBlock,
} from "./cases";

const IMAGE_ASPECT = "1006 / 562";
const SURFACE_LINK_CLASS =
  "font-body inline-block text-[15px] leading-[20px] font-[400]";
const SURFACE_GROUP_CLASS =
  "font-body inline-block text-[15px] leading-[20px] font-[600] text-[#1e1f24]";
const SURFACE_SCROLL_CONTROLS = {
  offsetPx: [24, 0, 120, 1],
  springStiffness: [490, 80, 1_600, 10],
  springDamping: [44, 8, 120, 1],
  initialVelocity: [0.4, 0, 4, 0.1],
  maxDurationMs: [700, 120, 1_400, 10],
  settleDistancePx: [1.1, 0.1, 12, 0.1],
  settleVelocityPxPerSecond: [39, 1, 160, 1],
} satisfies DialConfig;

type SurfaceScrollControls = {
  initialVelocity: number;
  maxDurationMs: number;
  offsetPx: number;
  settleDistancePx: number;
  settleVelocityPxPerSecond: number;
  springDamping: number;
  springStiffness: number;
};

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

function getCurrentScrollTop() {
  return (
    window.scrollY ?? window.pageYOffset ?? document.documentElement.scrollTop
  );
}

function getMaxScrollTop() {
  const documentElement = document.documentElement;
  const body = document.body;
  const scrollHeight = Math.max(
    documentElement.scrollHeight,
    body?.scrollHeight ?? 0,
  );

  return Math.max(0, scrollHeight - window.innerHeight);
}

function getSurfaceTargetScrollTop(target: HTMLElement, offsetPx: number) {
  const currentScrollTop = getCurrentScrollTop();
  const targetTop =
    currentScrollTop + target.getBoundingClientRect().top - offsetPx;

  return Math.max(0, Math.min(getMaxScrollTop(), Math.round(targetTop)));
}

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

        if (block.kind === "ordered-list" || block.kind === "unordered-list") {
          const List = block.kind === "ordered-list" ? "ol" : "ul";
          const listClassName =
            block.kind === "ordered-list" ? "list-decimal" : "list-disc";

          return (
            <List className={cn(listClassName, "pl-[24px]")} key={key}>
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </List>
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
  const headingId = `case-${study.slug}-title`;
  const surfaceScrollFrameRef = useRef<number | null>(null);
  const hasOverview = Boolean(study.overviewTitle);
  const OverlineHeading = hasOverview ? "h2" : "h1";
  const SectionHeading = hasOverview ? "h3" : "h2";
  const surfaceScroll = useDialKit(
    "Case study product surface scroll",
    SURFACE_SCROLL_CONTROLS,
    {
      id: "case-study-product-surface-scroll",
      persist: {
        key: "case-study-product-surface-scroll-v1",
        storage: "localStorage",
        presets: true,
      },
      shortcuts: {
        maxDurationMs: { key: "d", mode: "coarse" },
        springDamping: { key: "m", mode: "coarse" },
        springStiffness: { key: "s", mode: "coarse" },
      },
    },
  ) as SurfaceScrollControls;

  useEffect(() => {
    return () => {
      if (surfaceScrollFrameRef.current !== null) {
        cancelAnimationFrame(surfaceScrollFrameRef.current);
      }
    };
  }, []);

  const handleSurfaceClick =
    (target: string) => (event: MouseEvent<HTMLAnchorElement>) => {
      const targetElement = document.getElementById(target);

      if (!targetElement) return;

      event.preventDefault();

      if (surfaceScrollFrameRef.current !== null) {
        cancelAnimationFrame(surfaceScrollFrameRef.current);
        surfaceScrollFrameRef.current = null;
      }

      const startScrollTop = getCurrentScrollTop();
      const targetScrollTop = getSurfaceTargetScrollTop(
        targetElement,
        surfaceScroll.offsetPx,
      );
      const distance = targetScrollTop - startScrollTop;

      if (prefersReducedMotion() || Math.abs(distance) < 2) {
        window.scrollTo({ top: targetScrollTop, behavior: "auto" });
        window.history.replaceState(null, "", `#${target}`);
        return;
      }

      const startedAt = performance.now();
      let lastTimestamp = startedAt;
      let currentScrollTop = startScrollTop;
      let velocity =
        Math.sign(distance) *
        Math.abs(distance) *
        surfaceScroll.initialVelocity;

      function tick(now: number) {
        const elapsedMs = now - startedAt;
        const deltaSeconds = Math.min(
          0.032,
          Math.max(0, now - lastTimestamp) / 1_000,
        );

        lastTimestamp = now;

        const displacement = targetScrollTop - currentScrollTop;
        const acceleration =
          surfaceScroll.springStiffness * displacement -
          surfaceScroll.springDamping * velocity;

        velocity += acceleration * deltaSeconds;
        currentScrollTop += velocity * deltaSeconds;

        window.scrollTo({ top: currentScrollTop, behavior: "auto" });

        const isSettled =
          Math.abs(targetScrollTop - currentScrollTop) <=
            surfaceScroll.settleDistancePx &&
          Math.abs(velocity) <= surfaceScroll.settleVelocityPxPerSecond;

        if (!isSettled && elapsedMs < surfaceScroll.maxDurationMs) {
          surfaceScrollFrameRef.current = requestAnimationFrame(tick);
          return;
        }

        surfaceScrollFrameRef.current = null;
        window.scrollTo({ top: targetScrollTop, behavior: "auto" });
        window.history.replaceState(null, "", `#${target}`);
      }

      surfaceScrollFrameRef.current = requestAnimationFrame(tick);
    };

  return (
    <main className="min-h-screen bg-white text-[#1e1f24]">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="relative h-[44px]">
          <PortfolioHeader className="md:px-[92px]" tone="dark" />
        </div>

        <div className="px-[20px] pb-[48px] md:grid md:grid-cols-[236px_minmax(0,1fr)] md:gap-[64px] md:px-[92px]">
          {/* Fixed-vertical sidebar on desktop; stacks inline on mobile. */}
          <aside className="md:sticky md:top-0 md:flex md:h-screen md:flex-col md:self-start md:overflow-y-auto md:py-[48px] md:pr-[8px]">
            <div className="pt-[40px] md:pt-0">
              <p className="font-body text-[15px] font-[600] leading-[18px]">
                {study.company}
              </p>
              <p className="mt-[8px] font-body text-[15px] font-[400] leading-[18px] text-[#595a5d]">
                {study.role}
              </p>
              <p className="font-body text-[15px] font-[400] leading-[18px] text-[#595a5d]">
                {study.period}
              </p>
              <p className="mt-[16px] font-body text-[15px] font-[400] leading-[21px] text-[#595a5d] md:max-w-[240px]">
                {study.description}
              </p>
            </div>

            <nav aria-label="Product surfaces" className="mt-[40px]">
              <p className="font-body text-[20px] font-[600] leading-[22px]">
                Product Surfaces
              </p>
              <ul className="mt-[12px] flex flex-col">
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
          </aside>

          {/* Scrolling main column. */}
          <div className="pt-[40px] md:pt-[48px]">
            {hasOverview ? (
              <div>
                <h1
                  className="font-title text-[28px] font-[500] leading-[31.1px] tracking-[-0.02em] text-[#1e1f24] md:text-[36px] md:leading-[40px]"
                  id={headingId}
                >
                  {study.overviewTitle}
                </h1>
                <CaseStudyBody blocks={study.overviewBody} />
              </div>
            ) : null}

            <OverlineHeading
              className={cn(
                "font-title text-[28px] font-[500] leading-[31.1px] tracking-[-0.02em] text-[#1e1f24]",
                hasOverview ? "mt-[40px]" : undefined,
              )}
              id={hasOverview ? `${study.slug}-selected-work` : headingId}
            >
              {study.overline}
            </OverlineHeading>

            <div className="mt-[40px] flex flex-col gap-[64px]">
              {study.sections.map((section) => {
                return (
                  <section
                    aria-labelledby={`${section.id}-label`}
                    className="scroll-mt-[24px]"
                    id={section.id}
                    key={section.id}
                  >
                    <SectionHeading
                      className="font-body text-[20px] font-[600] leading-[22px] text-[#1e1f24]"
                      id={`${section.id}-label`}
                    >
                      {section.label}
                    </SectionHeading>
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
                );
              })}
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
