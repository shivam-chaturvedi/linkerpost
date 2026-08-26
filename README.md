### Live product URLs (from deployment config): FE [linkerpost.vercel.app](https://linkerpost.vercel.app/login), API `linkerpost-api.vercel.app`.

---

## 1. Overall Application

### What is it?
**Linker Post** is a LinkedIn-first content operations product: connect LinkedIn profiles, write/schedule/publish posts, run an AI content planner, and manage a calendar — all from one workspace.

### Problem it solves
Creators, founders, and agencies struggle to stay consistent on LinkedIn (drafting, timing, multi-account ops, research). Linker Post centralizes compose → schedule → publish and adds AI planning/rewriting.

### Who uses it?
Primary: **creators / founders / agencies** (creator persona).  
**Partial:** HR/recruiting persona exists in the UI behind `VITE_ENABLE_HR` but has no real backend.

### End-to-end flow (typical)
1. Land on marketing site → sign up (email or Google) → onboarding  
2. Connect LinkedIn OAuth account  
3. Compose posts (draft / schedule / publish now) or run **AI Content Planner**  
4. Scheduler publishes due posts using **stored LinkedIn tokens** (no user session)  
5. Review calendar, analytics/comments on published posts, settings, support  

### Architecture (simple)
Three deployable pieces share one Postgres DB:

| Piece | Host | Role |
|--------|------|------|
| Frontend | `linkerpost.vercel.app` | React UI |
| API | `linkerpost-api.vercel.app` | FastAPI business logic |
| Scheduler | `linkerpost-scheduler` | Cron/poll due posts → LinkedIn |

```
User → Browser (FE)
         │  HTTPS + cookies (credentials: include)
         ▼
      FastAPI API ──► PostgreSQL
         │
         ├──► Google OAuth (login)
         ├──► LinkedIn OAuth + Publishing API
         ├──► Gemini / optional Nemotron (AI)
         └──► (optional) LangSmith tracing

      Scheduler (separate) ──► PostgreSQL ──► LinkedIn publish
```

---

## 2. Complete Technology Stack

### Frontend

| Tech | Purpose | Where | Why / Layman |
|------|---------|-------|--------------|
| React 19 | UI | `fe/src` | Builds interactive pages |
| Vite 8 | Bundler/dev server | `fe/vite.config.ts` | Builds and serves the app |
| TanStack Router / Start | File routing + SSR/deploy | `fe/src/routes`, `start.ts` | Pages map to URLs; deploys to Vercel |
| TanStack Query | Server-state helper | `router.tsx` / `__root.tsx` | Caching/refetch patterns |
| Tailwind CSS v4 | Styling | `styles.css` | Utility CSS |
| shadcn / Radix | UI primitives | `components/ui` | Accessible buttons, dialogs, etc. |
| Quill / react-quill-new | Rich text | Manage Posts composer | Formatted post writing |
| Lucide | Icons | throughout | Icons |
| Zod / react-hook-form | Forms/validation | deps + forms | Validate inputs |
| date-fns, react-day-picker | Dates | calendar/composer | Pick schedule times |
| react-dropzone | Uploads | composer | Drag-drop media |
| recharts | Charts | dashboard/usage UI | Graphs |

### Backend

| Tech | Purpose | Where | Layman |
|------|---------|-------|--------|
| FastAPI | HTTP API | `be/app/main.py` | Server that answers API calls |
| Uvicorn | ASGI server | local / Vercel | Runs FastAPI |
| SQLAlchemy async + asyncpg | ORM + DB driver | `app/db`, models | Talks to Postgres |
| Alembic | Migrations | `be/migrations` | Evolves DB schema |
| Pydantic / pydantic-settings | Validation + config | schemas, `config.py` | Checks data & env |
| httpx | Outbound HTTP | LinkedIn/Google/LLM | Calls other websites’ APIs |
| PyJWT | Session JWT | `security.py` | Signed login token in cookie |
| pwdlib + Argon2 | Password hashes | auth | Safe password storage |
| cryptography / Fernet | Encrypt LinkedIn tokens | `token_encryption` | Scrambles tokens at rest |
| python-multipart | File uploads | posts create | Accepts images/videos |

