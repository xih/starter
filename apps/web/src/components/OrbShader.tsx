"use client";

import { useEffect, useRef } from "react";

import { cn } from "~/lib/utils";

export type OrbShaderState = "idle" | "loading" | "thinking";

export type OrbShaderProps = {
  className?: string;
  size?: number;
  state?: OrbShaderState;
};

export function OrbShader({
  className,
  size = 162,
  state = "loading",
}: OrbShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = size * pixelRatio;
    canvas.height = size * pixelRatio;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    context.scale(pixelRatio, pixelRatio);

    const render = (time: number) => {
      const t = time / 1000;
      const center = size / 2;
      const radius = size / 2;
      const pulse =
        state === "idle" ? 0 : Math.sin(t * (state === "thinking" ? 2.7 : 1.8));
      const drift = state === "idle" ? 0 : Math.cos(t * 1.2);

      context.clearRect(0, 0, size, size);
      context.save();
      context.beginPath();
      context.arc(center, center, radius, 0, Math.PI * 2);
      context.clip();

      const base = context.createRadialGradient(
        center - 26 + drift * 8,
        center - 30 + pulse * 6,
        radius * 0.08,
        center,
        center,
        radius,
      );
      base.addColorStop(0, "#1fbdf8");
      base.addColorStop(0.45, "#0b88c8");
      base.addColorStop(1, "#096fa9");
      context.fillStyle = base;
      context.fillRect(0, 0, size, size);

      if (state !== "idle") {
        for (let index = 0; index < 5; index += 1) {
          const angle = t * (0.7 + index * 0.11) + index * 1.7;
          const x = center + Math.cos(angle) * radius * 0.26;
          const y = center + Math.sin(angle * 1.3) * radius * 0.22;
          const glow = context.createRadialGradient(
            x,
            y,
            0,
            x,
            y,
            radius * (0.42 + index * 0.03),
          );
          glow.addColorStop(0, `rgba(255, 255, 255, ${0.16 + pulse * 0.03})`);
          glow.addColorStop(1, "rgba(255, 255, 255, 0)");
          context.fillStyle = glow;
          context.fillRect(0, 0, size, size);
        }
      }

      context.restore();

      if (state !== "idle") {
        animationFrame = requestAnimationFrame(render);
      }
    };

    render(0);

    return () => cancelAnimationFrame(animationFrame);
  }, [size, state]);

  return (
    <canvas
      aria-label="AI thinking"
      className={cn("block rounded-full", className)}
      ref={canvasRef}
    />
  );
}
