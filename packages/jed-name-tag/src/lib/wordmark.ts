/** Paint "built by jed" (or any label) onto a canvas for the symbols source. */
export function paintWordmark(
  text = "built by jed",
  width = 1200,
  height = 360
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d")!;

  // Soft gradient ground so luminance bands have something to bite into
  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, "#1a1b22");
  g.addColorStop(0.45, "#3a3d4f");
  g.addColorStop(1, "#c8cad4");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  // Soft radial highlight behind the type
  const r = ctx.createRadialGradient(
    width * 0.5,
    height * 0.48,
    20,
    width * 0.5,
    height * 0.48,
    width * 0.42
  );
  r.addColorStop(0, "rgba(255,255,255,0.55)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#0a0a0c";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.round(height * 0.38)}px ui-sans-serif, system-ui, Arial, sans-serif`;

  // Fit text to ~88% of width
  let size = height * 0.38;
  ctx.font = `600 ${size}px ui-sans-serif, system-ui, Arial, sans-serif`;
  const measured = ctx.measureText(text).width || 1;
  size *= (width * 0.88) / measured;
  ctx.font = `600 ${size}px ui-sans-serif, system-ui, Arial, sans-serif`;
  ctx.fillText(text, width / 2, height / 2 + size * 0.04);

  return c;
}
