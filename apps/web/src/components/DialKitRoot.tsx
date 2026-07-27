"use client";

import { DialRoot } from "dialkit";
import type { DialMode, DialPosition, DialTheme } from "dialkit";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";

import { cn } from "~/lib/utils";

const inlinePanelWidth = 280;
const inlinePanelMinVisibleWidth = 288;
const inlinePanelMinVisibleHeight = 120;
const inlinePanelInset = 8;
const inlinePanelTop = 88;

type DialKitRootProps = {
  className?: string;
  defaultOpen?: boolean;
  draggable?: boolean;
  mode?: DialMode;
  position?: DialPosition;
  theme?: DialTheme;
};

function isDialKitEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_DIALKIT_ENABLED === "true"
  );
}

function getDefaultInlinePosition() {
  return {
    x: Math.max(inlinePanelInset, window.innerWidth - inlinePanelWidth - 24),
    y: inlinePanelTop,
  };
}

function clampInlinePosition(position: { x: number; y: number }) {
  return {
    x: Math.max(
      inlinePanelInset,
      Math.min(window.innerWidth - inlinePanelMinVisibleWidth, position.x),
    ),
    y: Math.max(
      inlinePanelInset,
      Math.min(window.innerHeight - inlinePanelMinVisibleHeight, position.y),
    ),
  };
}

export function DialKitRoot({
  className,
  defaultOpen,
  draggable = false,
  mode = "popover",
  position,
  theme = "system",
}: DialKitRootProps) {
  const [mounted, setMounted] = useState(false);
  const [inlinePosition, setInlinePosition] = useState({
    x: 24,
    y: inlinePanelTop,
  });
  const dragStartRef = useRef<{
    pointerId: number;
    pointerX: number;
    pointerY: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mode !== "inline") return;

    setInlinePosition(clampInlinePosition(getDefaultInlinePosition()));

    const handleResize = () => {
      setInlinePosition((currentPosition) =>
        clampInlinePosition(currentPosition),
      );
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [mode]);

  if (!mounted || !isDialKitEnabled()) {
    return null;
  }

  if (mode !== "inline") {
    return (
      <DialRoot
        defaultOpen={defaultOpen}
        position={position}
        productionEnabled
        theme={theme}
      />
    );
  }

  const dragStyle = {
    left: inlinePosition.x,
    top: inlinePosition.y,
  } satisfies CSSProperties;

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!draggable) return;
    if (!(event.target instanceof Element)) return;
    if (!event.target.closest(".dialkit-panel-header")) return;
    if (
      event.target.closest(
        ".dialkit-panel-icon, .dialkit-panel-toolbar, button, input, select, textarea, a, [role='button'], [contenteditable='true']",
      )
    ) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: inlinePosition.x,
      y: inlinePosition.y,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const dragStart = dragStartRef.current;
    if (!dragStart) return;

    const nextX = dragStart.x + event.clientX - dragStart.pointerX;
    const nextY = dragStart.y + event.clientY - dragStart.pointerY;
    setInlinePosition(clampInlinePosition({ x: nextX, y: nextY }));
  };

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    const dragStart = dragStartRef.current;
    if (!dragStart) return;

    if (event.currentTarget.hasPointerCapture(dragStart.pointerId)) {
      event.currentTarget.releasePointerCapture(dragStart.pointerId);
    }
    dragStartRef.current = null;
  };

  return (
    <aside
      aria-label={draggable ? "Draggable DialKit controls" : "DialKit controls"}
      className={cn(
        "fixed z-[9999] h-[348px] w-[280px] overflow-hidden",
        draggable && "touch-none [&_.dialkit-panel-header]:cursor-move",
        className,
      )}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={dragStyle}
    >
      <DialRoot
        defaultOpen={defaultOpen}
        mode="inline"
        position={position}
        productionEnabled
        theme={theme}
      />
    </aside>
  );
}
