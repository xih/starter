"use client";

import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Maximize2, Minimize2 } from "lucide-react";

import { cn } from "~/lib/utils";
import {
  getCenteredProgressScrollTop,
  getScrollProgress,
  getSectionTargetScrollTop,
} from "./timeline-utils";
import { ScrollTimelineRail } from "./ScrollTimelineRail";
import { TimelinePhysicsControls } from "./TimelinePhysicsControls";
import type {
  InteractionPattern,
  InteractionSection,
  TimelinePhase,
  TimelineTimingDefaults,
} from "./types";

const SAME_REGION_PULSE_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";

type ArchiveScrollTimelineDemoProps = {
  forcedHover?: boolean;
  forcedPhase?: TimelinePhase;
  forcedProgress?: number;
  pattern: InteractionPattern;
  reducedMotionOverride?: boolean;
  showDialKit?: boolean;
};

function usePrefersReducedMotion(override?: boolean) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    override ?? false,
  );

  useEffect(() => {
    if (override !== undefined) {
      setPrefersReducedMotion(override);
      return;
    }

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, [override]);

  return prefersReducedMotion;
}

function getActiveSection(
  sections: InteractionSection[],
  progress: number,
): InteractionSection {
  return sections.reduce(
    (active, section) => {
      if (section.progress <= progress + 0.02) {
        return section;
      }

      return active;
    },
    sections[0] ?? { id: "", label: "", title: "", summary: "", progress: 0 },
  );
}

export function ArchiveScrollTimelineDemo({
  forcedHover,
  forcedPhase,
  forcedProgress,
  pattern,
  reducedMotionOverride,
  showDialKit = true,
}: ArchiveScrollTimelineDemoProps) {
  return (
    <TimelinePhysicsControls showPanel={showDialKit}>
      {(controls) => (
        <ArchiveScrollTimelineExperience
          controls={controls}
          forcedHover={forcedHover}
          forcedPhase={forcedPhase}
          forcedProgress={forcedProgress}
          pattern={pattern}
          reducedMotionOverride={reducedMotionOverride}
        />
      )}
    </TimelinePhysicsControls>
  );
}

