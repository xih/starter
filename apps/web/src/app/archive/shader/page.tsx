"use client";

import dynamic from "next/dynamic";

const GoldenGateWaterShader = dynamic(
  () =>
    import("~/components/GoldenGateWaterShader").then(
      (mod) => mod.GoldenGateWaterShader,
    ),
  { ssr: false },
);

export default function ArchivedShaderPage() {
  return <GoldenGateWaterShader />;
}
