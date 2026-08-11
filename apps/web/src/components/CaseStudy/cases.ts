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

const caseStudies: Record<string, CaseStudy> = {
  nell,
};

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return caseStudies[slug];
}

export function getCaseStudySlugs(): string[] {
  return Object.keys(caseStudies);
}
