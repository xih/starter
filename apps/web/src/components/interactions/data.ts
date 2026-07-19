import type { InteractionPattern } from "./types";

export const archiveTimelinePattern = {
  slug: "steve-jobs-archive-scroll-timeline",
  title: "Archive Scroll Timeline",
  sourceName: "Steve Jobs Archive Book",
  sourceUrl: "https://book.stevejobsarchive.com/",
  category: "Reading navigation",
  tags: ["scroll", "timeline", "hover rail", "page zoom", "dialkit"],
  status: "prototype",
  summary:
    "A right-edge reading-depth rail compresses a long editorial page into labeled sections, then uses a zoomed-out travel state to make jumps feel spatial instead of abrupt.",
  interactionNotes: [
    "The table of contents lives in a fixed right rail and reveals on pointer hover near the page edge.",
    "A filled blue rail tracks the furthest/current reading depth while the unread portion remains pale gray.",
    "Selecting a label moves through a zoom-out, travel, and zoom-in sequence so the page feels like a physical surface.",
    "Reduced-motion users bypass the choreography and land directly at the selected section.",
  ],
  implementationNotes: [
    "Represent the timeline as normalized section progress values, then map those values to scrollTop inside the reader surface.",
    "Keep the animation as an explicit phase state machine so timings can be tuned without hiding behavior inside one opaque transition.",
    "Use DialKit controls for scale, spring references, colors, and timing so the physics can be adjusted in the browser.",
  ],
  sections: [
    {
      id: "intro",
      label: "Intro",
      title: "Intro",
      summary:
        "Orientation, context, and the initial promise of the reading surface.",
      progress: 0,
    },
    {
      id: "preface",
      label: "Preface",
      title: "Preface",
      summary:
        "A slower text-heavy section that establishes the editorial cadence.",
      progress: 0.14,
    },
    {
      id: "era-one",
      label: "1976-1985",
      title: "1976-1985",
      summary:
        "A long central passage with enough depth for the progress rail to visibly move.",
      progress: 0.34,
    },
    {
      id: "era-two",
      label: "1985-1996",
      title: "1985-1996",
      summary:
        "The second dense stretch, used to test longer travel distances.",
      progress: 0.58,
    },
    {
      id: "era-three",
      label: "1996-2011",
      title: "1996-2011",
      summary:
        "A late-document destination where the zoom-out state should be obvious.",
      progress: 0.77,
    },
    {
      id: "events",
      label: "Events",
      title: "Events",
      summary:
        "Chronology-like entries that make the page feel like an indexed archive.",
      progress: 0.9,
    },
    {
      id: "credits",
      label: "Credits",
      title: "Credits",
      summary: "A compact ending section for checking the final rail segment.",
      progress: 1,
    },
  ],
  timingDefaults: {
    hoverRevealDuration: 0.45,
    minimapScale: 0.42,
    railSpringStiffness: 85,
    railSpringDamping: 25,
    zoomSpringStiffness: 85,
    zoomSpringDamping: 15,
    zoomDurationMs: 560,
    travelSpringStiffness: 100,
    travelSpringDamping: 20,
    travelStartDelayMs: 240,
    travelDurationMs: 760,
    travelEasePower: 2.2,
    pressSpringStiffness: 150,
    pressSpringDamping: 20,
    sameRegionPulseDurationMs: 240,
    labelActiveScale: 0.95,
    labelPressedScale: 0.925,
    indicatorBlue: "#009ee8",
    sideGray: "#eeeeee",
  },
} satisfies InteractionPattern;

export const interactionPatterns = [archiveTimelinePattern];

export function getInteractionPattern(slug: string) {
  return interactionPatterns.find((pattern) => pattern.slug === slug);
}
