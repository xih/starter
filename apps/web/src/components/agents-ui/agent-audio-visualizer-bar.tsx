"use client";

import React, {
  Children,
  cloneElement,
  type ComponentProps,
  type CSSProperties,
  isValidElement,
  type ReactNode,
  useMemo,
} from "react";
import { type VariantProps, cva } from "class-variance-authority";
import type { LocalAudioTrack, RemoteAudioTrack } from "livekit-client";
import {
  type AgentState,
  type TrackReferenceOrPlaceholder,
  useMultibandTrackVolume,
} from "@livekit/components-react";

import { useAgentAudioVisualizerBarAnimator } from "~/hooks/agents-ui/use-agent-audio-visualizer-bar";
import { cn } from "~/lib/utils";

function cloneSingleChild(
  children: ReactNode | ReactNode[],
  props?: Record<string, unknown>,
  key?: string | number,
) {
  return Children.map(children, (child) => {
    if (isValidElement(child) && Children.only(children)) {
      const childProps = child.props as Record<string, unknown>;
      if (childProps.className) {
        props ??= {};
        props.className = cn(
          typeof childProps.className === "string"
            ? childProps.className
            : undefined,
          typeof props.className === "string" ? props.className : undefined,
        );
        props.style = {
          ...(childProps.style as CSSProperties),
          ...(props.style as CSSProperties),
        };
      }
      return cloneElement(child, {
        ...props,
        key: key ? String(key) : undefined,
      });
    }
    return child;
  });
}

export const AgentAudioVisualizerBarElementVariants = cva(
  [
    "rounded-full transition-colors duration-250 ease-linear",
    "bg-current/10 data-[lk-highlighted=true]:bg-current",
  ],
  {
    variants: {
      size: {
        icon: "w-[4px] min-h-[4px]",
        sm: "w-[8px] min-h-[8px]",
        md: "w-[16px] min-h-[16px]",
        lg: "w-[32px] min-h-[32px]",
        xl: "w-[64px] min-h-[64px]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export const AgentAudioVisualizerBarVariants = cva(
  "relative flex items-center justify-center",
  {
    variants: {
      size: {
        icon: "h-[24px] gap-[2px]",
        sm: "h-[56px] gap-[4px]",
        md: "h-[112px] gap-[8px]",
        lg: "h-[224px] gap-[16px]",
        xl: "h-[448px] gap-[32px]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export interface AgentAudioVisualizerBarProps {
  size?: "icon" | "sm" | "md" | "lg" | "xl";
  state?: AgentState;
  color?: `#${string}`;
  barCount?: number;
  audioTrack?: LocalAudioTrack | RemoteAudioTrack | TrackReferenceOrPlaceholder;
  className?: string;
  children?: ReactNode;
}

export function AgentAudioVisualizerBar({
  size = "md",
  state = "connecting",
  color,
  barCount,
  audioTrack,
  className,
  children,
  style,
  ...props
}: AgentAudioVisualizerBarProps &
  VariantProps<typeof AgentAudioVisualizerBarVariants> &
  ComponentProps<"div">) {
  const _barCount = useMemo(() => {
    if (barCount) {
      return barCount;
    }
    switch (size) {
      case "icon":
      case "sm":
        return 3;
      default:
        return 5;
    }
  }, [barCount, size]);

  const rawVolumeBands: unknown = useMultibandTrackVolume(audioTrack, {
    bands: _barCount,
    loPass: 100,
    hiPass: 200,
  });
  const volumeBands = useMemo(
    () =>
      Array.isArray(rawVolumeBands)
        ? rawVolumeBands.map((band) => (typeof band === "number" ? band : 0))
        : [],
    [rawVolumeBands],
  );

  const sequencerInterval = useMemo(() => {
    switch (state) {
      case "connecting":
        return 2000 / _barCount;
      case "initializing":
        return 2000;
      case "listening":
        return 500;
      case "thinking":
        return 150;
      default:
        return 1000;
    }
  }, [state, _barCount]);

  const highlightedIndices = useAgentAudioVisualizerBarAnimator(
    state,
    _barCount,
    sequencerInterval,
  );

  const bands = useMemo<number[]>(
    () =>
      state === "speaking"
        ? volumeBands
        : Array.from({ length: _barCount }, () => 0),
    [state, volumeBands, _barCount],
  );

  if (children && Array.isArray(children)) {
    throw new Error(
      "AgentAudioVisualizerBar children must be a single element.",
    );
  }

  return (
    <div
      data-lk-state={state}
      style={{ ...style, color }}
      className={cn(AgentAudioVisualizerBarVariants({ size }), className)}
      {...props}
    >
      {bands.map((band: number, idx: number) =>
        children ? (
          <React.Fragment key={idx}>
            {cloneSingleChild(children, {
              "data-lk-index": idx,
              "data-lk-highlighted": highlightedIndices.includes(idx),
              style: { height: `${band * 100}%` },
            })}
          </React.Fragment>
        ) : (
          <div
            key={idx}
            data-lk-index={idx}
            data-lk-highlighted={highlightedIndices.includes(idx)}
            style={{ height: `${band * 100}%` }}
            className={cn(AgentAudioVisualizerBarElementVariants({ size }))}
          />
        ),
      )}
    </div>
  );
}
