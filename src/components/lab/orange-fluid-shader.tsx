"use client";

import { useEffect, useRef } from "react";

/**
 * Soft orange fluid wash. GradientRL-style oil/shader vibe, Olora orange only.
 * Right side is clearer so a custom image can sit on top later via --home-hero-image.
 */
export function OrangeFluidShader({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const blobs = [
      { x: 0.72, y: 0.35, r: 0.42, a: 0.55, s: 0.31 },
      { x: 0.88, y: 0.55, r: 0.36, a: 0.4, s: 0.47 },
      { x: 0.62, y: 0.7, r: 0.28, a: 0.28, s: 0.23 },
      { x: 0.95, y: 0.2, r: 0.22, a: 0.35, s: 0.61 },
      { x: 0.78, y: 0.85, r: 0.3, a: 0.22, s: 0.39 },
    ];

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas!.width = Math.max(1, Math.floor(w * dpr));
      canvas!.height = Math.max(1, Math.floor(h * dpr));
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function frame(t: number) {
      const time = t * 0.001;
      ctx!.clearRect(0, 0, w, h);

      // Base dark
      ctx!.fillStyle = "#050506";
      ctx!.fillRect(0, 0, w, h);

      ctx!.globalCompositeOperation = "lighter";
      for (const b of blobs) {
        const ox = Math.sin(time * b.s + b.x * 8) * 0.04;
        const oy = Math.cos(time * b.s * 0.85 + b.y * 6) * 0.05;
        const cx = (b.x + ox) * w;
        const cy = (b.y + oy) * h;
        const radius = b.r * Math.max(w, h) * 0.55;
        const g = ctx!.createRadialGradient(cx, cy, 0, cx, cy, radius);
        g.addColorStop(0, `rgba(215, 0, 58, ${b.a})`);
        g.addColorStop(0.35, `rgba(25, 8, 126, ${b.a * 0.45})`);
        g.addColorStop(0.7, `rgba(215, 0, 58, ${b.a * 0.08})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalCompositeOperation = "source-over";

      // Soft vignette so text side stays readable
      const vig = ctx!.createLinearGradient(0, 0, w * 0.72, 0);
      vig.addColorStop(0, "rgba(5,5,6,0.92)");
      vig.addColorStop(0.45, "rgba(5,5,6,0.55)");
      vig.addColorStop(1, "rgba(5,5,6,0.08)");
      ctx!.fillStyle = vig;
      ctx!.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(frame);
    }

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden
    />
  );
}