### Database
**PostgreSQL** (async URL in `DATABASE_URL`; prod noted as Aiven/DO Bangalore, API region `bom1`).

### Auth & security
HttpOnly cookies, JWT access token, CSRF double-submit, CORS credentialed origins, security headers, CHIPS `Partitioned` cookies for cross-site FE↔API.

### AI / LLM
LangGraph + LangChain, Google Gemini (`langchain-google-genai`), optional NVIDIA Nemotron, LangSmith, DuckDuckGo search (`ddgs`), BeautifulSoup crawl, optional Playwright.

### Third-party
Google OAuth, LinkedIn OAuth + REST publishing, Google Custom Search / YouTube keys for planner (config), support email via `VITE_SUPPORT_EMAIL`.

### Background jobs
**Not Celery/Redis.** Standalone FastAPI scheduler + Vercel Cron (`/api/cron/publish-due`). Local poll loop when not on Vercel.

### DevOps
Vercel (FE + API + scheduler projects), `bom1` region, Alembic, pytest/ruff/mypy (BE), eslint/prettier (FE).

### Monitoring
Python `logging`, request IDs, optional LangSmith. No Datadog/Sentry wired in code reviewed.

---

## 3. Backend Analysis

### Framework & structure
```
be/
  main.py              # picks api | scheduler via LINKERPOST_SERVICE
  api/index.py         # Vercel entry
  app/
    main.py            # FastAPI API
    api/routes/        # HTTP endpoints
    api/dependencies.py
    core/              # config, security, cookies
    db/                # session
    models/            # SQLAlchemy
    schemas/           # Pydantic
    services/          # LinkedIn, Google, publisher, notifications
    middleware/
    repositories/
  agents/              # AI Content Planner, rewrite, llm facade
  scheduler/           # due-post worker app
  migrations/
```

### Data flow (typical authenticated request)
1. CORS → RequestId → Cookie JWT (+ CSRF if mutating) → route  
2. `CurrentUser` dependency loads user  
3. Service / DB work  
4. Pydantic response  

### Routes
~**40** main API endpoints under `/api` (auth, accounts/LinkedIn, posts, agents, notifications, settings, assistant, usage, health, config) plus scheduler cron endpoints. Full inventory is in section 7.

### Services (business logic)
- `post_publisher.py` — shared publish for API + scheduler; refresh LinkedIn tokens  
- `linkedin.py` / `linkedin_publishing.py` — OAuth + publish/analytics/comments  
- `google_oauth.py` — Google login  
- `notifications.py` — create in-app notifications  

### Models / schemas / repos
SQLAlchemy models in `app/models`; Pydantic in `app/schemas`; thin repositories (e.g. users, content planner).

### Auth model
- JWT in HttpOnly cookie; `token_version` invalidates on logout  
- Google: callback issues one-time code → FE `POST /api/auth/google/session` sets cookie (CHIPS-safe)  
- LinkedIn connect: callback public; user from OAuth state (cookie may not arrive cross-site)  

### Validation & errors
Pydantic + HTTPException; LinkedIn/Google errors mapped to public codes; soft-fail analytics to zeros.

### File handling
Multipart uploads on `POST /api/posts`; size limits per type; media stored on post then cleared after successful publish.

### Background
Scheduler only publishes due `posts`. **Does not** auto-run agents on cadence fields.

### Config
Central `Settings` in `app/core/config.py` (DB, JWT, cookies, LinkedIn, Google, LLM, planner, `CRON_SECRET`, `PRICING_ENABLED`).

### Caching
No Redis/app cache layer found.

---

## 4. Frontend Analysis

### Framework
React 19 + Vite + TanStack Router/Start on Vercel (Nitro).

### Pages (what user sees)

| Route | Role |
|-------|------|
| `/` | Marketing |
| `/login`, `/signup`, `/auth/complete` | Auth (Google completes here) |
| `/onboarding` | Setup wizard |
| `/help`, `/privacy-policy`, `/terms-of-service` | Public docs |
| `/pricing` | **Partial** — redirects away if pricing flag off |
| `/app/dashboard` | Stats, setup, LLM usage |
| `/app/accounts` | LinkedIn accounts |
| `/app/manage-posts` | Composer + list + analytics |
| `/app/calendar` | Schedule views |
| `/app/agents`, `/app/library` | AI agents |
| `/app/settings`, `/app/support` | Prefs / help |
| `/app/recruiting*` | **Partial** placeholders if HR on |
| `/forgot-password` | Mailto only — **no reset API** |