function ArchiveScrollTimelineExperience({
  controls,
  forcedHover,
  forcedPhase,
  forcedProgress,
  pattern,
  reducedMotionOverride,
}: ArchiveScrollTimelineDemoProps & { controls: TimelineTimingDefaults }) {
  const readerRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLElement>(null);
  const phaseTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const travelAnimationRef = useRef<number | null>(null);
  const programmaticTravelRef = useRef(false);
  const timelineScrubbingRef = useRef(false);
  const [progress, setProgress] = useState(forcedProgress ?? 0);
  const [phase, setPhase] = useState<TimelinePhase>(forcedPhase ?? "idle");
  const [hovering, setHovering] = useState(false);
  const [localFullscreen, setLocalFullscreen] = useState(false);
  const [sameRegionPulse, setSameRegionPulse] = useState(false);
  const [viewportOriginY, setViewportOriginY] = useState(360);
  const [selectedSectionId, setSelectedSectionId] = useState(
    pattern.sections[0]?.id,
  );
  const reducedMotion = usePrefersReducedMotion(reducedMotionOverride);
  const displayPhase = forcedPhase ?? phase;
  const displayProgress = forcedProgress ?? progress;
  const displayHover = forcedHover ?? hovering;
  const displayFullscreen = localFullscreen;
  const activeSection = useMemo(
    () => getActiveSection(pattern.sections, displayProgress),
    [displayProgress, pattern.sections],
  );

  useEffect(() => {
    if (forcedProgress !== undefined) {
      setProgress(forcedProgress);
    }
  }, [forcedProgress]);

  useEffect(() => {
    if (forcedPhase !== undefined) {
      setPhase(forcedPhase);
    }
  }, [forcedPhase]);

  useEffect(() => {
    return () => {
      phaseTimeouts.current.forEach(clearTimeout);
      if (travelAnimationRef.current !== null) {
        cancelAnimationFrame(travelAnimationRef.current);
      }
    };
  }, []);

  function getSameRegionPulseDuration() {
    return controls.sameRegionPulseDurationMs;
  }

  function getSameRegionPulseTotal() {
    return controls.sameRegionPulseDurationMs * 2 + 60;
  }

  function easeOutByPower(value: number, power: number) {
    return 1 - Math.pow(1 - value, power);
  }

  function updateViewportOrigin(nextScrollTop?: number) {
    const reader = readerRef.current;

    if (!reader) {
      return;
    }

    const scrollTop = nextScrollTop ?? reader.scrollTop;
    const maxScroll = Math.max(0, reader.scrollHeight - reader.clientHeight);
    const scrollProgress = maxScroll > 0 ? scrollTop / maxScroll : 0.5;
    const viewportFocusRatio = 0.25 + scrollProgress * 0.5;
    const scale = controls.minimapScale;
    const unscaledPageHeight = reader.scrollHeight;
    const maxVisibleGap = Math.min(reader.clientHeight * 0.18, 132);
    const scaleDelta = Math.max(0.001, 1 - scale);
    const lowestVisibleOrigin =
      (scrollTop +
        reader.clientHeight -
        maxVisibleGap -
        unscaledPageHeight * scale) /
      scaleDelta;
    const highestVisibleOrigin = (scrollTop + maxVisibleGap) / scaleDelta;
    const preferredOrigin =
      scrollTop + reader.clientHeight * viewportFocusRatio;

    setViewportOriginY(
      Math.min(
        highestVisibleOrigin,
        Math.max(lowestVisibleOrigin, preferredOrigin),
      ),
    );
  }

  function syncProgress() {
    const reader = readerRef.current;

    if (!reader) {
      return;
    }

    if (
      forcedProgress !== undefined ||
      timelineScrubbingRef.current ||
      programmaticTravelRef.current
    ) {
      return;
    }

    updateViewportOrigin();

    setProgress(
      getScrollProgress({
        clientHeight: reader.clientHeight,
        scrollHeight: reader.scrollHeight,
        scrollTop: reader.scrollTop,
      }),
    );
  }

  function clearPhaseTimers() {
    phaseTimeouts.current.forEach(clearTimeout);
    phaseTimeouts.current = [];
    programmaticTravelRef.current = false;

    if (travelAnimationRef.current !== null) {
      cancelAnimationFrame(travelAnimationRef.current);
      travelAnimationRef.current = null;
    }
  }

  function getSectionForProgress(nextProgress: number) {
    return getActiveSection(pattern.sections, nextProgress);
  }

  function scrollToProgress(nextProgress: number, syncOrigin = true) {
    const reader = readerRef.current;

    if (!reader) {
      return;
    }

    const targetScrollTop = getSectionTargetScrollTop({
      clientHeight: reader.clientHeight,
      progress: nextProgress,
      scrollHeight: reader.scrollHeight,
    });

    reader.scrollTo({ top: targetScrollTop, behavior: "auto" });
    setProgress(nextProgress);
    setSelectedSectionId(getSectionForProgress(nextProgress).id);

    if (syncOrigin) {
      updateViewportOrigin(targetScrollTop);
    }
  }

  function animateReaderScroll({
    duration,
    onComplete,
    targetScrollTop,
  }: {
    duration: number;
    onComplete: () => void;
    targetScrollTop: number;
  }) {
    const reader = readerRef.current;

    if (!reader) {
      return;
    }

    const animationReader = reader;
    const startScrollTop = animationReader.scrollTop;
    const distance = targetScrollTop - startScrollTop;
    const startedAt = performance.now();

    function tick(now: number) {
      const elapsed = now - startedAt;
      const progressValue = duration <= 0 ? 1 : Math.min(1, elapsed / duration);
      const easedProgress = easeOutByPower(
        progressValue,
        controls.travelEasePower,
      );
      const nextScrollTop = startScrollTop + distance * easedProgress;

      animationReader.scrollTo({ top: nextScrollTop, behavior: "auto" });
      updateViewportOrigin(nextScrollTop);

      if (progressValue < 1) {
        travelAnimationRef.current = requestAnimationFrame(tick);
        return;
      }

      travelAnimationRef.current = null;
      animationReader.scrollTo({ top: targetScrollTop, behavior: "auto" });
      updateViewportOrigin(targetScrollTop);
      onComplete();
    }

    travelAnimationRef.current = requestAnimationFrame(tick);
  }

  function startTimelineScrub(nextProgress: number) {
    clearPhaseTimers();
    timelineScrubbingRef.current = true;
    updateViewportOrigin();

    if (reducedMotion) {
      scrollToProgress(nextProgress);
      setPhase("idle");
      return;
    }

    setSameRegionPulse(false);
    setPhase("zoomingOut");
  }

  function moveTimelineScrub(nextProgress: number) {
    timelineScrubbingRef.current = true;

    if (!reducedMotion) {
      setSameRegionPulse(false);
      setPhase("traveling");
    }

    scrollToProgress(nextProgress);
  }

  function endTimelineScrub(nextProgress: number) {
    clearPhaseTimers();
    scrollToProgress(nextProgress);
    timelineScrubbingRef.current = false;

    if (reducedMotion) {
      setPhase("idle");
      return;
    }

    setSameRegionPulse(false);
    setPhase("zoomingIn");
    phaseTimeouts.current = [
      setTimeout(() => {
        setPhase("idle");
      }, 720),
    ];
  }

  function scrollToTimelineProgress(nextProgress: number) {
    const reader = readerRef.current;

    if (!reader) {
      return;
    }

    timelineScrubbingRef.current = false;

    const currentProgress = getScrollProgress({
      clientHeight: reader.clientHeight,
      scrollHeight: reader.scrollHeight,
      scrollTop: reader.scrollTop,
    });
    const targetSection = getSectionForProgress(nextProgress);
    const currentSection = getSectionForProgress(currentProgress);
    const isSameScrollRegion = currentSection.id === targetSection.id;
    const targetScrollTop = isSameScrollRegion
      ? reader.scrollTop
      : getCenteredProgressScrollTop({
          clientHeight: reader.clientHeight,
          progress: nextProgress,
          scrollHeight: reader.scrollHeight,
        });
    const targetProgress = isSameScrollRegion ? currentProgress : nextProgress;

    setSelectedSectionId(targetSection.id);
    updateViewportOrigin(reader.scrollTop);
    clearPhaseTimers();

    if (reducedMotion) {
      reader.scrollTo({ top: targetScrollTop, behavior: "auto" });
      setPhase("idle");
      setProgress(targetProgress);
      updateViewportOrigin(targetScrollTop);
      return;
    }

    setSameRegionPulse(isSameScrollRegion);
    setPhase("zoomingOut");
    phaseTimeouts.current = [
      setTimeout(
        () => {
          if (!isSameScrollRegion) {
            setSameRegionPulse(false);
            setPhase("traveling");
            programmaticTravelRef.current = true;
            animateReaderScroll({
              duration: controls.travelDurationMs,
              targetScrollTop,
              onComplete: () => {
                programmaticTravelRef.current = false;
                setProgress(targetProgress);
                setSelectedSectionId(targetSection.id);
                updateViewportOrigin(targetScrollTop);
                setPhase("zoomingIn");
                phaseTimeouts.current.push(
                  setTimeout(() => {
                    setPhase("idle");
                  }, controls.zoomDurationMs),
                );
              },
            });
          }
        },
        isSameScrollRegion
          ? Math.round(getSameRegionPulseDuration() * 0.75)
          : controls.travelStartDelayMs,
      ),
      setTimeout(
        () => {
          if (isSameScrollRegion) {
            setProgress(targetProgress);
            updateViewportOrigin(targetScrollTop);
            setPhase("zoomingIn");
          }
        },
        isSameScrollRegion ? getSameRegionPulseDuration() : 0,
      ),
      setTimeout(
        () => {
          if (isSameScrollRegion) {
            setSameRegionPulse(false);
            setPhase("idle");
          }
        },
        isSameScrollRegion ? getSameRegionPulseTotal() : 0,
      ),
    ];
  }

  function scrollToSection(sectionId: string) {
    const section = pattern.sections.find((item) => item.id === sectionId);

    if (!section) {
      return;
    }

    scrollToTimelineProgress(section.progress);
  }

  function toggleFullscreen() {
    setLocalFullscreen((current) => !current);
  }

  function updateEdgeHover(clientX: number) {
    const shell = shellRef.current;

    if (!shell || forcedHover !== undefined) {
      return;
    }

    const bounds = shell.getBoundingClientRect();
    setHovering(clientX >= bounds.right - 280 && clientX <= bounds.right + 8);
  }

  return (
    <section
      className={cn(
        "relative h-[720px] overflow-hidden rounded-md border border-neutral-200 bg-white text-neutral-950",
        displayFullscreen &&
          "fixed inset-0 z-[9000] h-svh rounded-none border-0",
      )}
      style={
        {
          backgroundColor:
            displayPhase === "idle" ? undefined : controls.sideGray,
          "--timeline-blue": controls.indicatorBlue,
          "--timeline-hover-duration": `${controls.hoverRevealDuration}s`,
          "--timeline-scale": controls.minimapScale,
        } as CSSProperties
      }
      onMouseMove={(event) => updateEdgeHover(event.clientX)}
      onPointerMove={(event) => updateEdgeHover(event.clientX)}
      onPointerLeave={() => {
        if (forcedHover === undefined) {
          setHovering(false);
        }
      }}
      ref={shellRef}
    >
      <div className="absolute left-5 top-5 z-30 rounded-md border border-neutral-200 bg-white/90 px-3 py-2 text-xs font-medium text-neutral-500 backdrop-blur">
        {displayPhase === "idle" ? activeSection.title : displayPhase}
      </div>
      <button
        aria-label={displayFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        className="absolute right-5 top-5 z-40 grid size-9 cursor-pointer place-items-center rounded-md border border-neutral-200 bg-white/90 text-neutral-700 shadow-sm backdrop-blur transition hover:border-neutral-400 hover:text-neutral-950"
        onClick={toggleFullscreen}
        type="button"
      >
        {displayFullscreen ? (
          <Minimize2 className="size-4" />
        ) : (
          <Maximize2 className="size-4" />
        )}
      </button>

      <ScrollTimelineRail
        activeSectionId={selectedSectionId ?? activeSection.id}
        forceVisible={displayHover || displayPhase !== "idle"}
        indicatorBlue={controls.indicatorBlue}
        labelActiveScale={controls.labelActiveScale}
        labelPressedScale={controls.labelPressedScale}
        onScrubEnd={endTimelineScrub}
        onScrubMove={moveTimelineScrub}
        onScrubStart={startTimelineScrub}
        onSelectProgress={scrollToTimelineProgress}
        onSelectSection={scrollToSection}
        phase={displayPhase}
        progress={displayProgress}
        sections={pattern.sections}
      />

      <div
        className="h-full overflow-y-auto"
        data-testid="archive-reader"
        onScroll={syncProgress}
        ref={readerRef}
      >
        <article
          className={cn(
            "mx-auto min-h-[2400px] w-full max-w-[720px] origin-center transform-gpu bg-white px-14 py-24 shadow-none transition-transform will-change-transform",
            displayPhase !== "idle" && "shadow-[0_0_0_1px_rgba(0,0,0,0.04)]",
            displayPhase === "zoomingIn" && "scale-100",
          )}
          style={{
            backfaceVisibility: "hidden",
            contain: "paint",
            transform:
              displayPhase === "zoomingOut" || displayPhase === "traveling"
                ? `translateZ(0) scale(${controls.minimapScale})`
                : undefined,
            transformOrigin: `50% ${viewportOriginY}px`,
            transitionDuration: sameRegionPulse
              ? `${getSameRegionPulseDuration()}ms`
              : `${controls.zoomDurationMs}ms`,
            transitionTimingFunction: sameRegionPulse
              ? SAME_REGION_PULSE_EASING
              : "cubic-bezier(0.2, 0, 0, 1)",
          }}
        >
          {pattern.sections.map((section, index) => (
            <section
              className="min-h-[520px] border-b border-neutral-100 py-12 last:border-b-0"
              id={section.id}
              key={section.id}
            >
              <p className="text-sm font-semibold text-[var(--timeline-blue)]">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-6 text-4xl font-semibold leading-tight">
                {section.title}
              </h2>
              <p className="mt-5 max-w-[34rem] text-lg leading-8 text-neutral-600">
                {section.summary}
              </p>
              <div className="mt-10 space-y-6 text-[15px] leading-8 text-neutral-800">
                <p>
                  This original study uses an editorial page as a physical
                  surface. The rail on the right is not just navigation; it is a
                  compressed map of the reader&apos;s position and intent.
                </p>
                <p>
                  When the user jumps through the rail, the page briefly
                  retreats so the travel has spatial context. The destination
                  then resolves back into normal reading scale.
                </p>
                <p>
                  Each section is deliberately tall enough to test scroll depth,
                  active labels, and the distinction between read and unread
                  portions of the timeline.
                </p>
              </div>
            </section>
          ))}
        </article>
      </div>
    </section>
  );
}
