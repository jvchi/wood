// A minimal, self-contained version of the Symbols effect renderer — the core idea
// with none of the playground machinery (no preset pool, preloading, remix
// crossfade, or recording). This is what's shown in the Code tabs so the effect
// reads clearly; the live playground uses a fuller version of the same shader.
//
// Build a full-frame quad, sample the source per cell, bucket its luminance into a
// band, and stamp that band's glyph tinted with its colour over white paper.

import * as THREE from "three";
import { SANDBOX_VERT, SANDBOX_FRAG } from "../shaders";
import { glyphCanvas } from "../glyphs";

export interface SymbolsParams {
  cell: number; // pixel cell size
  bandColors: string[]; // 4 hex colours, dark band → light band
  bandStops: number[]; // 5 stops → 4 luminance bands
  bandGlyphs: number[]; // 4 glyph indices (0 = empty)
  zoom?: number; // source zoom (1 = fill)
  bg?: string; // background colour around a shrunk source
}

export class SymbolsEffect {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private uniforms: Record<string, { value: unknown }>;
  private canvas: HTMLCanvasElement;
  private srcAspect = 1;
  private video: HTMLVideoElement | null = null;
  private liveTex: THREE.CanvasTexture | null = null;
  private raf = 0;
  private reqCell: number; // requested cell size (CSS px @ the 600px ref width)

  constructor(canvas: HTMLCanvasElement, p: SymbolsParams) {
    this.canvas = canvas;
    this.reqCell = p.cell;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      premultipliedAlpha: true,
    });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setClearColor(0x000000, 0);

    const glyph = (i: number) => {
      const t = new THREE.CanvasTexture(glyphCanvas(i));
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    };
    const col = p.bandColors.map((h) => new THREE.Color(h));

    this.uniforms = {
      src: { value: new THREE.Texture() },
      resolution: { value: new THREE.Vector2(1, 1) },
      srcScale: { value: new THREE.Vector2(1, 1) },
      zoom: { value: p.zoom ?? 1 },
      bgColor: { value: new THREE.Color(p.bg ?? "#ffffff") },
      cell: { value: p.cell },
      bandColor: { value: col },
      bandColorB: { value: col.map((c) => c.clone()) },
      bandLo: { value: [p.bandStops[0], p.bandStops[1], p.bandStops[2], p.bandStops[3]] },
      bandHi: { value: [p.bandStops[1], p.bandStops[2], p.bandStops[3], p.bandStops[4]] },
      glyph: { value: p.bandGlyphs.map(glyph) },
      glyphB: { value: p.bandGlyphs.map(glyph) },
      morphT: { value: 1 },
    };

    const mat = new THREE.ShaderMaterial({
      vertexShader: SANDBOX_VERT,
      fragmentShader: SANDBOX_FRAG,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
    });
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    this.resize();
  }

  // COVER fit: the quad always fills the frame; we crop the SOURCE sampling instead
  // (a uv scale) so there are never black bars.
  private fit() {
    const r = this.canvas.getBoundingClientRect();
    const ca = r.width / Math.max(1, r.height);
    let ux = 1;
    let uy = 1;
    if (this.srcAspect > ca) ux = ca / this.srcAspect;
    else uy = this.srcAspect / ca;
    (this.uniforms.srcScale.value as THREE.Vector2).set(ux, uy);
  }

  resize = () => {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    this.renderer.setSize(w, h, false);
    (this.uniforms.resolution.value as THREE.Vector2).set(w, h);
    // scale the cell with the card width (ref 600px) so a narrow mobile card keeps
    // roughly the same cell density as a wide desktop one, not chunkier cells.
    this.uniforms.cell.value = Math.max(2, this.reqCell * (w / 600));
    this.fit();
    this.render();
  };

  render = () => this.renderer.render(this.scene, this.camera);

  private stopLive() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.video?.pause();
    this.video = null;
    this.liveTex = null;
  }

  setImage(url: string) {
    this.stopLive();
    new THREE.TextureLoader().load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      this.uniforms.src.value = tex;
      this.srcAspect = tex.image.width / tex.image.height;
      this.fit();
      this.render();
    });
  }

  /**
   * Feed a canvas as the source texture.
   * When `live` is true, re-upload the canvas each animation frame (for the
   * boiling jed mark or any other mutating source).
   */
  setCanvas(source: HTMLCanvasElement, opts: { live?: boolean } = {}) {
    this.stopLive();

    const tex = new THREE.CanvasTexture(source);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    this.uniforms.src.value = tex;
    this.srcAspect = source.width / Math.max(1, source.height);
    this.fit();
    this.render();

    if (opts.live) {
      this.liveTex = tex;
      this.loopCanvas();
    }
  }

  /** Nudge a live canvas texture after an external paint (e.g. jed frame flip). */
  touchSource() {
    if (this.liveTex) {
      this.liveTex.needsUpdate = true;
      this.render();
    }
  }

  setVideo(url: string) {
    this.stopLive();

    const v = document.createElement("video");
    v.src = url;
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    const tex = new THREE.VideoTexture(v);
    tex.colorSpace = THREE.SRGBColorSpace;
    v.addEventListener("loadeddata", () => {
      this.uniforms.src.value = tex;
      this.srcAspect = v.videoWidth / v.videoHeight || 1;
      this.video = v;
      this.fit();
      void v.play();
      this.loopVideo();
    });
    v.load();
  }

  private loopVideo = () => {
    if (!this.video) return;
    this.render();
    this.raf = requestAnimationFrame(this.loopVideo);
  };

  private loopCanvas = () => {
    if (!this.liveTex) return;
    this.liveTex.needsUpdate = true;
    this.render();
    this.raf = requestAnimationFrame(this.loopCanvas);
  };

  dispose() {
    this.stopLive();
    this.renderer.dispose();
  }
}
