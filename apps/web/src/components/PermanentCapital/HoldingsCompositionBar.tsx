"use client";

import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";

import { formatPercent, getHoldingsSegments } from "./format";
import type { PermanentCapitalCompany } from "./types";

const SEGMENT_COLORS = [
  "rgba(255,255,255,0.95)",
  "rgba(255,255,255,0.85)",
  "rgba(255,255,255,0.78)",
  "rgba(255,255,255,0.71)",
  "rgba(255,255,255,0.64)",
  "rgba(255,255,255,0.58)",
  "rgba(255,255,255,0.52)",
  "rgba(255,255,255,0.46)",
  "rgba(255,255,255,0.4)",
  "rgba(255,255,255,0.34)",
  "rgba(255,255,255,0.14)",
] as const;

export function HoldingsCompositionBar({
  company,
  width = 412,
}: {
  company: PermanentCapitalCompany;
  width?: number;
}) {
  const segments = getHoldingsSegments(company);
  const scale = scaleLinear({ domain: [0, 100], range: [0, width] });
  let offset = 0;

  if (segments.length === 0) {
    return (
      <div className="py-token-10 rounded-[6px] border border-white/15 bg-white/[0.06] px-token-12 text-caption text-text-secondary">
        Holdings composition unavailable
      </div>
    );
  }

  return (
    <div className="grid gap-token-16">
      <svg
        aria-label="Top holdings composition"
        className="h-[32px] w-full overflow-hidden rounded-[6px]"
        role="img"
        viewBox={`0 0 ${width} 32`}
      >
        <Group>
          {segments.map((segment, index) => {
            const segmentWidth = Math.max(scale(segment.value), 1);
            const x = offset;
            offset += segmentWidth;

            return (
              <Bar
                key={segment.id}
                fill={SEGMENT_COLORS[index] ?? SEGMENT_COLORS.at(-1)}
                height={32}
                rx={index === 0 || index === segments.length - 1 ? 6 : 0}
                width={segmentWidth}
                x={x}
                y={0}
              />
            );
          })}
        </Group>
      </svg>

      <div className="gap-y-token-10 grid grid-cols-1 gap-x-token-16 sm:grid-cols-2">
        {segments.map((segment, index) => (
          <div
            key={segment.id}
            className="leading-caption grid min-w-0 grid-cols-[8px_1fr_auto] items-center gap-token-8 text-caption"
          >
            <span
              aria-hidden="true"
              className="size-[8px] rounded-[2px]"
              style={{
                backgroundColor: SEGMENT_COLORS[index] ?? SEGMENT_COLORS.at(-1),
              }}
            />
            <span
              className={
                segment.id === "other"
                  ? "text-text-secondary/70 truncate"
                  : "truncate text-[#e6e6e6]"
              }
            >
              {segment.label}
            </span>
            <span className="text-text-secondary">
              {formatPercent(segment.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
