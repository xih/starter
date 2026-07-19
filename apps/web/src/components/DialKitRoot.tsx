"use client";

import { DialRoot } from "dialkit";
import { Minus, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function DialKitRoot() {
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    x: number;
    y: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 16 });

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
      setPosition({
        x: Math.max(8, Math.min(window.innerWidth - 72, nextX)),
        y: Math.max(8, Math.min(window.innerHeight - 40, nextY)),
      });
    }

    function handlePointerUp() {
      dragStartRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <aside
      className="fixed z-[9999] overflow-hidden rounded-md border border-white/10 bg-neutral-950 text-white shadow-2xl"
      style={{
        height: minimized ? 40 : 388,
        left: position.x,
        top: position.y,
        width: minimized ? 56 : 280,
      }}
    >
      <div
        className="flex h-10 cursor-grab items-center justify-between border-b border-white/10 px-3 active:cursor-grabbing"
        onPointerDown={(event) => {
          dragStartRef.current = {
            pointerX: event.clientX,
            pointerY: event.clientY,
            x: position.x,
            y: position.y,
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
          <DialRoot mode="inline" theme="dark" productionEnabled />
        </div>
      )}
    </aside>
  );
}
