import secrets
from urllib.parse import parse_qs, urlparse

from cryptography.fernet import Fernet

from app.core.config import Settings
from app.core.token_encryption import TokenCipher
from app.schemas.linkedin import LinkedInUserInfo
from app.services.linkedin import AUTHORIZATION_URL, LinkedInClient


def linkedin_settings() -> Settings:
    return Settings(
        _env_file=None,
        APP_ENV="test",
        DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost/linkerpost_test",
        JWT_SECRET_KEY=secrets.token_urlsafe(48),
        LINKEDIN_CLIENT_ID="client-id",
        LINKEDIN_CLIENT_SECRET=secrets.token_urlsafe(32),
        LINKEDIN_REDIRECT_URI="https://api.example.com/api/linkedin/callback",
        LINKEDIN_TOKEN_ENCRYPTION_KEYS=Fernet.generate_key().decode(),
    )


def test_provider_tokens_are_encrypted_and_support_key_rotation() -> None:
    old_key = Fernet.generate_key().decode()
    new_key = Fernet.generate_key().decode()
    encrypted_with_old_key = TokenCipher([old_key]).encrypt("linkedin-access-token")

    assert "linkedin-access-token" not in encrypted_with_old_key
    decrypted = TokenCipher([new_key, old_key]).decrypt(encrypted_with_old_key)
    assert decrypted == "linkedin-access-token"


def test_linkedin_authorization_url_contains_state_redirect_and_required_scopes() -> None:
    settings = linkedin_settings()
    raw_state = secrets.token_urlsafe(48)
    authorization_url = LinkedInClient(settings).authorization_url(raw_state)
    parsed = urlparse(authorization_url)
    query = parse_qs(parsed.query)

    assert f"{parsed.scheme}://{parsed.netloc}{parsed.path}" == AUTHORIZATION_URL
    assert query["state"] == [raw_state]
    assert query["redirect_uri"] == [settings.LINKEDIN_REDIRECT_URI]
    assert set(query["scope"][0].split(" ")) == set(settings.linkedin_scopes)


def test_linkedin_profile_accepts_oidc_and_legacy_locale_shapes() -> None:
    common = {
        "sub": "member-id",
        "name": "LinkedIn Member",
        "given_name": "LinkedIn",
        "family_name": "Member",
        "picture": "https://media.licdn.com/profile.jpg",
        "email": "member@example.com",
        "email_verified": True,
    }
    oidc_profile = LinkedInUserInfo.model_validate({**common, "locale": "en-US"})
    legacy_profile = LinkedInUserInfo.model_validate(
        {**common, "locale": {"country": "US", "language": "en"}}
    )

    assert oidc_profile.locale == "en-US"
    assert legacy_profile.locale == {"country": "US", "language": "en"}