### Components
`AppShell` (nav, theme, notifications, composer dock, SmartAgent), `ComposerModal`, `AgentRunDetail`, `NotificationDrawer`, site chrome, shadcn UI.

### State
- Auth: React context (`RequireAuth` / `GuestOnly`)  
- Server data: fetch via `lib/api.ts` (`credentials: "include"`)  
- Local: theme, persona, rewrite drafts  

### Auth UX
Email login/signup with CSRF; Google → `/auth/complete?code=` → exchange → dashboard. 401 on `/api/auth/me` → login.

### Styling
Tailwind v4, CSS variables, dark class, LinkedIn-blue accents, Quill editor styles.

---

## 5. Database

**Tech:** PostgreSQL via SQLAlchemy async.

### Important tables (relationships)

| Table | Role |
|-------|------|
| `users` | Accounts (email and/or `google_id`) |
| `accounts` | LinkedIn connections + encrypted tokens |
| `posts` | Drafts / scheduled / published content |
| `oauth_states` | OAuth CSRF/state + Google session codes |
| `agents`, `agent_runs`, `agent_user_settings` | Agent catalog & runs |
| `content_runs`, `content_sources`, `generated_posts` | Planner persistence |
| `notifications` | In-app alerts |
| `user_settings`, `support_tickets` | Prefs + help |
| `llm_usage_events` | Token/cost tracking |

**Technical:** `User 1—* Account`, `User 1—* Post`, `Post *—1 Account` (nullable SET NULL), `User 1—1 UserSettings`.

**Layman:** One person can connect many LinkedIn profiles and create many posts; each post can point at one LinkedIn profile.

Indexes include unique email/google_id, account uniqueness, `posts.scheduled_for`, oauth `(provider, state_hash)`.

Lifecycle: draft → scheduled → publishing → published/failed; media bytes dropped after publish; LinkedIn tokens refreshed and rewritten on account row.

---

## 6. Authentication & Security

### Flows

| Flow | Behavior |
|------|----------|
| Signup/login | CSRF → create/verify user → set JWT cookie |
| Google | OAuth → **no cookie on redirect** → FE exchanges code → cookie |
| Logout | Bump `token_version`, clear cookies |
| Protected FE | `RequireAuth` calls `/api/auth/me` |
| Protected API | Middleware requires cookie JWT |

**No app refresh-token rotation** for Linker Post sessions (single JWT cookie with expiry). LinkedIn **does** use refresh tokens for publishing.

**Roles:** No real RBAC. Persona `creator`/`hr` is localStorage UI only.

### Security mechanisms

| Mechanism | Protects against |
|-----------|------------------|
| HttpOnly cookies | JS stealing session token (XSS theft of cookie) |
| CSRF double-submit | Cross-site forged state-changing requests |
| SameSite=None + Secure + Partitioned | Cross-site FE/API with modern browsers |
| Argon2 passwords | Offline password cracking |
| Fernet token encryption | DB leak exposing raw LinkedIn tokens |
| CORS allowlist + credentials | Random sites calling API with cookies |
| TrustedHost / HTTPS redirect | Host header / cleartext issues in prod |
| Security headers / API CSP | Clickjacking, MIME sniffing, etc. |
| Pydantic + SQLAlchemy params | Injection via typed queries |
| Upload size/type checks | Huge/wrong files |
| OAuth state hashes + TTL | CSRF/replay on OAuth |

**Missing / thin:** App-layer rate limiting (inferred: expect reverse proxy); forgot-password; email verification beyond Google’s; no Stripe authz.

---

## 7. API Analysis (important endpoints)

Legend: Auth = session cookie; CSRF = mutating.

