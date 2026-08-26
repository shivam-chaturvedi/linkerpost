import json
import secrets

import pytest
from fastapi import HTTPException

from app.api.routes.posts import _has_valid_signature, _validate_editor_delta
from app.core.config import Settings
from app.services.linkedin_publishing import LinkedInPublishError, LinkedInPublishingClient


class FakeResponse:
    def __init__(
        self,
        status_code: int,
        *,
        headers: dict[str, str] | None = None,
        body: dict[str, object] | None = None,
    ) -> None:
        self.status_code = status_code
        self.headers = headers or {}
        self._body = body or {}

    def json(self) -> dict[str, object]:
        return self._body


class FakeClient:
    def __init__(self) -> None:
        self.requests: list[tuple[str, str, dict[str, object]]] = []

    async def __aenter__(self) -> "FakeClient":
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None

    async def post(self, url: str, **kwargs: object) -> FakeResponse:
        self.requests.append(("POST", url, kwargs))
        if "/socialActions/" in url:
            return FakeResponse(
                201,
                headers={"x-restli-id": "456"},
                body={"commentUrn": "urn:li:comment:(urn:li:activity:987,456)"},
            )
        return FakeResponse(201, headers={"x-restli-id": "urn:li:share:123"})


def settings() -> Settings:
    return Settings(
        _env_file=None,
        APP_ENV="test",
        DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost/linkerpost_test",
        JWT_SECRET_KEY=secrets.token_urlsafe(48),
        LINKEDIN_API_VERSION="202607",
    )


def test_upload_url_validation_only_allows_linkedin_https() -> None:
    LinkedInPublishingClient._validate_upload_url("https://www.linkedin.com/dms-uploads/example")
    for unsafe_url in (
        "http://www.linkedin.com/upload",
        "https://linkedin.com.attacker.example/upload",
        "https://127.0.0.1/upload",
    ):
        with pytest.raises(LinkedInPublishError):
            LinkedInPublishingClient._validate_upload_url(unsafe_url)


def test_uploaded_file_signatures_are_checked() -> None:
    assert _has_valid_signature("image", "image/png", b"\x89PNG\r\n\x1a\ncontent")
    assert _has_valid_signature("video", "video/mp4", b"\x00\x00\x00\x18ftypmp42")
    assert _has_valid_signature("document", "application/pdf", b"%PDF-1.7")
    assert not _has_valid_signature("image", "image/png", b"not an image")


def test_quill_delta_is_validated_without_accepting_html_or_embeds() -> None:
    valid_delta = json.dumps(
        {
            "ops": [
                {"insert": "A real "},
                {"attributes": {"bold": True}, "insert": "post"},
                {"insert": "\n"},
            ]
        }
    )
    assert _validate_editor_delta(valid_delta, "A real post") == valid_delta

    with pytest.raises(HTTPException):
        _validate_editor_delta('{"ops":[{"insert":{"image":"https://example.com/x"}}]}', "")
    with pytest.raises(HTTPException):
        _validate_editor_delta(
            '{"ops":[{"attributes":{"link":"javascript:alert(1)"},"insert":"bad"}]}',
            "bad",
        )
    with pytest.raises(HTTPException):
        _validate_editor_delta('{"ops":[{"insert":"different"}]}', "post")


@pytest.mark.asyncio
async def test_text_post_uses_linkedin_posts_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_client = FakeClient()
    access_token = secrets.token_urlsafe(32)
    monkeypatch.setattr(
        "app.services.linkedin_publishing.httpx.AsyncClient",
        lambda **_kwargs: fake_client,
    )

    result = await LinkedInPublishingClient(settings()).publish(
        access_token=access_token,
        owner_urn="urn:li:person:member-123",
        commentary="A real post",
        content_type="text",
    )

    assert result.post_urn == "urn:li:share:123"
    method, url, request = fake_client.requests[0]
    assert method == "POST"
    assert url == "https://api.linkedin.com/rest/posts"
    assert request["json"] == {
        "author": "urn:li:person:member-123",
        "commentary": "A real post",
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": [],
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False,
    }
    headers = request["headers"]
    assert isinstance(headers, dict)
    assert headers["Linkedin-Version"] == "202607"
    assert headers["X-Restli-Protocol-Version"] == "2.0.0"


@pytest.mark.asyncio
async def test_first_comment_targets_created_post_urn(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_client = FakeClient()
    monkeypatch.setattr(
        "app.services.linkedin_publishing.httpx.AsyncClient",
        lambda **_kwargs: fake_client,
    )
    access_token = secrets.token_urlsafe(32)

    result = await LinkedInPublishingClient(settings()).create_first_comment(
        access_token=access_token,
        owner_urn="urn:li:person:member-123",
        post_urn="urn:li:share:987",
        text="https://example.com/details",
    )

    assert result.comment_id == "456"
    assert result.comment_urn == "urn:li:comment:(urn:li:activity:987,456)"
    method, url, request = fake_client.requests[0]
    assert method == "POST"
    assert url.endswith("/urn%3Ali%3Ashare%3A987/comments")
    assert request["json"] == {
        "actor": "urn:li:person:member-123",
        "object": "urn:li:share:987",
        "message": {"text": "https://example.com/details"},
    }


@pytest.mark.asyncio
async def test_delete_post_sends_delete_to_linkedin_rest_posts(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FakeDeleteClient:
        def __init__(self) -> None:
            self.requests: list[tuple[str, str, dict[str, object]]] = []

        async def __aenter__(self) -> "FakeDeleteClient":
            return self

        async def __aexit__(self, *_args: object) -> None:
            return None

        async def delete(self, url: str, **kwargs: object) -> FakeResponse:
            self.requests.append(("DELETE", url, kwargs))
            return FakeResponse(204)

    fake_client = FakeDeleteClient()
    monkeypatch.setattr(
        "app.services.linkedin_publishing.httpx.AsyncClient",
        lambda **_kwargs: fake_client,
    )

    await LinkedInPublishingClient(settings()).delete_post(
        access_token="test_token",
        post_urn="urn:li:share:123456",
    )

    assert len(fake_client.requests) == 1
    method, url, request = fake_client.requests[0]
    assert method == "DELETE"
    assert url == "https://api.linkedin.com/rest/posts/urn%3Ali%3Ashare%3A123456"
    headers = request["headers"]
    assert isinstance(headers, dict)
    assert headers["Linkedin-Version"] == "202607"
    assert headers["Authorization"] == "Bearer test_token"

