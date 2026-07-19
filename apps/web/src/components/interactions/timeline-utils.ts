import type { InteractionSection, TimelinePhase } from "./types";

export type TimelineTransitionOptions = {
  reducedMotion: boolean;
};

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function getScrollProgress({
  clientHeight,
  scrollHeight,
  scrollTop,
}: {
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
}) {
  const maxScroll = scrollHeight - clientHeight;

  if (maxScroll <= 0) {
    return 1;
  }

  return clamp(scrollTop / maxScroll);
}

export function getSectionTargetProgress(
  sections: InteractionSection[],
  sectionId: string,
) {
  const section = sections.find((candidate) => candidate.id === sectionId);

  return section ? clamp(section.progress) : 0;
}

export function getSectionTargetScrollTop({
  clientHeight,
  progress,
  scrollHeight,
}: {
  clientHeight: number;
  progress: number;
  scrollHeight: number;
}) {
  return Math.round(Math.max(0, scrollHeight - clientHeight) * clamp(progress));
}

export function getCenteredProgressScrollTop({
  clientHeight,
  progress,
  scrollHeight,
}: {
  clientHeight: number;
  progress: number;
  scrollHeight: number;
}) {
  const maxScroll = Math.max(0, scrollHeight - clientHeight);
  const centeredScrollTop = scrollHeight * clamp(progress) - clientHeight / 2;

  return Math.round(Math.min(maxScroll, Math.max(0, centeredScrollTop)));
}

export function getTimelinePhases({
  reducedMotion,
}: TimelineTransitionOptions): TimelinePhase[] {
  if (reducedMotion) {
    return ["idle"];
  }

  return ["zoomingOut", "traveling", "zoomingIn", "idle"];
}

export function filterInteractionPatterns<
  T extends {
    category: string;
    tags: string[];
    title: string;
    summary: string;
  },
>(patterns: T[], query: string, category = "All") {
  const normalizedQuery = query.trim().toLowerCase();

  return patterns.filter((pattern) => {
    const matchesCategory = category === "All" || pattern.category === category;
    const searchable = [
      pattern.title,
      pattern.summary,
      pattern.category,
      ...pattern.tags,
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery =
      normalizedQuery.length === 0 || searchable.includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });
}