### Auth
| Method | Path | Auth | Purpose | FE use |
|--------|------|------|---------|--------|
| GET | `/api/auth/csrf` | No | CSRF token | Before POSTs |
| POST | `/api/auth/signup` | No+CSRF | Register | Signup |
| POST | `/api/auth/login` | No+CSRF | Login | Login |
| GET | `/api/auth/google` | No | Start Google | “Continue with Google” |
| GET | `/api/auth/google/callback` | No | Google return → code | Browser redirect |
| POST | `/api/auth/google/session` | No+CSRF | Exchange code | `/auth/complete` |
| GET | `/api/auth/me` | Yes | Current user | App bootstrap |
| POST | `/api/auth/logout` | Yes+CSRF | Logout | Sign out |

### LinkedIn / accounts
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/linkedin/connect` | Yes+CSRF | Auth URL |
| GET | `/api/linkedin/callback` | No | Save account tokens |
| GET | `/api/accounts` | Yes | List accounts |
| DELETE | `/api/accounts/{id}` | Yes+CSRF | Disconnect |

### Posts
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/posts` | List (+ optional LinkedIn sync) |
| POST | `/api/posts` | Draft / schedule / publish (multipart) |
| PATCH/DELETE | `/api/posts/{id}` | Update / delete |
| POST | `/api/posts/{id}/publish` | Publish now |
| GET | `.../analytics`, `.../comments` | LinkedIn engagement |
| POST | `.../comments` | Comment/reply |
| POST | `/api/posts/rewrite-ai` | AI rewrite |

### Agents / AI / other
| Method | Path | Purpose |
|--------|------|---------|
| GET/POST/PATCH/DELETE | `/api/agents...` | Catalog + prefs |
| POST | `/api/agents/{id}/run` | Run agent (sync) |
| GET | runs / library | History |
| POST | `.../calendar` | Posts → calendar |
| POST | `/api/assistant/chat` | SmartAgent |
| GET/POST | `/api/notifications...` | Inbox |
| GET/PATCH | `/api/settings...` | Prefs/profile |
| POST | `/api/settings/support` | Tickets |
| GET | `/api/usage/llm` | Usage summary |
| GET | `/api/config` | `{ pricing_enabled }` |
| GET | `/api/health/*` | Live/ready |

### Scheduler
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET/POST | `/api/cron/publish-due` | `CRON_SECRET` | Publish due posts |
| POST | `/run-once` | Same | Manual trigger |

---

## 8. Complete Feature List

**Major product features counted: 21 implemented + 4 partial.**

### Authentication (3)
1. Email signup/login  
2. Google sign-in (exchange flow)  
3. Session logout / cookie session  

### Social / content (9)
4. LinkedIn account connect/disconnect  
5. Rich post composer (text/media/article)  
6. Draft / schedule / publish now  
7. First comment on publish  
8. Calendar management  
9. Background scheduled publishing  
10. LinkedIn history sync  
11. Per-post analytics  
12. LinkedIn comments/replies  

### AI (5)
13. AI Content Planner (LangGraph)  
14. Schedule planner output to calendar  
15. Agent run library  
16. Rewrite with AI  
17. In-app Smart Assistant  

### Workspace (4)
18. Dashboard  
19. Notifications  
20. Settings (profile, theme, prefs)  
21. Help / support tickets  

### Partial (4) — not counted as complete product features
- Pricing page / billing tab (flag; no payments)  
- HR/Recruiting workspace (UI shells only)  
- Forgot password (mailto only)  
- Referral code (shown; no signup attribution)  

---

## 9. Feature-by-Feature User Flows (core)

### A. Google login
**User:** Click Continue with Google  
→ FE navigates to API `/api/auth/google`  
→ Google consent  
→ API callback stores user + one-time code, redirects `/auth/complete?code=`  
→ FE `POST /api/auth/google/session` (+ CSRF) sets Partitioned cookie  
→ Navigate dashboard; `/api/auth/me` succeeds  

**Layman:** Google proves who you are; the website then stores a secure login cookie that works across its two domains.

### B. Connect LinkedIn
**User:** Connect on Accounts  
→ `POST /api/linkedin/connect` → LinkedIn OAuth  
→ Public callback encrypts tokens into `accounts`  
→ Redirect FE with status query  

