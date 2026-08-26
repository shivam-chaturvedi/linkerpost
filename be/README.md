# Linker Post API

FastAPI backend for Linker Post authentication and LinkedIn account connections. It uses async
SQLAlchemy, PostgreSQL, Alembic, Argon2 password hashing, JWT access cookies, token-version
revocation, double-submit CSRF protection, one-time OAuth state, and encrypted provider tokens.

## Local setup

1. Create PostgreSQL database `linkerpost` and update `.env` if your username, password, host, or
   port differs.
2. Create a virtual environment and install the project:

   ```bash
   python3.12 -m venv .venv
   .venv/bin/pip install -e '.[dev]'
   ```

3. Apply migrations and start the API:

   ```bash
   .venv/bin/alembic upgrade head
   .venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

The frontend runs on `http://localhost:8080`. API documentation is available at `/docs` in
development only.

## LinkedIn OAuth setup

1. In the LinkedIn Developer Portal, enable **Sign in with LinkedIn using OpenID Connect** and
   **Share on LinkedIn** for your application.
2. Add the exact HTTPS backend callback URL from `LINKEDIN_REDIRECT_URI` to the app's authorized
   redirect URLs. For local development, expose port 8000 through an HTTPS development tunnel and
   use that callback URL both in LinkedIn and `.env`.
3. Set `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` in `.env`.
4. Generate a token-encryption key and set `LINKEDIN_TOKEN_ENCRYPTION_KEYS`:

   ```bash
   .venv/bin/python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```

The first comma-separated encryption key is used for new credentials. Retain old keys after adding
a new first key so existing credentials can still be decrypted during key rotation. Access and
refresh tokens are never returned by the accounts API.

## Production

- Provide all settings through the environment; never deploy the checked-out development `.env`.
- Set a random `JWT_SECRET_KEY`, `COOKIE_SECURE=true`, `FORCE_HTTPS=true`, exact frontend origins,
  exact trusted hosts, LinkedIn credentials, a unique token-encryption key, and the remote
  `postgresql+asyncpg://` URL.
- Run `alembic upgrade head` as a release step before starting application instances.
- Put the API behind a TLS reverse proxy with request-size limits and distributed rate limiting.
- Sessions last 7 days by default (`JWT_ACCESS_TOKEN_EXPIRE_MINUTES=10080`). CSRF cookies use the
  same lifetime. CSRF remains required for mutating requests: the browser sends the CSRF cookie to
  the API host, and the frontend sends the matching `X-CSRF-Token` header from `GET /api/auth/csrf`.
- Frontend and API can be on different servers and domains. Leave `COOKIE_DOMAIN` empty so cookies
  are host-only on the API domain. Set exact `FRONTEND_ORIGINS` (no `*`). The frontend must call the
  API with `credentials: "include"`.
- If the frontend site and API site are different (for example `app.vercel.app` and
  `api.render.com`), set `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true`. Same-site subdomains such
  as `app.example.com` and `api.example.com` can keep `COOKIE_SAMESITE=lax`.
