"use client";

import { useEffect, useRef } from "react";
import { HERO_LINE_SVG } from "@/components/olora/hero-line-art";

const INK = "#3b69f3";

/**
 * Hero line-art. Credit flows in along the cables (left), the stack ticks,
 * and fills cross the order rows (right). Still under reduced motion;
 * paused offscreen.
 */
export function HeroLine({ className = "" }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    // Own the markup here so React re-renders never swap the nodes we animate.
    el.innerHTML = HERO_LINE_SVG;
    const svg = el.querySelector("svg");
    if (!svg) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Cables: dots travel from far left into the plug.
    const power = svg.querySelector('[data-part="power"]');
    const cables = [...(power?.querySelectorAll("path") ?? [])]
      .filter((p) => (p.getAttribute("stroke") ?? "").startsWith("url("))
      .map((p) => ({ p, len: p.getTotalLength() }));
    const cableDots = [...(power?.querySelectorAll("circle[r='1.3']") ?? [])] as SVGCircleElement[];
    const dots = cableDots.map((c, i) => ({
      c,
      cable: cables[i % Math.max(1, cables.length)],
      phase: (i * 0.137) % 1,
      speed: 0.07 + ((i * 37) % 10) / 260,
    }));

    // Rows: each dial has a band, a string, a fan line and pixel dots.
    const dials = [...svg.querySelectorAll("[data-dial]")].map((g, i) => {
      const band = g.querySelector('[data-part="row-band"]') as SVGRectElement | null;
      const str = g.querySelector('[data-part="string"]') as SVGPathElement | null;
      const pixels = [...g.querySelectorAll('[data-part="pixels"] circle')] as SVGCircleElement[];
      const x0 = Number(band?.getAttribute("x") ?? 325.3);
      const w = Number(band?.getAttribute("width") ?? 400.7);
      return {
        band,
        str,
        pixels,
        x0,
        w,
        baseFill: band?.getAttribute("fill") ?? "#ffffff",
        baseStroke: str?.getAttribute("stroke") ?? "#cfcfcc",
        seed: i,
      };
    });

    if (reduce) {
      dots.forEach(({ c, cable }, i) => {
        if (!cable) return;
        const pt = cable.p.getPointAtLength(cable.len * (0.2 + (i % 5) * 0.15));
        c.setAttribute("cx", String(pt.x));
        c.setAttribute("cy", String(pt.y));
        c.setAttribute("opacity", "0.8");
      });
      dials.forEach((d) =>
        d.pixels.forEach((p, j) => {
          p.setAttribute("cx", String(d.x0 + ((j + 0.5) / d.pixels.length) * d.w));
          p.setAttribute("opacity", "1");
        }),
      );
      return;
    }

    // Draw the cables in once on mount.
    const drawIns = cables.map(({ p, len }, i) =>
      p.animate([{ strokeDasharray: `${len}`, strokeDashoffset: `${len}` }, { strokeDasharray: `${len}`, strokeDashoffset: "0" }], {
        duration: 1400,
        delay: 120 * i,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "backwards",
      }),
    );

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0 });
    io.observe(el);

    const start = performance.now();
    let raf = 0;
    let lastActive = -1;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const t = (now - start) / 1000;

      // Cable dots.
      for (const d of dots) {
        if (!d.cable) continue;
        const u = (d.phase + t * d.speed) % 1;
        const pt = d.cable.p.getPointAtLength(d.cable.len * (1 - u));
        d.c.setAttribute("cx", pt.x.toFixed(2));
        d.c.setAttribute("cy", pt.y.toFixed(2));
        d.c.setAttribute("opacity", (Math.min(1, u * 6, (1 - u) * 6) * 0.9).toFixed(2));
      }

      // One active order row at a time, stepping every 1.4s.
      const active = Math.floor(t / 1.4) % Math.max(1, dials.length);
      if (active !== lastActive) {
        dials.forEach((d, i) => {
          const on = i === active;
          d.band?.setAttribute("fill", on ? "#e3feff" : d.baseFill);
          d.str?.setAttribute("stroke", on ? INK : d.baseStroke);
          d.str?.setAttribute("opacity", on ? "0.9" : "0.5");
        });
        lastActive = active;
      }

      // Fills: pixel dots drift right along each row, entering/leaving softly.
      for (const d of dials) {
        const n = d.pixels.length;
        const rowSpeed = 0.025 + ((d.seed * 13) % 7) / 300;
        d.pixels.forEach((p, j) => {
          const u = ((j / n) + t * rowSpeed + d.seed * 0.071) % 1;
          p.setAttribute("cx", (d.x0 + u * d.w).toFixed(2));
          const fade = Math.min(1, u * 10, (1 - u) * 10);
          p.setAttribute("opacity", ((j % 3 === 0 ? 1 : 0.85) * fade).toFixed(2));
        });
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      drawIns.forEach((a) => a.cancel());
    };
  }, []);

  // Reserve the art's aspect ratio (706x298) before the effect injects it.
  return <div ref={host} aria-hidden className={`ol-hero-line aspect-[706/298] ${className}`} />;
}
