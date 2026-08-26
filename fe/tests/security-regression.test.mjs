import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const projectRoot = new URL("..", import.meta.url).pathname;

function read(relativePath) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

test("authentication is not represented by a browser-storage flag", () => {
  const source = sourceFiles(join(projectRoot, "src"))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");

  assert.doesNotMatch(source, /linker-post-auth/);
  assert.match(read("src/routes/login.tsx"), /await loginUser/);
  assert.match(read("src/routes/signup.tsx"), /await signupUser/);
  assert.match(read("src/lib/api.ts"), /credentials: "include"/);
  assert.match(read("src/routes/app.tsx"), /RequireAuth/);
});

test("public navigation renders exactly one session action", () => {
  const navigation = read("src/components/site/PublicNav.tsx");
  assert.match(navigation, /getCurrentUser\(\)/);
  assert.match(navigation, /sessionState === "anonymous"/);
  assert.match(navigation, /sessionState === "authenticated"/);
  assert.match(navigation, /shadow-\[0_5px_0_/);
});

test("application source has no unsafe HTML rendering API", () => {
  const source = sourceFiles(join(projectRoot, "src"))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  const assistant = read("src/components/app/SmartAgent.tsx");

  assert.doesNotMatch(source, /dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\s*\(/);
  assert.match(assistant, /whitespace-pre-wrap/);
});

test("legacy app names are absent", () => {
  const source = sourceFiles(join(projectRoot, "src"))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");

  assert.doesNotMatch(source, /\blinkly\b|\blinkedly\b/i);
  assert.match(source, /Linker Post/);
});

test("server functions have explicit CSRF middleware", () => {
  const start = read("src/start.ts");
  assert.match(start, /createCsrfMiddleware/);
  assert.match(start, /handlerType === "serverFn"/);
});

test("deployment configuration includes baseline browser security headers", () => {
  const config = JSON.parse(read("vercel.json"));
  const headers = Object.fromEntries(
    config.headers[0].headers.map(({ key, value }) => [key, value]),
  );
  const securityHeaders = read("src/lib/security-headers.ts");

  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.match(securityHeaders, /object-src 'none'/);
  assert.match(securityHeaders, /frame-ancestors 'none'/);
  assert.match(securityHeaders, /base-uri 'self'/);
  assert.match(securityHeaders, /VITE_API_URL/);
  assert.match(securityHeaders, /img-src[^;]+https:\/\/media\.licdn\.com/);
  assert.match(
    securityHeaders,
    /media-src[^;]+https:\/\/\*\.public\.blob\.vercel-storage\.com/,
  );
});

test("Vercel deployment does not rewrite SSR routes to a static index", () => {
  const config = JSON.parse(read("vercel.json"));
  assert.equal(config.rewrites, undefined);
  assert.match(read("vite.config.ts"), /nitro\(\{ preset: "vercel" \}\)/);
});

test("HR workflows are disabled by default and protected by one feature flag", () => {
  assert.match(read(".env.example"), /^VITE_ENABLE_HR=false$/m);
  assert.match(read("src/lib/features.ts"), /VITE_ENABLE_HR === "true"/);
  assert.match(read("src/routes/onboarding.tsx"), /HR_FEATURE_ENABLED/);
  assert.match(read("src/components/app/AppShell.tsx"), /HR_FEATURE_ENABLED/);
  assert.match(read("src/routes/app.tsx"), /pathname\.startsWith\("\/app\/recruiting"\)/);
});

test("feedback dialog is portaled and constrained to the viewport", () => {
  const feedback = read("src/components/app/FeedbackWidget.tsx");

  assert.match(feedback, /createPortal/);
  assert.match(feedback, /fixed inset-0 z-\[1000\] grid place-items-center/);
  assert.match(feedback, /max-h-\[calc\(100dvh-2rem\)\]/);
});

test("calendar renders database posts with accessible status colors", () => {
  const calendar = read("src/routes/app.calendar.tsx");

  assert.match(calendar, /await getPosts\(\)/);
  assert.doesNotMatch(calendar, /QuickPostModal|Date\.now\(\)/);
  assert.match(calendar, /bg-slate-200 text-slate-800/);
  assert.match(calendar, /bg-orange-500 text-white/);
  assert.match(calendar, /bg-emerald-600 text-white/);
});

test("composer submits optional first comments and has working link handlers", () => {
  const composer = read("src/routes/app.manage-posts.tsx");
  const api = read("src/lib/api.ts");

  assert.match(composer, /First comment/);
  assert.match(composer, /handleQuillLink/);
  assert.match(composer, /handleQuillClean/);
  assert.match(api, /form\.set\("first_comment"/);
});
