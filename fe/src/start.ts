import { createCsrfMiddleware, createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { applySecurityHeaders } from "./lib/security-headers";

const csrfMiddleware = createCsrfMiddleware({
  filter: (context) => context.handlerType === "serverFn",
});

const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  applySecurityHeaders(result.response.headers);
  return result;
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error("Unhandled application error");
    const headers = applySecurityHeaders(
      new Headers({
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      }),
    );
    return new Response(renderErrorPage(), {
      status: 500,
      headers,
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, securityHeadersMiddleware, errorMiddleware],
}));
