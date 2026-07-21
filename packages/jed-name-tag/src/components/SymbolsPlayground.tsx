import { useCallback, useEffect, useRef, useState } from "react";
import { GLYPHS } from "../sandbox/glyphs";
import { SymbolsEffect, type SymbolsParams } from "../sandbox/standalone/SymbolsEffect";
import { JedSource } from "../lib/jedSource";
import { JedNameTag } from "../NameTag";

const DEFAULT_PARAMS: SymbolsParams = {
  cell: 10,
  // dark → light bands — works with black-ink jed on white
  bandColors: ["#0e0e14", "#2a2758", "#5b6fe8", "#eef0ff"],
  // near-white badge / paper → empty glyph only; ink (dark) gets the marks
  bandStops: [0, 0.35, 0.55, 0.72, 1],
  // square, diagonal, ring, empty
  bandGlyphs: [3, 5, 2, 0],
  zoom: 1,
  bg: "#ffffff",
};

type Source =
  | { kind: "jed" }
  | { kind: "image"; url: string; label: string }
  | { kind: "video"; url: string; label: string };

function sourceLabel(source: Source) {
  if (source.kind === "jed") return "jed favicon (animated)";
  return source.label;
}

export function SymbolsPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const effectRef = useRef<SymbolsEffect | null>(null);
  const jedRef = useRef<JedSource | null>(null);
  const sourceRef = useRef<Source>({ kind: "jed" });
  const objectUrlRef = useRef<string | null>(null);

  const [label, setLabel] = useState("jed favicon (animated)");
  const [cell, setCell] = useState(DEFAULT_PARAMS.cell);
  const [dragging, setDragging] = useState(false);

  const revokeUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const stopJed = () => {
    jedRef.current?.dispose();
    jedRef.current = null;
  };

  const applySource = useCallback(async (effect: SymbolsEffect, source: Source) => {
    if (source.kind === "jed") {
      stopJed();
      const jed = new JedSource(512);
      jedRef.current = jed;
      await jed.whenReady();
      // Only attach if this effect is still current
      if (effectRef.current !== effect) {
        jed.dispose();
        return;
      }
      effect.setCanvas(jed.canvas, { live: true });
      jed.start(() => effect.touchSource());
      return;
    }

    stopJed();
    if (source.kind === "image") {
      effect.setImage(source.url);
      return;
    }
    effect.setVideo(source.url);
  }, []);

  const rebuild = useCallback(
    async (nextCell: number, source: Source) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      effectRef.current?.dispose();
      stopJed();
      const effect = new SymbolsEffect(canvas, { ...DEFAULT_PARAMS, cell: nextCell });
      effectRef.current = effect;
      await applySource(effect, source);
    },
    [applySource]
  );

  useEffect(() => {
    void rebuild(cell, sourceRef.current);

    const onResize = () => effectRef.current?.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      effectRef.current?.dispose();
      effectRef.current = null;
      stopJed();
      revokeUrl();
    };
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!effectRef.current) return;
    void rebuild(cell, sourceRef.current);
  }, [cell, rebuild]);

  const setSource = (source: Source) => {
    sourceRef.current = source;
    setLabel(sourceLabel(source));
    if (effectRef.current) void applySource(effectRef.current, source);
  };

  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    revokeUrl();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;

    if (file.type.startsWith("video/")) {
      setSource({ kind: "video", url, label: file.name });
    } else if (file.type.startsWith("image/")) {
      setSource({ kind: "image", url, label: file.name });
    }
  };

  const savePng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "name-tag-jed.png";
    a.click();
  };

  return (
    <div className="app">
      <header className="header">
        <p className="eyebrow">Footer name tag preview</p>
        <h1>Symbols effect · jed</h1>
        <p className="lede">
          Your portfolio’s scribbled <strong>jed</strong> favicon, boiled through four
          brightness bands of symbols. Same frames as the tab icon — live on the GPU.
        </p>
      </header>

      <section
        className={`stage stage--square ${dragging ? "stage--drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFiles(e.dataTransfer.files);
        }}
      >
        <canvas ref={canvasRef} className="stage__canvas" aria-label="jed symbols effect" />
        <p className="stage__meta">
          Source: {label}
          {dragging ? " · drop to load" : ""}
        </p>
      </section>

      <section className="controls">
        <label className="control">
          <span>Cell size · {cell}px</span>
          <input
            type="range"
            min={4}
            max={24}
            value={cell}
            onChange={(e) => setCell(Number(e.target.value))}
          />
        </label>

        <div className="control-row">
          <button
            type="button"
            onClick={() => {
              revokeUrl();
              setSource({ kind: "jed" });
            }}
          >
            Reset jed
          </button>
          <label className="file-btn">
            Drop image / video
            <input
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={(e) => onFiles(e.target.files)}
            />
          </label>
          <button type="button" onClick={savePng}>
            Save PNG
          </button>
        </div>

        <p className="hint">
          Glyphs: {DEFAULT_PARAMS.bandGlyphs.map((i) => GLYPHS[i]?.name ?? "?").join(" · ")}{" "}
          (dark → light) · 5 favicon frames @ 6fps
        </p>
      </section>

      <section className="footer-mock" aria-label="Footer-sized preview">
        <div className="footer-mock__inner">
          <span className="footer-mock__copy">© 2026 · All rights reserved</span>
          <JedNameTag
            href="https://www.jachi.ke/"
            size={44}
            cell={Math.max(4, Math.round(cell * 0.7))}
          />
        </div>
      </section>
    </div>
  );
}
