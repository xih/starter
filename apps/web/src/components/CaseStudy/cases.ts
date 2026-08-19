export type CaseStudyImage = {
  /** Poster image path under /work/<slug>/ (also the still fallback). */
  src: string;
  alt: string;
  /** Optional mobile-specific still under /work/<slug>/. */
  mobileSrc?: string;
  /** Optional frame aspect ratio, defaults to the shared landscape mockup. */
  aspectRatio?: string;
  mobileAspectRatio?: string;
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
  body?: CaseStudyTextBlock[];
  bodyAfterImages?: CaseStudyTextBlock[];
  images: CaseStudyImage[];
};

export type CaseStudyIntroSection =
  | {
      kind: "text";
      heading?: string;
      body: string;
    }
  | {
      kind: "list";
      heading: string;
      lead: string;
      items: string[];
      body: string;
    };

export type ProductSurface = {
  label: string;
  /** Group heading for related surfaces in the sidebar. */
  kind?: "group";
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
  mobileDescription?: string;
  introTitle?: string;
  introLead?: string;
  introSections?: CaseStudyIntroSection[];
  /** Title above the main column, e.g. "Selected Screens". */
  overline: string;
  surfaces: ProductSurface[];
  sections: CaseStudySection[];
};

export type CaseStudyTextBlock =
  | {
      kind: "paragraph";
      text: string;
    }
  | {
      kind: "subheading";
      text: string;
    }
  | {
      kind: "ordered-list";
      items: string[];
    }
  | {
      kind: "unordered-list";
      items: string[];
    }
  | {
      kind: "link";
      href: string;
      label: string;
      suffix?: string;
    };

const nell: CaseStudy = {
  slug: "nell",
  company: "Nell",
  role: "Founding Product Designer",
  period: "Jan 2026 - July 2026",
  description:
    "I worked with the cofounder of Soundcloud to design interaction patterns for the future of prompt to podcast. Raised $XX from Danny Rimer at Index Ventures.",
  mobileDescription:
    "I worked with the cofounder of Soundcloud, and a team of engineers and a head of content to build out the core product, and interaction patterns for the future of generative AI podcasting. Raised $XX from Danny Rimer at Index Ventures.",
  introTitle:
    "Nell - Designing a Generative AI Podcasting App for Personalized Audio Learning",
  introLead:
    "Nell is a generative AI podcasting app that lets users create short, high-signal podcast episodes from any prompt, topic, article, or question.\n\nInspired by A Young Lady’s Illustrated Primer from Neal Stephenson’s The Diamond Age, Nell is an adaptive educational tool that helped Nell become more independent, capable, and self-directed. Our goal was to bring that same spirit into audio: a system that could turn curiosity into personalized, useful listening experiences.\n\nUsers could ask for anything from “a 10-minute history of the Roman Empire” to “explain the latest AI chip design news” and receive a concise 5-10 minute episode designed to be clear, direct, and information-dense.",
  introSections: [
    {
      kind: "text",
      heading:
        "Problem: AI Can Generate Content, But Podcast Creation Still Feels Too Hard",
      body: "People are already using tools like ChatGPT, Claude, and NotebookLM to summarize articles, explain papers, and generate learning material. But turning those outputs into a polished, listenable podcast still requires too much effort.\n\nThe opportunity was to design a mobile-first experience that made podcast generation feel simple, fast, and native to the medium, not like a chatbot with an audio export button.",
    },
    {
      kind: "list",
      heading: "My Role: Product Design, Prototyping, and Core UX Decisions",
      lead: "I designed the core information architecture and end-to-end product experience, including:",
      items: [
        "Home, episode, and show detail screens",
        "The show creation and generation flow",
        "Host picker, search, profile, and onboarding flows",
        "High-fidelity Xcode prototypes for testing mobile interactions",
        "Loading states for long-running AI generation, including skeletons, spinners, and shimmering text",
      ],
      body: "I also helped shape key product decisions, including making shows public by default to increase discovery and engagement, defining onboarding and retention metrics in PostHog, and deciding how identity should work across usernames, full names, and creator profiles.",
    },
    {
      kind: "text",
      heading:
        "Outcome: Private Beta, Fundraising, and Early Product Validation",
      body: "The beta mobile app raised $XX from top-tier investors and angels, including Danny Rimer from Index Ventures, Guillermo Rauch from Vercel, Anton Osika from Lovable, Mati Staniszewski from ElevenLabs, and Soleio.\n\n\nAs of August 2026, Nell has launched in private beta.",
    },
  ],
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
      label: "Show and Episode Details",
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
      id: "design-system",
      label: "Selections from the Design System",
      images: [{ src: "design-system.png", alt: "Nell design system" }],
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
  ],
};

