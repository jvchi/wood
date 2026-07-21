// Static first-frame jed mark — used until WebGL boots, and if it fails.
import frames from "./faviconFrames";

export const JED_FALLBACK_SRC =
  "data:image/svg+xml;utf8," + encodeURIComponent(frames[0] ?? "");
