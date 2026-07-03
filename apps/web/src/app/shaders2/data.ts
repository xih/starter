// app/shaders/data.ts
import TweetGLSLVisualization from "~/components/YoheiShader";
import type { ThreeElements } from "@react-three/fiber";
import SeascapeGLSLVisualization from "~/components/SeaScapeShader";
import WaterGLSLVisualization from "~/components/WaterVisualizationShader";
import ProteanCloudsShader from "~/components/ProteanCloudsShader";
import DVDShader from "~/components/DVDShader/client";

export const SHADERS = {
  tweet: {
    title: "Tweet GLSL",
    Component: TweetGLSLVisualization,
  },
  seascape: {
    title: "Seascape GLSL",
    Component: SeascapeGLSLVisualization,
  },
  water: {
    title: "Water GLSL",
    Component: WaterGLSLVisualization,
  },
  proteanClouds: {
    title: "Protean Clouds",
    Component: ProteanCloudsShader,
  },
  dvd: {
    title: "DVD Shader",
    Component: DVDShader,
  },
} as const;

export type ShaderSlug = keyof typeof SHADERS;
export const ALL_SLUGS: ShaderSlug[] = Object.keys(SHADERS) as ShaderSlug[];
