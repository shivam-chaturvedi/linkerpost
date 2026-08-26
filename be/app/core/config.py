import re
from functools import lru_cache
from typing import Literal

from cryptography.fernet import Fernet
from pydantic import SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    APP_ENV: Literal["development", "test", "staging", "production"] = "development"
    APP_NAME: str = "Linker Post API"
    API_PREFIX: str = "/api"
    # Which ASGI app be/main.py loads on Vercel: api | scheduler
    LINKERPOST_SERVICE: Literal["api", "scheduler"] = "api"
    DATABASE_URL: str = "postgresql+asyncpg://shivam@localhost:5432/linkerpost"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    JWT_SECRET_KEY: SecretStr = SecretStr(
        "dev-only-7c8f9a21d64e43c68d69ab32802e4f57-change-in-production"
    )
    JWT_ALGORITHM: Literal["HS256", "HS384", "HS512"] = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    JWT_ISSUER: str = "linker-post-api"
    JWT_AUDIENCE: str = "linker-post-web"

    AUTH_COOKIE_NAME: str = "linker_post_access"
    CSRF_COOKIE_NAME: str = "linker_post_csrf"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"
    COOKIE_DOMAIN: str | None = None

    FRONTEND_ORIGINS: str = "http://localhost:8080"
    FRONTEND_APP_URL: str = "http://localhost:8080"
    TRUSTED_HOSTS: str = "localhost,127.0.0.1,testserver"
    FORCE_HTTPS: bool = False

    LINKEDIN_CLIENT_ID: str = ""
    LINKEDIN_CLIENT_SECRET: SecretStr = SecretStr("")
    LINKEDIN_REDIRECT_URI: str = "http://localhost:8000/api/linkedin/callback"
    LINKEDIN_SCOPES: str = "openid,profile,email,w_member_social"
    LINKEDIN_API_VERSION: str = "202607"
    LINKEDIN_TOKEN_ENCRYPTION_KEYS: str = ""
    LINKEDIN_OAUTH_STATE_TTL_MINUTES: int = 10

    # Google OAuth for app login/signup (JWT still issued by Linker Post).
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: SecretStr = SecretStr("")
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"
    GOOGLE_OAUTH_SCOPES: str = "openid,email,profile"
    GOOGLE_OAUTH_STATE_TTL_MINUTES: int = 10

    LLM_PROVIDER: str = "gemini"
    GEMINI_API_KEY: SecretStr = SecretStr("")
    GEMINI_MODEL: str = "gemini-2.0-flash"
    GEMINI_MAX_OUTPUT_TOKENS: int = 8192
    GEMINI_MAX_RETRIES: int = 1
    GEMINI_REQUESTS_PER_MINUTE: int = 5
    # NVIDIA NIM / Nemotron (OpenAI-compatible chat completions).
    NVIDIA_API_KEY: SecretStr = SecretStr("")
    NVIDIA_NIM_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    NEMOTRON_MODEL: str = "nvidia/nemotron-3.5-lightning-30b-a3b"
    NEMOTRON_MAX_OUTPUT_TOKENS: int = 8192
    NEMOTRON_MAX_RETRIES: int = 1
    NEMOTRON_REQUESTS_PER_MINUTE: int = 10
    NEMOTRON_TOP_P: float = 0.95
    # Nemotron 3.5 thinks by default; keep off for product responses.
    NEMOTRON_ENABLE_THINKING: bool = False
    # Soft cap on prompt character length sent to providers (very high by default).
    LLM_MAX_PROMPT_CHARS: int = 500_000
    # Estimated USD per 1M tokens (used for dashboard cost estimates).
    LLM_INPUT_COST_PER_1M: float = 0.10
    LLM_OUTPUT_COST_PER_1M: float = 0.40
    LLM_CACHED_INPUT_COST_PER_1M: float = 0.025
    # Soft monthly token budget for dashboard progress bars only (not a hard limit).
    LLM_MONTHLY_TOKEN_SOFT_LIMIT: int = 1_000_000
    LANGSMITH_TRACING: bool = False
    LANGSMITH_API_KEY: SecretStr = SecretStr("")
    LANGSMITH_PROJECT: str = "linkerpost"
    LANGSMITH_ENDPOINT: str = "https://api.smith.langchain.com"
    # Required when the API key is scoped to multiple LangSmith workspaces.
    LANGSMITH_WORKSPACE_ID: str = ""
    # When true, LangSmith runs only in development/staging (internal team observability).
    LANGSMITH_INTERNAL_ONLY: bool = True
    GOOGLE_CSE_API_KEY: SecretStr = SecretStr("")
    GOOGLE_CSE_CX: str = ""
    YOUTUBE_API_KEY: SecretStr = SecretStr("")
    CONTENT_PLANNER_MAX_SOURCES: int = 20
    CONTENT_PLANNER_MAX_POSTS: int = 30
    CONTENT_PLANNER_MAX_RETRIES: int = 1
    CONTENT_PLANNER_MAX_FOLLOW_UPS: int = 4
    CONTENT_PLANNER_CRAWL_TIMEOUT_SECONDS: int = 20
    CONTENT_PLANNER_SAVE_AS_DRAFTS: bool = False
    # 0 = posts may be similar; 10 = posts must be very different. Default 5.
    CONTENT_PLANNER_POST_DIVERSITY_SCORE: int = 5
    PRICING_ENABLED: bool = False

    # Background scheduler (be/scheduler) — polls due scheduled posts.
    SCHEDULER_POLL_INTERVAL_SECONDS: int = 60
    SCHEDULER_BATCH_SIZE: int = 20
    SCHEDULER_HOST: str = "0.0.0.0"
    SCHEDULER_PORT: int = 8001
    # Shared secret for Vercel Cron / manual /run-once (Authorization: Bearer …).
    CRON_SECRET: str = ""

    @field_validator("LANGSMITH_PROJECT")
    @classmethod
    def normalize_langsmith_project(cls, value: str) -> str:
        return value.strip() or "linkerpost"

    @field_validator("LANGSMITH_ENDPOINT")
    @classmethod
    def normalize_langsmith_endpoint(cls, value: str) -> str:
        return value.strip().rstrip("/") or "https://api.smith.langchain.com"

    @field_validator("LANGSMITH_WORKSPACE_ID", mode="before")
    @classmethod
    def blank_langsmith_workspace_is_empty(cls, value: object) -> object:
        if value is None or value == "":
            return ""
        return str(value).strip()

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_jwt_secret(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value()) < 32:
            raise ValueError("JWT_SECRET_KEY must contain at least 32 characters")
        return value

    @field_validator("JWT_ACCESS_TOKEN_EXPIRE_MINUTES")
    @classmethod
    def validate_expiry(cls, value: int) -> int:
        if value < 5 or value > 60 * 24 * 30:
            raise ValueError("JWT access-token expiry must be between 5 minutes and 30 days")
        return value

    @field_validator("COOKIE_DOMAIN", mode="before")
    @classmethod
    def blank_cookie_domain_is_none(cls, value: object) -> object:
        return None if value == "" else value

    @field_validator("API_PREFIX")
    @classmethod
    def normalize_api_prefix(cls, value: str) -> str:
        normalized = f"/{value.strip('/')}"
        if normalized == "/":
            raise ValueError("API_PREFIX cannot be the root path")
        return normalized

    @field_validator("DATABASE_URL")
    @classmethod
    def require_async_postgres(cls, value: str) -> str:
        from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

        normalized = value.strip()
        # Accept common provider URLs (Aiven/Supabase/Neon) and force asyncpg.
        if normalized.startswith("postgres://"):
            normalized = "postgresql+asyncpg://" + normalized.removeprefix("postgres://")
        elif normalized.startswith("postgresql://"):
            normalized = "postgresql+asyncpg://" + normalized.removeprefix("postgresql://")
        elif not normalized.startswith("postgresql+asyncpg://"):
            raise ValueError(
                "DATABASE_URL must use postgresql+asyncpg:// "
                "(or postgresql:// / postgres://, which are auto-converted)"
            )

        parts = urlsplit(normalized)
        query = dict(parse_qsl(parts.query, keep_blank_values=True))
        # asyncpg rejects libpq's sslmode=; map it to ssl=.
        sslmode = query.pop("sslmode", None)
        if sslmode and sslmode.lower() not in {"disable", "allow"}:
            query.setdefault("ssl", "require")
        normalized = urlunsplit(
            (parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment)
        )
        return normalized

    @field_validator("DATABASE_POOL_SIZE")
    @classmethod
    def validate_pool_size(cls, value: int) -> int:
        if value < 1 or value > 100:
            raise ValueError("DATABASE_POOL_SIZE must be between 1 and 100")
        return value

    @field_validator("DATABASE_MAX_OVERFLOW")
    @classmethod
    def validate_max_overflow(cls, value: int) -> int:
        if value < 0 or value > 100:
            raise ValueError("DATABASE_MAX_OVERFLOW must be between 0 and 100")
        return value

    @field_validator("FRONTEND_APP_URL", "LINKEDIN_REDIRECT_URI", "GOOGLE_REDIRECT_URI")
    @classmethod
    def normalize_url(cls, value: str) -> str:
        return value.strip().rstrip("/")

    @field_validator("LINKEDIN_OAUTH_STATE_TTL_MINUTES", "GOOGLE_OAUTH_STATE_TTL_MINUTES")
    @classmethod
    def validate_oauth_state_ttl(cls, value: int) -> int:
        if value < 5 or value > 30:
            raise ValueError("OAuth state TTL must be between 5 and 30 minutes")
        return value

    @field_validator("CONTENT_PLANNER_MAX_SOURCES")
    @classmethod
    def validate_planner_max_sources(cls, value: int) -> int:
        if value < 5 or value > 50:
            raise ValueError("CONTENT_PLANNER_MAX_SOURCES must be between 5 and 50")
        return value

    @field_validator("CONTENT_PLANNER_MAX_POSTS")
    @classmethod
    def validate_planner_max_posts(cls, value: int) -> int:
        if value < 1 or value > 60:
            raise ValueError("CONTENT_PLANNER_MAX_POSTS must be between 1 and 60")
        return value

    @field_validator("CONTENT_PLANNER_MAX_RETRIES")
    @classmethod
    def validate_planner_max_retries(cls, value: int) -> int:
        if value < 0 or value > 5:
            raise ValueError("CONTENT_PLANNER_MAX_RETRIES must be between 0 and 5")
        return value

    @field_validator("CONTENT_PLANNER_MAX_FOLLOW_UPS")
    @classmethod
    def validate_planner_max_follow_ups(cls, value: int) -> int:
        if value < 1 or value > 6:
            raise ValueError("CONTENT_PLANNER_MAX_FOLLOW_UPS must be between 1 and 6")
        return value

    @field_validator("CONTENT_PLANNER_POST_DIVERSITY_SCORE")
    @classmethod
    def validate_planner_post_diversity(cls, value: int) -> int:
        if value < 0 or value > 10:
            raise ValueError("CONTENT_PLANNER_POST_DIVERSITY_SCORE must be between 0 and 10")
        return value

    @field_validator("GEMINI_MAX_OUTPUT_TOKENS")
    @classmethod
    def validate_gemini_max_output_tokens(cls, value: int) -> int:
        if value < 256 or value > 65_536:
            raise ValueError("GEMINI_MAX_OUTPUT_TOKENS must be between 256 and 65536")
        return value

    @field_validator("LLM_MAX_PROMPT_CHARS")
    @classmethod
    def validate_llm_max_prompt_chars(cls, value: int) -> int:
        if value < 4_000 or value > 2_000_000:
            raise ValueError("LLM_MAX_PROMPT_CHARS must be between 4,000 and 2,000,000")
        return value

    @field_validator("GEMINI_MAX_RETRIES")
    @classmethod
    def validate_gemini_max_retries(cls, value: int) -> int:
        if value < 0 or value > 2:
            raise ValueError("GEMINI_MAX_RETRIES must be between 0 and 2")
        return value

    @field_validator("GEMINI_REQUESTS_PER_MINUTE")
    @classmethod
    def validate_gemini_rpm(cls, value: int) -> int:
        if value < 1 or value > 60:
            raise ValueError("GEMINI_REQUESTS_PER_MINUTE must be between 1 and 60")
        return value

    @field_validator("LLM_PROVIDER")
    @classmethod
    def validate_llm_provider(cls, value: str) -> str:
        normalized = value.strip().lower()
        allowed = {
            "gemini",
            "google",
            "google-genai",
            "nemotron",
            "nvidia",
            "nim",
            "nvidia-nim",
        }
        if normalized not in allowed:
            raise ValueError("LLM_PROVIDER must be 'gemini' or 'nemotron'")
        return normalized

    @field_validator("NVIDIA_NIM_BASE_URL")
    @classmethod
    def normalize_nvidia_nim_base_url(cls, value: str) -> str:
        return value.strip().rstrip("/") or "https://integrate.api.nvidia.com/v1"

    @field_validator("NEMOTRON_MODEL")
    @classmethod
    def normalize_nemotron_model(cls, value: str) -> str:
        return value.strip() or "nvidia/nemotron-3.5-lightning-30b-a3b"

    @field_validator("NEMOTRON_MAX_OUTPUT_TOKENS")
    @classmethod
    def validate_nemotron_max_output_tokens(cls, value: int) -> int:
        if value < 256 or value > 65_536:
            raise ValueError("NEMOTRON_MAX_OUTPUT_TOKENS must be between 256 and 65536")
        return value

    @field_validator("NEMOTRON_MAX_RETRIES")
    @classmethod
    def validate_nemotron_max_retries(cls, value: int) -> int:
        if value < 0 or value > 2:
            raise ValueError("NEMOTRON_MAX_RETRIES must be between 0 and 2")
        return value

    @field_validator("NEMOTRON_REQUESTS_PER_MINUTE")
    @classmethod
    def validate_nemotron_rpm(cls, value: int) -> int:
        if value < 1 or value > 60:
            raise ValueError("NEMOTRON_REQUESTS_PER_MINUTE must be between 1 and 60")
        return value

    @field_validator("NEMOTRON_TOP_P")
    @classmethod
    def validate_nemotron_top_p(cls, value: float) -> float:
        if value < 0 or value > 1:
            raise ValueError("NEMOTRON_TOP_P must be between 0 and 1")
        return value

    @field_validator(
        "LLM_INPUT_COST_PER_1M",
        "LLM_OUTPUT_COST_PER_1M",
        "LLM_CACHED_INPUT_COST_PER_1M",
    )
    @classmethod
    def validate_llm_cost_rates(cls, value: float) -> float:
        if value < 0 or value > 1000:
            raise ValueError("LLM cost rates must be between 0 and 1000 USD per 1M tokens")
        return value

    @field_validator("LLM_MONTHLY_TOKEN_SOFT_LIMIT")
    @classmethod
    def validate_monthly_token_soft_limit(cls, value: int) -> int:
        if value < 1000 or value > 1_000_000_000:
            raise ValueError("LLM_MONTHLY_TOKEN_SOFT_LIMIT must be between 1,000 and 1,000,000,000")
        return value

    @field_validator("CONTENT_PLANNER_CRAWL_TIMEOUT_SECONDS")
    @classmethod
    def validate_planner_crawl_timeout(cls, value: int) -> int:
        if value < 5 or value > 60:
            raise ValueError("CONTENT_PLANNER_CRAWL_TIMEOUT_SECONDS must be between 5 and 60")
        return value

    @field_validator("SCHEDULER_POLL_INTERVAL_SECONDS")
    @classmethod
    def validate_scheduler_poll_interval(cls, value: int) -> int:
        if value < 10 or value > 3600:
            raise ValueError("SCHEDULER_POLL_INTERVAL_SECONDS must be between 10 and 3600")
        return value

    @field_validator("SCHEDULER_BATCH_SIZE")
    @classmethod
    def validate_scheduler_batch_size(cls, value: int) -> int:
        if value < 1 or value > 200:
            raise ValueError("SCHEDULER_BATCH_SIZE must be between 1 and 200")
        return value

    @field_validator("LINKEDIN_API_VERSION")
    @classmethod
    def validate_linkedin_api_version(cls, value: str) -> str:
        if re.fullmatch(r"20\d{4}", value) is None:
            raise ValueError("LINKEDIN_API_VERSION must use YYYYMM format")
        return value

    @field_validator("LINKEDIN_TOKEN_ENCRYPTION_KEYS")
    @classmethod
    def validate_token_encryption_keys(cls, value: str) -> str:
        for key in (item.strip() for item in value.split(",") if item.strip()):
            try:
                Fernet(key.encode())
            except (TypeError, ValueError) as exc:
                message = "LinkedIn token encryption keys must be valid Fernet keys"
                raise ValueError(message) from exc
        return value

    @model_validator(mode="after")
    def validate_deployment_security(self) -> "Settings":
        if self.COOKIE_SAMESITE == "none" and not self.COOKIE_SECURE:
            raise ValueError("SameSite=None cookies must be secure")
        if "*" in self.frontend_origins:
            raise ValueError("Credentialed CORS cannot use a wildcard origin")
        required_linkedin_scopes = {"openid", "profile", "w_member_social"}
        if not required_linkedin_scopes.issubset(self.linkedin_scopes):
            raise ValueError("LinkedIn scopes must include openid, profile, and w_member_social")
        if self.is_production:
            if not self.COOKIE_SECURE or not self.FORCE_HTTPS:
                raise ValueError("Production requires COOKIE_SECURE and FORCE_HTTPS")
            if "*" in self.trusted_hosts:
                raise ValueError("Production TRUSTED_HOSTS cannot contain a wildcard")
            secret = self.JWT_SECRET_KEY.get_secret_value().lower()
            if secret.startswith(("dev-only", "replace-with")):
                raise ValueError("Production requires a unique JWT secret")
            if not self.linkedin_is_configured:
                raise ValueError("Production requires LinkedIn OAuth credentials and token keys")
            if not self.LINKEDIN_REDIRECT_URI.startswith("https://"):
                raise ValueError("Production LinkedIn redirect URI must use HTTPS")
            if not self.FRONTEND_APP_URL.startswith("https://"):
                raise ValueError("Production frontend app URL must use HTTPS")
            if self.google_is_configured and not self.GOOGLE_REDIRECT_URI.startswith("https://"):
                raise ValueError("Production Google redirect URI must use HTTPS")
        return self

    @property
    def frontend_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.FRONTEND_ORIGINS.split(",") if origin]

    @property
    def trusted_hosts(self) -> list[str]:
        return [host.strip() for host in self.TRUSTED_HOSTS.split(",") if host]

    @property
    def linkedin_scopes(self) -> list[str]:
        return [scope.strip() for scope in self.LINKEDIN_SCOPES.split(",") if scope.strip()]

    @property
    def google_oauth_scopes(self) -> list[str]:
        return [scope.strip() for scope in self.GOOGLE_OAUTH_SCOPES.split(",") if scope.strip()]

    @property
    def linkedin_token_encryption_keys(self) -> list[str]:
        return [
            key.strip() for key in self.LINKEDIN_TOKEN_ENCRYPTION_KEYS.split(",") if key.strip()
        ]

    @property
    def linkedin_is_configured(self) -> bool:
        return bool(
            self.LINKEDIN_CLIENT_ID
            and self.LINKEDIN_CLIENT_SECRET.get_secret_value()
            and self.linkedin_token_encryption_keys
        )

    @property
    def google_is_configured(self) -> bool:
        return bool(
            self.GOOGLE_CLIENT_ID.strip() and self.GOOGLE_CLIENT_SECRET.get_secret_value().strip()
        )

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def session_cookie_max_age_seconds(self) -> int:
        return self.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60

    def cookie_kwargs(self, *, httponly: bool = True) -> dict[str, object]:
        params: dict[str, object] = {
            "max_age": self.session_cookie_max_age_seconds,
            "httponly": httponly,
            "secure": self.COOKIE_SECURE or self.COOKIE_SAMESITE == "none",
            "samesite": self.COOKIE_SAMESITE,
            "path": "/",
        }
        if self.COOKIE_DOMAIN:
            params["domain"] = self.COOKIE_DOMAIN
        if self.COOKIE_SAMESITE == "none":
            # CHIPS for cross-site FE/API hosts. Applied via app.core.cookies (not
            # Starlette partitioned=) so Python < 3.14 / Vercel does not raise.
            params["partitioned"] = True
        return params


@lru_cache
def get_settings() -> Settings:
    return Settings()