**Layman:** You grant Linker Post permission to post as you; keys are locked in the database.

### C. Schedule a post
**User:** Composer → schedule time → save  
→ `POST /api/posts` (`action=schedule`) → row `status=scheduled`  
→ Later scheduler loads account tokens → LinkedIn publish → `published`  

**Layman:** You pick a time; a background worker posts for you even if you’re offline.

### D. AI Content Planner
**User:** Run agent, answer follow-ups  
→ `POST /api/agents/{id}/run` → LangGraph (search → strategy → posts → schedule slots)  
→ Persist run; optional calendar materialization  

**Layman:** AI researches and drafts a dated content plan you can drop onto the calendar.

---

## 10. AI / LLM Features

| Capability | Stack | Notes |
|------------|-------|-------|
| Content Planner | LangGraph `StateGraph`, Gemini (default), tools search/crawl/media | Interactive follow-ups; structured plan; diversity/scheduling tools |
| Rewrite | `agents/rewrite_with_ai` | Direct LLM, not LangGraph |
| Assistant | `complete_structured` | Short help + deep links |
| Usage | `llm_usage_events` | Dashboard/API |
| Tracing | LangSmith optional | Config flags |
| Alt provider | Nemotron via `LLM_PROVIDER` | Optional |

**Registry:** Only `ai_content_planner` is executable. Custom agent DB rows without runners → run fails (422).

**Streaming:** Agent run is **synchronous HTTP** (long `maxDuration` on Vercel), not SSE streaming to the client.

**Cost:** Soft-limit / cost knobs in config; usage recorded — enforce carefully in ops.

---

## 11. Third-Party Integrations

| Service | Why | Auth | Failure behavior |
|---------|-----|------|------------------|
| Google OAuth | Login | OAuth code | Error redirect to login |
| LinkedIn OAuth + API | Connect & publish | OAuth + Bearer | Public error codes; posts → `failed` |
| Gemini / Nemotron | AI | API keys | Humanized errors; run failed |
| DuckDuckGo / CSE / YouTube | Planner research | Keys / none | Weaker sources / fewer posts |
| LangSmith | Trace AI | API key | Optional |
| Vercel Cron | Trigger scheduler | `CRON_SECRET` | 401 if misconfigured |
| Support email | Contact | mailto | Client email app |

No Stripe, SendGrid, S3, or Slack found in backend services.

---

## 12. Background Processing

| Mechanism | Trigger | Worker | Result |
|-----------|---------|--------|--------|
| Local poll loop | Every N seconds | `scheduler.worker` | Publishes due posts |
| Vercel Cron | **`0 0 * * *` daily** in `vercel.scheduler.json` | Same publish path | Due posts at midnight UTC |

**Important:** Cron is **daily**, not every minute (comment in scheduler may imply more frequent). For near-real-time schedules in prod, cron schedule must be tightened or use an always-on poll host.

No Celery/Redis/queues. Agent cadence fields are **stored but not executed** by any worker.

---

## 13. Deployment & Infrastructure

| Layer | Hosting |
|-------|---------|
| FE | Vercel project `linkerpost` |
| API | Vercel `linkerpost-api` (`vercel.json`, `LINKERPOST_SERVICE=api`) |
| Scheduler | Vercel `linkerpost-scheduler` (`vercel.scheduler.json`) |
| DB | External Postgres (`DATABASE_URL`) |
| Region | `bom1` (Mumbai) near BLR DB |

Env: `be/.env` / `.env.prod`, `fe/.env` / `.env.prod` (`VITE_API_URL`, flags, `VITE_SUPPORT_EMAIL`). Secrets must be set in Vercel (cookies `SameSite=none`, `COOKIE_SECURE`, Google/LinkedIn redirect URIs, `CRON_SECRET`).

Path to prod: build → `vercel deploy --prod` per project (see `be/deploy.md`).

---

## 14. Project Structure (important)

| Path | Role |
|------|------|
| `fe/src/routes/*` | Pages |
| `fe/src/lib/api.ts` | API client |
| `fe/src/lib/auth.tsx` | Route guards |
| `fe/src/components/app/*` | Authenticated chrome |
| `be/app/api/routes/*` | HTTP API |
| `be/app/services/*` | Integrations & publish |
| `be/agents/*` | AI |
| `be/scheduler/*` | Due-post publisher |
| `be/migrations/*` | Schema history |