const agiKrea: CaseStudy = {
  slug: "agi-krea",
  company: "AGI and Krea",
  role: "Product Design Consultant",
  period: "2023, 2025",
  description:
    "I worked with the founders of AGI and Krea to build out interaction patterns of text to image models and phone agents.",
  overline: "Selected Work",
  surfaces: [
    { label: "AGI", kind: "group" },
    { label: "AGI (2025) - AI Agent Phones", target: "agi-agent-phones" },
    { label: "Agent state management", target: "agent-states" },
    { label: "Gradient glows", target: "gradient-glows" },
    { label: "Internal Tracing Dashboard", target: "internal-tracing" },
    { label: "Krea", kind: "group" },
    { label: "Inpainting and Outpainting", target: "krea" },
    { label: "The Information", target: "the-information" },
  ],
  sections: [
    {
      id: "agi-agent-phones",
      label: "AGI (2025) - AI Agent Phones",
      images: [
        {
          src: "agi-agent-phones.png",
          mobileSrc: "agi-agent-phones-mobile.png",
          mobileAspectRatio: "362 / 562",
          alt: "AGI Android permission onboarding phone prototypes",
        },
      ],
      bodyAfterImages: [
        {
          kind: "paragraph",
          text: "Android mobile agents are designed to allow an Android agent be able to control and operate a phone. It works by training a computer use model with images of user interface components like dropdowns, radio buttons, cell columns and rows, with text prompts and learns how to operate a computer. The benchmark of computer use agents are at OSWorld. Android agents are a branch off of computer use agents, like Browser Use, Amazon Nova Act, Claude's Computer Use agent, and more. Instead of operating a browser, AGI and these other companies operate the Android OS.",
        },
        {
          kind: "paragraph",
          text: "In December 2025, ZTE announced the first Android phone to fanfare and sellout according to the press.",
        },
        {
          kind: "paragraph",
          text: "Since AGI wasn't shipping native hardware, we had to build out lots of custom onboarding and permissions for the user to manually activate, before the user had even a chance to then enable the agent. Studying the patterns of Nikita Bier's Explode app, which also had a manual and involved activation process, I designed prototypes to make it as easy as possible for the user to go through the onboarding flow to activate.",
        },
        {
          kind: "paragraph",
          text: "In addition to the onboarding, I worked on prototyping the agent navigation interpretability state. The AGI Android agent takes over your phone controls when navigating the device, so I designed a state machine to allow users to steer the agent when it is stuck in a local minima or hallucinating.",
        },
        {
          kind: "paragraph",
          text: "Ultimately, I believe we are still years away from AI Agent phones truly entering the mainstream. As a consumer, I expect 99.9999% uptime on Instagram, Gmail, Facetime, Zelle, Robinhood, or any consumer app with traction. Android agents are the same. When testing AGI internally, I saw accuracy rates of less than 99.999%.",
        },
        {
          kind: "paragraph",
          text: "With the expectations of consumers in the world today of <200 ms for loading, infinite scrolling, streaming text generation from LLMs, and 99.999% uptime for services like Github, Gmail, Instagram, I believe Android phone agents are still on a long horizon out, even if it meets the standards of commercial consumer software: 99.999% reliability and <200 ms response time.",
        },
        {
          kind: "paragraph",
          text: "The user knows what it wants better than the android agent operating on behalf of a prompt that was ill formed. According to Claude Shannon's model of information transmission, the transmitter submits a message, however before the receiver can receive the signal, there is a noise source that interferes with the signal. In the analogy of AI Android agents, the user is the transmitter and the Android Agent is the receiver. The prompt box is the noise source that captures the signal but also adds noise.",
        },
        {
          kind: "paragraph",
          text: "Because LLMs hallucinate and are not pure functional machine learning algorithms like supervised or unsupervised learning algorithms, the noise overwhelms the signal. Compare that to the case when the transmitter is the user and the Android phone is the receiver. The noise source now is only the hand and fingers interacting with the phone. The noise input are the errors that arise when mistapping, or gaps in mental models of the user interface and information architecture. The surface area of these tactile noises are exponentially smaller compared to the noise input of Android Agents.",
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
    {
      id: "internal-tracing",
      label: "Internal tracing dashboard (2025)",
      images: [
        {
          src: "internal-tracing-dashboard.png",
          alt: "AGI internal tracing dashboard",
        },
      ],
    },
    {
      id: "krea",
      label: "Krea (2023)",
      body: [
        {
          kind: "paragraph",
          text: 'In 2023, Midjourney had just launched on Discord and become the biggest server on Discord, with hundreds of millions of users eager to try the latest text-to-image model. Its status quo was using slash commands to generate images, with the image generation command being "/imagine".',
        },
        {
          kind: "paragraph",
          text: "Due to the success of Midjourney, a whole host of other text-to-image companies sprung up. There was Leonardo.ai, getimg.ai, Playground AI, and even Adobe Firefly. Krea's take at that time was to use the canvas as a differentiator to Midjourney and allow users to not just generate images, but then visually organize them on a web canvas with further editing and refinement.",
        },
        {
          kind: "paragraph",
          text: 'Also in February 2023, the paper, "Adding Conditional Control to Text-to-Image Diffusion Models" aka Controlnet came out. This craze led the stable diffusion community and text-to-image companies to race toward building out workflows supporting this new model.',
        },
        {
          kind: "paragraph",
          text: "Inpainting and outpainting are simple concepts that let people draw on a specific part of an image and then use text prompts to generatively augment the picture. They already existed before the launch of Controlnet, but Controlnet allowed users to guide generation with edges, depth maps, pose skeletons and more.",
        },
        {
          kind: "paragraph",
          text: "I designed different information architectures for interacting with images on the canvas + prompting. Along with entrypoints for prompt + image + mask and visualizing loading and error states.",
        },
        { kind: "subheading", text: "The space in 2026:" },
        {
          kind: "paragraph",
          text: "The space has bifurcated into 2 workstreams and companies marketing themselves to each:",
        },
        {
          kind: "ordered-list",
          items: [
            "The generic consumer workstream that is dominated by Midjourney, Higgsfield AI, Capcut and the large labs - Google Gemini, ChatGPT, Claude.",
            "The prosumer workstream that is dominated by a ComfyUI node-based interface. This space has players like Weavy (acquired by Figma), Flora, ComfyUI, Krea's node editor.",
          ],
        },
        {
          kind: "paragraph",
          text: "In 2023, the market had the unbounded belief that everyone was going to be an AI artist and the newness of trying text-to-image generation felt incredibly novel at the time. Now with the fairy dust worn off, it is incredibly clear that not everyone will be text-to-imaging on a daily cadence or even weekly cadence, and the TAM of the text-to-image space is set. Midjourney itself knows this, milked the cash cow while it was on top of the craze and has since moved onto medical spas in San Francisco.",
        },
        {
          kind: "link",
          href: "https://startupfounderstories.com/stories/victor-perez-krea-ai",
          label: "Krea had $8M ARR as of April 2025",
          suffix:
            ", and with a valuation of $500M that leads to a 62.5 revenue multiple. Comparing this to the other software acquisitions of 2026 in this space:",
        },
        {
          kind: "ordered-list",
          items: [
            "Weavy getting acquired by Figma for rumored ~$200 million with only a valuation of $13 million.",
          ],
        },
        {
          kind: "paragraph",
          text: "Krea raised $47 million on a post-money valuation of $500 million, ComfyUI raised $30 million also on a post-money valuation of $500 million, Flora raised $42 million on a probably similar $500 million valuation.",
        },
        {
          kind: "paragraph",
          text: 'My hypothesis is that similar to how Clay pioneered the GTM engineer, Palantir pioneered the forward-deployed engineer, and if Krea, Flora, and ComfyUI can pioneer a new role like "forward deployed creative" and build up the recruiting motion to place these into companies, it can build a new lever for enterprises to spend money to hire these marketing / creative magicians.',
        },
        { kind: "paragraph", text: "Exciting times to be in AI creativity." },
      ],
      images: [
        {
          src: "krea-inpainting-outpainting.png",
          alt: "Krea canvas with the inpaint and outpaint selection toolbar",
        },
      ],
    },
    {
      id: "the-information",
      label: "Boom times in San Francisco - The Information (Press)",
      body: [
        {
          kind: "link",
          href: "https://www.theinformation.com/articles/seeking-cerebral-valley-a-photographic-tour-of-san-franciscos-ai-underground?rc=odix4s",
          label: "Boom times in San Francisco",
          suffix: " - The Information (Press)",
        },
      ],
      images: [
        {
          src: "the-information.png",
          alt: "The Information press photo for San Francisco AI underground",
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
  introTitle:
    "Skydio Cloud: Designing the Enterprise Platform for Drone Fleet Operations",
  introLead:
    "Skydio is an enterprise drone company building the hardware and software layer for large-scale drone operations.\n\nI was the first design hire on Skydio Cloud, the enterprise platform that helps organizations manage drone fleets, live operations, missions, media, licensing, and cloud-based 3D data.",
  introSections: [
    {
      kind: "list",
      heading:
        "Customers: Public Safety, Infrastructure, Mining, Telecom, and Rail",
      lead: "Skydio Cloud served enterprise and government customers across complex operational environments, including:",
      items: [
        "Public safety teams such as the Las Vegas Police Department and Chula Vista Police Department",
        "Mining companies such as Rio Tinto",
        "Telecom customers such as TELUS and Dish",
        "Transportation and infrastructure teams such as Salt Lake City Department of Transportation and Caltrans",
        "Rail companies such as BNSF and Union Pacific",
      ],
      body: "These customers needed software that could support high-stakes field operations, long-running inspection programs, and organization-wide fleet management.",
    },
    {
      kind: "text",
      heading: "Problem: Drone Operations Were Scaling Beyond the Pilot",
      body: "As enterprise drone programs grew, teams needed more than a pilot and a controller. They needed a cloud platform to coordinate fleets, manage vehicles, stream live video, schedule missions, review 3D data, and give stakeholders access to the right information at the right time.\n\nThe design challenge was to turn highly technical drone workflows into clear, operational software for teams working in high-stakes environments.",
    },
    {
      kind: "text",
      heading: "Building Mental Models Across Real Drone Workflows",
      body: "I embedded myself in customer workflows to understand how different organizations used drones in the field.\n\nFor public safety, this included Drone as First Responder programs and Live 911 response workflows, where officers needed real-time aerial context before arriving on scene.\n\nFor mining teams, drones were used to generate daily orthomosaics of large sites, helping teams monitor operations and track changes over time.\n\nFor rail customers like BNSF, drones were used to identify container serial numbers in rail yards and build more accurate geolocation maps of assets, saving time and reducing manual inspection work.\n\nFor transportation teams like Salt Lake City Department of Transportation, drones captured mountain highway terrain and generated 3D photogrammetry models to identify avalanche pressure points and plan safer clearing operations.",
    },
    {
      kind: "list",
      heading: "Designing for Real-Time Drone Systems",
      lead: "I worked closely with engineering teams on interaction-heavy and technically complex features, including 3D model viewing in the cloud using CesiumJS, deck.gl, and Three.js.\n\nI also partnered with engineers to define real-time control and system-status interactions, including:",
      items: [
        "Obstacle avoidance state toggles",
        "Run mode switching",
        "System status information architecture",
        "Thermal and visual camera mode transitions",
        "Operational states for active drone missions",
      ],
      body: "These details helped operators understand drone state quickly while moving between live video, map, fleet, and mission workflows.",
    },
    {
      kind: "text",
      heading:
        "Hundreds of orgs onboarded onto Skydio Cloud and we generated $XX ARR",
      body: "After launch, hundreds of organizations onboarded to Skydio Cloud, and the platform generated $XX in ARR.\n\nSkydio Cloud was sold through multiple enterprise SKUs, including Skydio Cloud Basic and Skydio Cloud Live Streaming. I designed upsell and pricing experiences that helped convert more organizations into paid enterprise customers.",
    },
  ],
  overline: "Selected Work",
  surfaces: [
    { label: "Thermal streaming", target: "thermal-livestream" },
    { label: "Cloud model viewer", target: "cloud-model-viewer" },
    { label: "Flight review", target: "flight-review" },
    { label: "Mission management", target: "mission-management" },
    { label: "Fleet management", target: "fleet-management" },
    { label: "Drone flight logs", target: "drone-flight-logs" },
    { label: "Mobile livestreaming", target: "mobile-livestream" },
    { label: "Media management", target: "media-management" },
  ],
  sections: [
    {
      id: "thermal-livestream",
      label: "Thermal Livestream",
      images: [{ src: "thermal.png", alt: "Skydio thermal livestream view" }],
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
      images: [{ src: "fleet.png", alt: "Skydio fleet management map view" }],
    },
    {
      id: "drone-flight-logs",
      label: "Drone Flight Logs",
      images: [{ src: "drone-logs.png", alt: "Skydio drone flight logs" }],
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
      images: [{ src: "media.png", alt: "Skydio media management" }],
    },
  ],
};

const caseStudies: Record<string, CaseStudy> = {
  nell,
  agi: agiKrea,
  "agi-krea": agiKrea,
  krea: agiKrea,
  skydio,
};

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return caseStudies[slug];
}

export function getCaseStudySlugs(): string[] {
  return Object.keys(caseStudies);
}
