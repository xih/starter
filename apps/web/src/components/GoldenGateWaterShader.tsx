"use client";

import { Water } from "@paper-design/shaders-react";
import { type DialConfig, useDialKit } from "dialkit";
import { DialKitRoot } from "~/components/DialKitRoot";

const BAY_AREA_SCENES = [
  {
    id: "golden-gate-headlands",
    label: "Golden Gate",
    image: "/images/bay-area/golden-gate-headlands.jpg",
  },
  {
    id: "mt-tam-sunrise",
    label: "Mt. Tam Sunrise",
    image: "/images/bay-area/mt-tam-sunrise.jpg",
  },
  {
    id: "muir-woods",
    label: "Muir Woods",
    image: "/images/bay-area/muir-woods.jpg",
  },
  {
    id: "rodeo-beach",
    label: "Rodeo Beach",
    image: "/images/bay-area/rodeo-beach.jpg",
  },
  {
    id: "point-bonita-cliffs",
    label: "Point Bonita",
    image: "/images/bay-area/point-bonita-cliffs.jpg",
  },
] as const;

const DEFAULT_SCENE = BAY_AREA_SCENES[0];

const WATER_CONTROLS = {
  scene: {
    type: "select",
    default: DEFAULT_SCENE.id,
    options: BAY_AREA_SCENES.map(({ id, label }) => ({
      value: id,
      label,
    })),
  },
  layering: [0.24, 0, 1, 0.01],
  edges: [0.08, 0, 1, 0.01],
  highlights: [0.08, 0, 1, 0.01],
  water: [0.1, 0, 1, 0.01],
  size: [1.8, 0.01, 7, 0.01],
  speed: [0.72, 0, 2, 0.01],
} satisfies DialConfig;

export function GoldenGateWaterShader() {
  const shader = useDialKit("Golden Gate Water", WATER_CONTROLS, {
    persist: {
      key: "golden-gate-water-shader",
      storage: "localStorage",
      presets: true,
    },
    shortcuts: {
      layering: { key: "l", mode: "fine" },
      edges: { key: "e", mode: "fine" },
      highlights: { key: "h", mode: "fine" },
      water: { key: "w", mode: "fine" },
      size: { key: "s", mode: "fine" },
      speed: { key: "d", mode: "fine" },
    },
  });
  const scene =
    BAY_AREA_SCENES.find(({ id }) => id === shader.scene) ?? DEFAULT_SCENE;

  return (
    <main
      className="dark relative min-h-svh overflow-hidden bg-background bg-cover bg-center font-body text-text-primary"
      style={{ backgroundImage: `url(${scene.image})` }}
    >
      <DialKitRoot />
      <Water
        image={scene.image}
        colorBack="#6f8588"
        colorHighlight="#f7efe1"
        highlights={shader.highlights}
        layering={shader.layering}
        edges={shader.edges}
        waves={shader.water}
        caustic={0.08}
        size={shader.size}
        speed={shader.speed}
        scale={1.22}
        fit="cover"
        width="100%"
        height="100%"
        className="absolute inset-0 h-full w-full"
      />

      <div className="from-background/80 via-background/25 to-background/10 pointer-events-none absolute inset-0 bg-gradient-to-r" />
      <div className="from-background/95 via-background/60 pointer-events-none absolute inset-y-0 right-0 w-[42rem] bg-gradient-to-l to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-background to-transparent" />

      <section className="relative z-10 flex min-h-svh max-w-3xl flex-col justify-end px-6 pb-10 pt-24 sm:px-10 sm:pb-14 lg:px-14">
        <p className="mb-3 font-body text-caption font-semibold uppercase tracking-[0.28em] text-text-secondary">
          Interactive portfolio
        </p>
        <h1 className="max-w-2xl font-title text-5xl font-normal leading-none text-text-primary sm:text-7xl">
          Chat with my portfolio
        </h1>
        <p className="mt-5 max-w-lg font-body text-body text-text-secondary sm:text-subtext">
          Ask the agent about my work, projects, taste, and the systems I like
          building.
        </p>
      </section>
    </main>
  );
}
