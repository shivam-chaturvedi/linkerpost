# Linker Post security status

Review date: 2026-08-16

## Implemented authentication architecture

Linker Post now has a FastAPI authentication service in `../be` backed by PostgreSQL. The React
frontend calls that service through the `VITE_API_URL` environment setting. Account passwords are
hashed with Argon2 and never returned by the API. Successful signup and login issue a short-lived
JWT in an `HttpOnly`, `SameSite` cookie. The frontend never reads or stores the JWT.

Every protected API request passes through cookie authentication middleware that verifies the JWT
signature, issuer, audience, expiry, token type, and required claims. Endpoint dependencies then
load the user from PostgreSQL and compare the database token version, so logout revokes previously
issued tokens. State-changing requests additionally require a CSRF header matching the server-issued
CSRF cookie.

The API also includes exact-origin credentialed CORS, trusted-host enforcement, configurable HTTPS
redirection, request IDs, generic error responses, security headers, async database dependency
injection, bounded connection pooling, liveness/readiness endpoints, and Alembic migrations.

## Verified evidence

- Backend Ruff format and lint: passed.
- Backend strict mypy: passed.
- Backend pytest: 3 tests passed for password hashing, JWT validation/tamper rejection, cookie
  authentication, and CSRF enforcement.
- Frontend typecheck, ESLint, and 6 security regression tests: passed.
- Frontend production build: passed.
- Alembic migration `20260816_0001` applied successfully to local database `linkerpost`.
- Live FastAPI/PostgreSQL flow: signup 201, session check 200, logout 200, revoked session 401,
  login 200, and session check 200.
- The temporary integration account was deleted after verification; no seed/mock user remains.
- Both `be/.env` and `fe/.env` are ignored by their local `.gitignore` files.

## Production configuration requirements

Before deployment, replace all development environment values. The backend validates that
production uses a unique JWT secret, secure cookies, forced HTTPS, exact trusted hosts, exact CORS
origins, and a `postgresql+asyncpg://` database URL. Apply migrations as a release step and provide
distributed edge rate limiting, centralized redacted logging, database backups, monitoring, and a
tested rollback procedure.

## Remaining product scope

Authentication and account persistence are implemented. Google authentication, password-reset
email delivery, LinkedIn OAuth, publishing, AI generation, billing, file processing, and persistence
for content/recruiting features are separate integrations and are not implemented by this auth
backend. They require their own server-side authorization, storage, provider-token, abuse-control,
and security reviews before activation.
