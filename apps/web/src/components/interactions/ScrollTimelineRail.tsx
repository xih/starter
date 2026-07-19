"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";

import { cn } from "~/lib/utils";
import type { InteractionSection, TimelinePhase } from "./types";

type ScrollTimelineRailProps = {
  activeSectionId?: string;
  forceVisible?: boolean;
  indicatorBlue: string;
  labelActiveScale: number;
  labelPressedScale: number;
  onScrubEnd?: (progress: number) => void;
  onScrubMove?: (progress: number) => void;
  onScrubStart?: (progress: number) => void;
  onSelectProgress?: (progress: number) => void;
  onSelectSection?: (sectionId: string) => void;
  phase?: TimelinePhase;
  progress: number;
  sections: InteractionSection[];
};

export function ScrollTimelineRail({
  activeSectionId,
  forceVisible,
  indicatorBlue,
  labelActiveScale,
  labelPressedScale,
  onScrubEnd,
  onScrubMove,
  onScrubStart,
  onSelectProgress,
  onSelectSection,
  phase = "idle",
  progress,
  sections,
}: ScrollTimelineRailProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const scrubProgressRef = useRef(progress);
  const suppressNextClickRef = useRef(false);
  const scrubbingRef = useRef(false);
  const normalizedProgress = Math.min(1, Math.max(0, progress));

  useEffect(() => {
    scrubProgressRef.current = normalizedProgress;
  }, [normalizedProgress]);

  const getProgressFromClientY = useCallback(
    (clientY: number) => {
      const track = trackRef.current;

      if (!track) {
        return normalizedProgress;
      }

      const bounds = track.getBoundingClientRect();
      const rawProgress = (clientY - bounds.top) / bounds.height;

      return Math.min(1, Math.max(0, rawProgress));
    },
    [normalizedProgress],
  );

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!scrubbingRef.current) {
        return;
      }

      const nextProgress = getProgressFromClientY(event.clientY);
      hasDraggedRef.current =
        hasDraggedRef.current ||
        Math.abs(event.clientY - dragStartYRef.current) > 4;
      scrubProgressRef.current = nextProgress;

      if (hasDraggedRef.current) {
        onScrubMove?.(nextProgress);
      }
    }

    function handlePointerUp() {
      if (!scrubbingRef.current) {
        return;
      }

      scrubbingRef.current = false;

      if (hasDraggedRef.current) {
        onScrubEnd?.(scrubProgressRef.current);
        return;
      }

      suppressNextClickRef.current = true;
      onSelectProgress?.(scrubProgressRef.current);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [getProgressFromClientY, onScrubEnd, onScrubMove, onSelectProgress]);

  function getClosestSection(progressValue: number) {
    const firstSection = sections[0];

    if (!firstSection) {
      return undefined;
    }

    return sections.reduce((closest, section) => {
      return Math.abs(section.progress - progressValue) <
        Math.abs(closest.progress - progressValue)
        ? section
        : closest;
    }, firstSection);
  }

  function startScrub(event: ReactPointerEvent<HTMLDivElement>) {
    if (!forceVisible || !trackRef.current) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartYRef.current = event.clientY;
    hasDraggedRef.current = false;
    scrubbingRef.current = true;

    const nextProgress = getProgressFromClientY(event.clientY);
    scrubProgressRef.current = nextProgress;
    onScrubStart?.(nextProgress);
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 right-0 z-30 flex w-60 items-center justify-end pr-8 opacity-0 transition-[opacity,transform] duration-300",
        forceVisible && "pointer-events-auto cursor-pointer opacity-100",
      )}
      data-testid="scroll-timeline-rail"
      onPointerDown={startScrub}
    >
      <div className="relative h-[78%] min-h-[360px] w-48" ref={trackRef}>
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 h-full w-[15px] overflow-hidden bg-[#dddddd]"
          style={{ contain: "paint" }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-full origin-top will-change-transform"
            style={{
              backgroundColor: indicatorBlue,
              transform: `scaleY(${normalizedProgress})`,
            }}
          />
        </div>
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 h-full w-[15px] overflow-hidden"
          style={{ contain: "paint" }}
        />
        {sections.map((section, index) => {
          const nextProgress =
            sections[index + 1]?.progress ??
            Math.min(1, section.progress + 0.1);
          const segmentTop = `${section.progress * 100}%`;
          const segmentHeight = `${Math.max(4, (nextProgress - section.progress) * 100)}%`;
          const isRead = section.progress <= normalizedProgress + 0.01;
          const isActive = section.id === activeSectionId;
          const scale =
            phase === "traveling" && isActive
              ? labelPressedScale
              : isActive
                ? labelActiveScale
                : 1;

          return (
            <div
              className="absolute right-0 w-full"
              key={section.id}
              style={{ top: segmentTop, height: segmentHeight }}
            >
              <button
                aria-label={`Jump to ${section.title}`}
                className="group absolute inset-0 flex w-full cursor-pointer items-start justify-end gap-5 text-right"
                onClick={() => {
                  if (suppressNextClickRef.current) {
                    suppressNextClickRef.current = false;
                    return;
                  }

                  onSelectSection?.(
                    getClosestSection(scrubProgressRef.current)?.id ??
                      section.id,
                  );
                }}
                type="button"
              >
                <span
                  className={cn(
                    "mt-[-0.5em] origin-right text-2xl font-semibold leading-none transition duration-300 group-hover:translate-x-[-4px]",
                    isRead ? "text-[#009ee8]" : "text-neutral-300",
                  )}
                  style={{
                    color: isRead ? indicatorBlue : undefined,
                    transform: `scale(${scale})`,
                  }}
                >
                  {section.label}
                </span>
                <span
                  aria-hidden="true"
                  className="h-full min-h-8 w-[15px] border-y-2 border-white bg-transparent"
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
