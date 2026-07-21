"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { JED_FALLBACK_SRC } from "./lib/fallback";

export type JedNameTagProps = {
  /** Portfolio (or any) URL the badge links to. */
  href?: string;
  /** CSS size of the square badge. Default 44. */
  size?: number | string;
  /** Base cell size for the dither grid. Default 7. */
  cell?: number;
  className?: string;
  /** Opens in a new tab by default. */
  newTab?: boolean;
  "aria-label"?: string;
  /** Skip WebGL and keep the static fallback. */
  forceFallback?: boolean;
};

/**
 * Drop-in footer badge: boiling scribbled "jed" through the symbols dither.
 *
 * - Lazy-loads `three` + the GPU renderer (not on the critical path).
 * - Ships a static SVG fallback until the effect is ready, and if WebGL fails.
 * - Transparent paper — only the mark is drawn once the effect runs.
 */
export function JedNameTag({
  href = "https://www.jachi.ke/",
  size = 44,
  cell = 7,
  className,
  newTab = true,
  "aria-label": ariaLabel = "Built by jed — open portfolio",
  forceFallback = false,
}: JedNameTagProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (forceFallback) return;
    if (typeof window === "undefined") return;

    // No WebGL / reduced motion → keep the lightweight static mark
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    if (!canvas || reduce) return;

    let disposed = false;
    let effect: { resize: () => void; dispose: () => void; touchSource: () => void; setCanvas: (c: HTMLCanvasElement, o?: { live?: boolean }) => void } | null =
      null;
    let jed: { dispose: () => void; start: (cb?: () => void) => void; whenReady: () => Promise<void>; canvas: HTMLCanvasElement } | null =
      null;

    const onResize = () => effect?.resize();

    void (async () => {
      try {
        // Dynamic imports keep three + shaders out of the main bundle
        const [{ SymbolsEffect }, { JedSource }] = await Promise.all([
          import("./sandbox/standalone/SymbolsEffect"),
          import("./lib/jedSource"),
        ]);
        if (disposed || !canvasRef.current) return;

        const nextEffect = new SymbolsEffect(canvasRef.current, {
          cell,
          bandColors: ["#0e0e14", "#2a2758", "#5b6fe8", "#eef0ff"],
          bandStops: [0, 0.35, 0.55, 0.72, 1],
          bandGlyphs: [3, 5, 2, 0],
          zoom: 1,
          bg: "#ffffff",
        });
        const nextJed = new JedSource(256);
        effect = nextEffect;
        jed = nextJed;

        await nextJed.whenReady();
        if (disposed) {
          nextJed.dispose();
          nextEffect.dispose();
          return;
        }

        nextEffect.setCanvas(nextJed.canvas, { live: true });
        nextJed.start(() => nextEffect.touchSource());
        window.addEventListener("resize", onResize);
        setLive(true);
      } catch {
        // WebGL/module failure — static fallback stays visible
        setLive(false);
      }
    })();

    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      jed?.dispose();
      effect?.dispose();
      setLive(false);
    };
  }, [cell, forceFallback]);

  const dim = typeof size === "number" ? `${size}px` : size;
  const box: CSSProperties = {
    display: "block",
    width: dim,
    height: dim,
    flexShrink: 0,
    lineHeight: 0,
    textDecoration: "none",
    overflow: "hidden",
    borderRadius: "0.55rem",
    position: "relative",
  };
  const fill: CSSProperties = {
    display: "block",
    width: "100%",
    height: "100%",
    position: "absolute",
    inset: 0,
  };

  return (
    <a
      href={href}
      className={className}
      aria-label={ariaLabel}
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      style={box}
    >
      {/* Always mounted: visible until/unless live canvas takes over */}
      <img
        src={JED_FALLBACK_SRC}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          ...fill,
          objectFit: "contain",
          opacity: live ? 0 : 1,
          transition: "opacity 0.2s ease",
          pointerEvents: "none",
        }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          ...fill,
          opacity: live ? 1 : 0,
          transition: "opacity 0.2s ease",
          pointerEvents: "none",
        }}
      />
    </a>
  );
}

export default JedNameTag;
