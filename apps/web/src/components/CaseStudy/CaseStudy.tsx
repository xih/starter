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
              <p className="font-body text-[15px] leading-[18px] font-[600]">
                {study.company}
              </p>
              <p className="font-body mt-[8px] text-[15px] leading-[18px] font-[400] text-[#595a5d]">
                {study.role}
              </p>
              <p className="font-body text-[15px] leading-[18px] font-[400] text-[#595a5d]">
                {study.period}
              </p>
              <p className="font-body mt-[16px] text-[15px] leading-[21px] font-[400] text-[#595a5d] md:max-w-[240px]">
                {study.description}
              </p>
            </div>

            <nav aria-label="Product surfaces" className="mt-[40px]">
              <p className="font-body text-[20px] leading-[22px] font-[600]">
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
                            "transition-colors focus-visible:ring-2 focus-visible:ring-[#1e1f24] focus-visible:outline-none",
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
                        <span className={cn(SURFACE_ITEM_CLASS, "text-[#595a5d]")}>
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
              className="font-title text-[28px] leading-[31.1px] font-[500] tracking-[-0.02em] text-[#1e1f24]"
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
                    className="font-body text-[20px] leading-[22px] font-[600] text-[#1e1f24]"
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
