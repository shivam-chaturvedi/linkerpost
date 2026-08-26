/** Public product demo MP4 shown on the marketing home page. */
export const DEMO_VIDEO_URL = (
  import.meta.env.VITE_DEMO_VIDEO_URL as string | undefined
)?.trim() || "";

export const HAS_DEMO_VIDEO = DEMO_VIDEO_URL.length > 0;
