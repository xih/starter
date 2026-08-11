"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { PortfolioFooter } from "@starter/design-system";

import { PortfolioHeader } from "~/components/PortfolioHeader";
import { SkeuomorphicClock } from "~/components/SkeuomorphicClock";
import { cn } from "~/lib/utils";
import type { CaseStudy as CaseStudyData } from "./cases";

const IMAGE_ASPECT = "1006 / 562";
const SURFACE_ITEM_CLASS =
  "font-body inline-block text-[15px] leading-[18px] font-[400]";

function useActiveSection(sectionIds: string[]) {
  const [activeId, setActiveId] = useState<string | null>(
    sectionIds[0] ?? null,
  );

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

        if (bestId && bestRatio > 0) {
          setActiveId(bestId);
        }
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

/**
 * Extract the 11-char YouTube video id from any of:
 *   https://www.youtube.com/watch?v=ID
 *   https://www.youtube.com/watch?v=ID&t=16s
 *   https://youtu.be/ID
 * Returns null if the URL is not a recognizable YouTube URL.
 */
function parseYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "");
      return /^[A-Za-z0-9_-]{6,}$/.test(id) ? id : null;
    }
    if (parsed.hostname.endsWith("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id && /^[A-Za-z0-9_-]{6,}$/.test(id) ? id : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Lite YouTube facade: shows YouTube's thumbnail with a play button and only
 * loads the heavy player iframe once the user clicks. Keeps the page fast on
 * mobile while still allowing the video to be watched in place.
 */
function LiteYouTube({ url, alt }: { url: string; alt: string }) {
  const id = parseYouTubeId(url);
  const [activated, setActivated] = useState(false);

  if (!id) return null;

  const thumbnail = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  const embedSrc = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

  return (
    <div className="absolute inset-0">
      {activated ? (
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 size-full"
          referrerPolicy="strict-origin-when-cross-origin"
          src={embedSrc}
          title={alt}
        />
      ) : (
        <button
          aria-label={`Play ${alt}`}
          className="group absolute inset-0 flex items-center justify-center overflow-hidden focus-visible:outline-none"
          onClick={() => setActivated(true)}
          type="button"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
            src={thumbnail}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-black/20 transition-opacity group-hover:opacity-80" />
          <span
            aria-hidden="true"
            className="relative flex size-[68px] items-center justify-center rounded-full bg-[#ff0000] shadow-[0_10px_40px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-110 group-focus-visible:scale-110 group-focus-visible:ring-4 group-focus-visible:ring-white/70 md:size-[84px]"
          >
            <svg
              className="ml-[6px] size-[26px] fill-white md:size-[32px]"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}

/**
 * Plays only while the section is on screen. `preload="none"` plus no
 * `autoPlay` means the media is not fetched until the video scrolls into view,
 * so off-screen sections show their poster and transfer nothing.
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

export function CaseStudy({ study }: { study: CaseStudyData }) {
  const sectionIds = useMemo(
    () => study.sections.map((section) => section.id),
    [study.sections],
  );
  const activeId = useActiveSection(sectionIds);
  const assetBase = `/work/${study.slug}`;
  const headingId = `case-${study.slug}-title`;

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
              <ul className="mt-[12px] flex flex-col gap-[8px]">
                {study.surfaces.map((surface) => {
                  const isActive =
                    surface.target != null && surface.target === activeId;

                  return (
                    <li key={surface.label}>
                      {surface.target ? (
                        <a
                          aria-current={isActive ? "true" : undefined}
                          className={cn(
                            SURFACE_ITEM_CLASS,
                            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1f24]",
                            isActive
                              ? "font-[600] text-[#1e1f24]"
                              : "text-[#595a5d] hover:text-[#1e1f24]",
                          )}
                          href={`#${surface.target}`}
                          onClick={handleSurfaceClick(surface.target)}
                        >
                          {surface.label}
                        </a>
                      ) : (
                        <span
                          className={cn(SURFACE_ITEM_CLASS, "text-[#595a5d]")}
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
            <h1
              className="font-title text-[28px] font-[500] leading-[31.1px] tracking-[-0.02em] text-[#1e1f24]"
              id={headingId}
            >
              {study.overline}
            </h1>

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
                  <div className="mt-[16px] flex flex-col gap-[24px]">
                    {section.images.map((image) => (
                      // Landscape card matching the Figma mock: the mockup sits
                      // centered on the shared #f3f3f3 background. Video assets
                      // carry the same gray baked in, so they blend seamlessly.
                      <div
                        className="relative w-full overflow-hidden rounded-[20px] bg-[#f3f3f3]"
                        key={image.src}
                        style={{ aspectRatio: IMAGE_ASPECT }}
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
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>

      <PortfolioFooter
        clock={
          <SkeuomorphicClock
            initialTime="14:16:05"
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
