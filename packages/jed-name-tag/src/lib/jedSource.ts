// Cycles the portfolio's scribbled "jed" favicon frames onto a large canvas
// so the Symbols effect has enough pixels to dither. Same boil rate as the tab icon (6fps).

import frames from "./faviconFrames";

const DEFAULT_SIZE = 512;
const FPS = 6;

function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load jed frame"));
    img.src = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  });
}

export class JedSource {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private images: HTMLImageElement[] = [];
  private index = 0;
  private timer = 0;
  private ready: Promise<void>;
  private onFrame: (() => void) | null = null;

  constructor(size = DEFAULT_SIZE) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext("2d")!;

    this.ready = Promise.all(frames.map(loadSvgImage)).then((images) => {
      this.images = images;
      this.paint(0);
    });
  }

  whenReady() {
    return this.ready;
  }

  /** Start the boil animation. Calls onFrame after each paint so the GPU texture can refresh. */
  start(onFrame?: () => void) {
    this.onFrame = onFrame ?? null;
    this.stop();

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || this.images.length <= 1) {
      this.paint(0);
      this.onFrame?.();
      return;
    }

    this.timer = window.setInterval(() => {
      this.index = (this.index + 1) % this.images.length;
      this.paint(this.index);
      this.onFrame?.();
    }, 1000 / FPS);
  }

  stop() {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = 0;
    }
  }

  dispose() {
    this.stop();
    this.onFrame = null;
  }

  private paint(i: number) {
    const img = this.images[i];
    const { canvas, ctx } = this;
    if (!img?.naturalWidth) return;

    // White ground (not transparent black): outside the badge reads as full
    // luminance → lightest/empty band → no symbols in the corners.
    // The shader still draws paper as transparent, so only the jed ink shows.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
}
