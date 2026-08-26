const apiOrigin = (() => {
  try {
    return new URL(import.meta.env.VITE_API_URL).origin;
  } catch {
    return "";
  }
})();

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://media.licdn.com https://media.licdn-ei.com https://www.google-analytics.com https://www.googletagmanager.com",
  "media-src 'self' blob: https://*.public.blob.vercel-storage.com https://*.blob.vercel-storage.com",
  `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ""} https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://www.googletagmanager.com https://*.public.blob.vercel-storage.com https://*.blob.vercel-storage.com`,
  "worker-src 'self' blob:",
].join("; ");

export const SECURITY_HEADERS = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
} as const;

export function applySecurityHeaders(headers: Headers): Headers {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  return headers;
}
