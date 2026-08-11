export type CaseStudyImage = {
  /** Poster image path under /work/<slug>/ (also the still fallback). */
  src: string;
  alt: string;
  /**
   * Optional video filename under /work/<slug>/. When set, the section renders
   * an autoplaying, looping, muted <video> using `src` as the poster frame.
   * Figma video *fills* cannot be exported through the MCP (they are fills, not
   * timeline nodes), so drop the source .mp4/.webm here to enable motion.
   */
  video?: string;
  /**
   * Optional YouTube URL. When set, the section renders an embedded YouTube
   * player in the same landscape frame. Ignored when `video` is set.
   */
  youtube?: string;
};

export type CaseStudySection = {
  /** Anchor id, also used by the sidebar scroll-spy. */
  id: string;
  label: string;
  images: CaseStudyImage[];
};

export type ProductSurface = {
  label: string;
  /** Section id this surface links to, when a matching section exists. */
  target?: string;
};

export type CaseStudy = {
  slug: string;
  /** Company / project name shown at the top of the sidebar. */
  company: string;
  role: string;
  period: string;
  description: string;
  /** Title above the main column, e.g. "Selected Screens". */
  overline: string;
  surfaces: ProductSurface[];
  sections: CaseStudySection[];
};

const nell: CaseStudy = {
  slug: "nell",
  company: "Nell",
  role: "Founding Product Designer",
  period: "Jan 2026 - July 2026",
  description:
    "I worked with the cofounder of Soundcloud to design interaction patterns for the future of prompt to podcast. Raised $XX from Danny Rimer at Index Ventures.",
  overline: "Selected Screens",
  surfaces: [
    { label: "Show creation", target: "show-creation" },
    { label: "Home screen", target: "home" },
    { label: "Show and Episode Details", target: "episode-show-details" },
    { label: "Search" },
    { label: "Library", target: "library" },
    { label: "Public and Private Shows" },
    { label: "Host Selection" },
    { label: "Design System", target: "design-system" },
    { label: "Product Analytics", target: "product-analytics" },
  ],
  sections: [
    {
      id: "show-creation",
      label: "Show Creation",
      images: [
        {
          src: "show-creation-poster.jpg",
          video: "show-creation.mp4",
          alt: "Nell show creation flow",
        },
      ],
    },
    {
      id: "home",
      label: "Home screen",
      images: [
        { src: "home-poster.jpg", video: "home.mp4", alt: "Nell home screen" },
      ],
    },
    {
      id: "episode-show-details",
      label: "Episode and Show Details",
      images: [
        {
          src: "episode-show-details-poster.jpg",
          video: "episode-show-details.mp4",
          alt: "Nell episode and show details",
        },
      ],
    },
    {
      id: "library",
      label: "Library",
      images: [
        {
          src: "library-poster.jpg",
          video: "library.mp4",
          alt: "Nell library",
        },
        { src: "library-2.png", alt: "Nell library detail" },
        { src: "library-3.png", alt: "Nell library detail" },
      ],
    },
    {
      id: "product-analytics",
      label: "Product Analytics",
      images: [
        { src: "product-analytics-1.png", alt: "Nell product analytics" },
        { src: "product-analytics-2.png", alt: "Nell product analytics" },
      ],
    },
    {
      id: "appendix",
      label: "Appendix",
      images: [
        { src: "appendix-recent-list.png", alt: "Recent list items" },
        { src: "appendix-recent-episodes.png", alt: "Recent episodes" },
        {
          src: "appendix-elapsed-time.png",
          alt: "Rules on pretty printing elapsed time",
        },
        { src: "appendix-image.png", alt: "Nell appendix" },
      ],
    },
    {
      id: "design-system",
      label: "Selections from the Design System",
      images: [{ src: "design-system.png", alt: "Nell design system" }],
    },
  ],
};

const agi: CaseStudy = {
  slug: "agi",
  company: "AGI",
  role: "Product Design Consultant",
  period: "December 2025",
  description:
    "I worked with the founders of AGI to build out the interaction patterns of their mobile android app.",
  overline: "Selected Work",
  surfaces: [
    { label: "Onboarding", target: "onboarding" },
    { label: "Agent state management", target: "agent-states" },
  ],
  sections: [
    {
      id: "onboarding",
      label: "Onboarding",
      images: [
        {
          src: "onboarding.png",
          alt: "AGI android onboarding screens",
        },
      ],
    },
    {
      id: "agent-states",
      label: "Agent States",
      images: [
        {
          src: "agent-states.png",
          alt: "AGI agent status pills for running, paused, retry, and complete states",
        },
      ],
    },
    {
      id: "gradient-glows",
      label: "Gradient glows for agent progress",
      images: [
        {
          src: "gradient-glows.png",
          alt: "AGI phone frames with gradient glow borders signalling agent progress",
        },
      ],
    },
  ],
};