Ignore generated `routeTree.gen.ts`, `node_modules`, `.vercel/output`, `__pycache__`.

---

## 15. Complete End-to-End Architecture

```
                    ┌─────────────────────┐
                    │  User (browser)     │
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼                               ▼
   linkerpost.vercel.app              Google / LinkedIn
   (React / TanStack)                 (OAuth consent)
              │
              │ cookies + CSRF
              ▼
   linkerpost-api.vercel.app
   (FastAPI)
        │
        ├──── PostgreSQL (users, accounts, posts, agents, …)
        ├──── LinkedIn Publishing API
        ├──── Gemini / Nemotron
        └──── LangSmith (optional)

   linkerpost-scheduler (Vercel Cron / poll)
        │
        └──── DB due posts → decrypt LinkedIn token → publish
```

---

## 16. Business Perspective (non-technical)

**What it does:** Helps people run LinkedIn content without living in LinkedIn’s native composer — plan, write, schedule, and auto-post, with AI help.

**Users can:** Sign up, connect LinkedIn, publish or schedule posts, generate multi-post plans with AI, rewrite drafts, see a calendar and basic engagement, get in-app alerts, change settings, contact support.

**Main journeys:** Sign up → connect LinkedIn → post or run planner → calendar fills → posts go out automatically.

**Value:** Consistency + time saved + AI research/drafting + one workspace for LinkedIn ops.

**Not ready as product:** Paid billing, real recruiting ATS, password reset, company-page-first workflows, automatic agent cron runs.

---

## 17. Important Technical Details for Maintainers

### Patterns
Cookie session SPA; service layer for LinkedIn publish shared by API + scheduler; agent registry; LangGraph for planner; OAuth state table for CSRF and Google session handoff.

### Watchouts
1. **Cross-site cookies** — Google must use `/auth/complete` exchange; don’t Set-Cookie on API redirect.  
2. **Scheduler cron daily** vs user expectation of minute-level schedules.  
3. **Agent cadence** fields unused by workers.  
4. **Custom agents** not runnable.  
5. **Sync agent runs** can hit Vercel timeout (300s).  
6. **Person URN only** publishing — org pages not first-class.  
7. **HR/Pricing** FE flags without BE.  
8. **Referral** unused on signup.  
9. Encryption keys / JWT secrets rotation needs ops discipline.  
10. Media in Postgres — fine for MVP; scale risk.

### Implemented vs partial vs missing
See sections 8 and 10–12. Do not treat recruiting, Stripe, or agent auto-run as shipped.

---

## 18. Final Summary

### Application Summary
Linker Post is a LinkedIn content control center: auth, LinkedIn OAuth accounts, compose/schedule/publish, AI content planning & rewrite, calendar, notifications, and a separate scheduler that publishes due posts with stored LinkedIn tokens.

### Feature Count
**21 major implemented features** (auth 3 + content/social 9 + AI 5 + workspace 4), plus **4 partial** surfaces (pricing, HR/recruiting, forgot password, referrals).

### Technology Summary
- **FE:** React 19, Vite, TanStack Router/Start, Tailwind, shadcn, Quill  
- **BE:** FastAPI, SQLAlchemy, Alembic, PyJWT, Argon2, Fernet  
- **DB:** PostgreSQL  
- **AI:** LangGraph, Gemini (+ optional Nemotron), LangSmith  
- **Integrations:** Google OAuth, LinkedIn OAuth/API  
- **Cloud:** Vercel (FE + API + scheduler), external Postgres  

### Complete User Journey
Open site → sign up/in (email or Google) → onboard → connect LinkedIn → create or AI-plan posts → schedule → scheduler publishes → review calendar/analytics → manage settings/support.

### Architecture Summary
Browser talks to FastAPI with credentialed cookies; API owns users, encrypted LinkedIn credentials, posts, and AI runs in Postgres; LinkedIn and LLMs are called from the API; a separate scheduler process/cron publishes due posts without user sessions, using each post’s LinkedIn account tokens.