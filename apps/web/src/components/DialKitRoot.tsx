"use client";

import { DialRoot } from "dialkit";
import type { DialMode, DialPosition, DialTheme } from "dialkit";
import { Minus, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "~/lib/utils";

type DialKitRootProps = {
  className?: string;
  defaultOpen?: boolean;
  mode?: DialMode;
  position?: DialPosition;
  theme?: DialTheme;
};

const EXPANDED_PANEL_SIZE = { height: 388, width: 280 };
const MINIMIZED_PANEL_SIZE = { height: 40, width: 56 };
const PANEL_EDGE_INSET = 8;

function isDialKitEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_DIALKIT_ENABLED === "true"
  );
}

function clampPanelPosition(
  nextPosition: { x: number; y: number },
  minimized: boolean,
) {
  const panelSize = minimized ? MINIMIZED_PANEL_SIZE : EXPANDED_PANEL_SIZE;

  return {
    x: Math.max(
      PANEL_EDGE_INSET,
      Math.min(
        window.innerWidth - panelSize.width - PANEL_EDGE_INSET,
        nextPosition.x,
      ),
    ),
    y: Math.max(
      PANEL_EDGE_INSET,
      Math.min(
        window.innerHeight - panelSize.height - PANEL_EDGE_INSET,
        nextPosition.y,
      ),
    ),
  };
}

export function DialKitRoot({
  className,
  defaultOpen,
  mode = "popover",
  position,
  theme = "system",
}: DialKitRootProps) {
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    x: number;
    y: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ x: 16, y: 16 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const dragStart = dragStartRef.current;

      if (!dragStart) {
        return;
      }

      const nextX = dragStart.x + event.clientX - dragStart.pointerX;
      const nextY = dragStart.y + event.clientY - dragStart.pointerY;
      setPanelPosition(clampPanelPosition({ x: nextX, y: nextY }, minimized));
    }

    function handlePointerUp() {
      dragStartRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [minimized]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    setPanelPosition((currentPosition) =>
      clampPanelPosition(currentPosition, minimized),
    );
  }, [minimized, mounted]);

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

  return (
    <aside
      className={cn(
        "fixed z-[9999] overflow-hidden rounded-md border border-white/10 bg-neutral-950 text-white shadow-2xl",
        className,
      )}
      style={{
        height: minimized
          ? MINIMIZED_PANEL_SIZE.height
          : EXPANDED_PANEL_SIZE.height,
        left: panelPosition.x,
        top: panelPosition.y,
        width: minimized
          ? MINIMIZED_PANEL_SIZE.width
          : EXPANDED_PANEL_SIZE.width,
      }}
    >
      <div
        className="flex h-10 cursor-grab touch-none items-center justify-between border-b border-white/10 px-3 active:cursor-grabbing"
        onPointerDown={(event) => {
          dragStartRef.current = {
            pointerX: event.clientX,
            pointerY: event.clientY,
            x: panelPosition.x,
            y: panelPosition.y,
          };
        }}
      >
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold">
          <SlidersHorizontal className="size-4 shrink-0" />
          {!minimized ? <span className="truncate">DialKit</span> : null}
        </div>
        {!minimized ? (
          <button
            aria-label="Minimize DialKit"
            className="grid size-6 place-items-center rounded-sm text-white/70 hover:bg-white/10 hover:text-white"
            onClick={(event) => {
              event.stopPropagation();
              setMinimized(true);
            }}
            type="button"
          >
            <Minus className="size-4" />
          </button>
        ) : null}
      </div>
      {minimized ? (
        <button
          aria-label="Expand DialKit"
          className="absolute inset-0"
          onClick={() => setMinimized(false)}
          type="button"
        />
      ) : (
        <div className="h-[348px] overflow-hidden">
          <DialRoot
            defaultOpen={defaultOpen}
            mode="inline"
            position={position}
            productionEnabled
            theme={theme}
          />
        </div>
      )}
    </aside>
  );
}