const krea: CaseStudy = {
  slug: "krea",
  company: "Krea",
  role: "Product Design Consultant",
  period: "2023",
  description:
    "I worked with the founders of Krea to build out interaction patterns for inpainting and outpainting when ControlNet launched.",
  overline: "Selected Work",
  surfaces: [
    { label: "The Canvas", target: "the-canvas" },
    { label: "Inpainting and outpainting", target: "inpaint-outpaint" },
    { label: "Controlnet", target: "controlnet-parameters" },
  ],
  sections: [
    {
      id: "the-canvas",
      label: "The Canvas",
      images: [
        {
          src: "the-canvas.png",
          alt: "Krea infinite canvas with a grid of generated images",
        },
      ],
    },
    {
      id: "inpaint-outpaint",
      label: "How to inpaint and outpaint",
      images: [
        {
          src: "inpaint-outpaint.png",
          alt: "Krea canvas with the inpaint and outpaint selection toolbar",
        },
      ],
    },
    {
      id: "controlnet-parameters",
      label: "ControlNet parameters",
      images: [
        {
          src: "controlnet-parameters.png",
          alt: "ControlNet conditioning maps: HED, Canny edge, Hough line, scribble, and human pose",
        },
      ],
    },
  ],
};

const skydio: CaseStudy = {
  slug: "skydio",
  company: "Skydio",
  role: "First Product Designer",
  period: "2020-2022",
  description:
    "I worked across drone autonomy, cloud infra, engineering and product teams to deliver a cloud dashboard to manage enterprise drone fleets.",
  overline: "Selected Work",
  surfaces: [
    { label: "Livestreaming", target: "mobile-livestream" },
    { label: "Thermal Streaming", target: "thermal-livestream" },
    { label: "Fleet management", target: "fleet-management" },
    { label: "Drone logs", target: "drone-flight-logs" },
    { label: "License renewals" },
    { label: "Media management", target: "media-management" },
    { label: "Remote Ops", target: "mission-management" },
  ],
  sections: [
    {
      id: "thermal-livestream",
      label: "Thermal Livestream",
      images: [
        { src: "thermal.png", alt: "Skydio thermal livestream view" },
      ],
    },
    {
      id: "cloud-model-viewer",
      label: "Cloud Model Viewer",
      images: [
        {
          src: "cloud-model-viewer.png",
          alt: "Cloud model viewer walkthrough",
          youtube: "https://www.youtube.com/watch?v=mO39GVeue2A",
        },
      ],
    },
    {
      id: "flight-review",
      label: "Flight Review",
      images: [
        {
          src: "flight-review.png",
          alt: "Flight review walkthrough",
          youtube: "https://www.youtube.com/watch?v=e0ghXOBScmg&t=16s",
        },
      ],
    },
    {
      id: "mission-management",
      label: "Mission Management",
      images: [
        { src: "mission.png", alt: "Skydio mission management dashboard" },
      ],
    },
    {
      id: "fleet-management",
      label: "Fleet Management",
      images: [
        { src: "fleet.png", alt: "Skydio fleet management map view" },
      ],
    },
    {
      id: "drone-flight-logs",
      label: "Drone Flight Logs",
      images: [
        { src: "drone-logs.png", alt: "Skydio drone flight logs" },
      ],
    },
    {
      id: "mobile-livestream",
      label: "Mobile Livestreaming",
      images: [
        {
          src: "mobile-livestream.png",
          alt: "Skydio mobile livestreaming",
        },
      ],
    },
    {
      id: "media-management",
      label: "Media Management",
      images: [
        { src: "media.png", alt: "Skydio media management" },
      ],
    },
  ],
};

const caseStudies: Record<string, CaseStudy> = {
  nell,
  agi,
  krea,
  skydio,
};

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return caseStudies[slug];
}

export function getCaseStudySlugs(): string[] {
  return Object.keys(caseStudies);
}
