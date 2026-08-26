/** Public support / contact email — set via `VITE_SUPPORT_EMAIL`. */
export const SUPPORT_EMAIL =
  (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined)?.trim() || "linkerpost3@gmail.com";

export function supportMailto(subject?: string): string {
  if (!subject) return `mailto:${SUPPORT_EMAIL}`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
