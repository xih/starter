"use client";

import { useEffect, useRef } from "react";

export function Halo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    const updateCanvasSize = () => {
      const { innerWidth, innerHeight, devicePixelRatio = 1 } = window;
      canvas.width = innerWidth * devicePixelRatio;
      canvas.height = innerHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    // Animation variables
    let animationId: number;
    let time = 0;

    // Draw the glow effect
    const draw = () => {
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = window.innerWidth;
      const height = window.innerHeight;

      // Increase time for animation
      time += 0.03;

      // Create gradients for each edge - REDUCED BY HALF from 0.125 to 0.0625
      const gradientSize = Math.min(width, height) * 0.0625;

      // Single hue for all gradients that changes over time
      const hue = (time * 30) % 360;
      // Pure color at the edge with full opacity
      const gradientColor = `hsl(${hue}, 100%, 80%)`;
      const transparentColor = "hsla(0, 0%, 0%, 0)";

      // Top edge
      const topGradient = ctx.createLinearGradient(0, 0, 0, gradientSize);
      topGradient.addColorStop(0, gradientColor);
      topGradient.addColorStop(1, transparentColor);
      ctx.fillStyle = topGradient;
      ctx.fillRect(0, 0, width, gradientSize);

      // Right edge
      const rightGradient = ctx.createLinearGradient(
        width,
        0,
        width - gradientSize,
        0,
      );
      rightGradient.addColorStop(0, gradientColor);
      rightGradient.addColorStop(1, transparentColor);
      ctx.fillStyle = rightGradient;
      ctx.fillRect(width - gradientSize, 0, gradientSize, height);

      // Bottom edge
      const bottomGradient = ctx.createLinearGradient(
        0,
        height,
        0,
        height - gradientSize,
      );
      bottomGradient.addColorStop(0, gradientColor);
      bottomGradient.addColorStop(1, transparentColor);
      ctx.fillStyle = bottomGradient;
      ctx.fillRect(0, height - gradientSize, width, gradientSize);

      // Left edge
      const leftGradient = ctx.createLinearGradient(0, 0, gradientSize, 0);
      leftGradient.addColorStop(0, gradientColor);
      leftGradient.addColorStop(1, transparentColor);
      ctx.fillStyle = leftGradient;
      ctx.fillRect(0, 0, gradientSize, height);

      // Continue animation
      animationId = requestAnimationFrame(draw);
    };

    // Start animation
    animationId = requestAnimationFrame(draw);

    // Cleanup
    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 isolate z-[1000] h-[100dvh] w-[100vw] overflow-hidden">
      <canvas
        ref={canvasRef}
        style={{ filter: "blur(20px)" }}
        className="motion-safe:delay-[100ms] motion-safe:ease-\[cubic-bezier(0.215,0.61,0.355,1)\] absolute h-full w-full opacity-0 motion-safe:opacity-[1] motion-safe:transition-[opacity,transform] motion-safe:duration-700 motion-safe:will-change-[opacity,transform] motion-safe:dark:opacity-[1]"
      />
    </div>
  );
}
