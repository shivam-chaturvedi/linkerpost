import asyncio
from dataclasses import dataclass
import logging
from urllib.parse import quote, urlparse

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)

POSTS_URL = "https://api.linkedin.com/rest/posts"
IMAGES_URL = "https://api.linkedin.com/rest/images?action=initializeUpload"
VIDEOS_INITIALIZE_URL = "https://api.linkedin.com/rest/videos?action=initializeUpload"
VIDEOS_FINALIZE_URL = "https://api.linkedin.com/rest/videos?action=finalizeUpload"
DOCUMENTS_URL = "https://api.linkedin.com/rest/documents?action=initializeUpload"
SOCIAL_ACTIONS_URL = "https://api.linkedin.com/rest/socialActions"


class LinkedInPublishError(RuntimeError):
    def __init__(self, message: str, stage: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.public_message = message
        self.stage = stage
        self.status_code = status_code


@dataclass(frozen=True)
class LinkedInPublishResult:
    post_urn: str
    media_urn: str | None = None


@dataclass(frozen=True)
class LinkedInCommentResult:
    comment_id: str
    comment_urn: str | None = None


class LinkedInPublishingClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def _api_headers(self, access_token: str) -> dict[str, str]:
        return {
            "Accept": "application/json",
            "Authorization": f"Bearer {access_token}",
            "Linkedin-Version": self.settings.LINKEDIN_API_VERSION,
            "X-Restli-Protocol-Version": "2.0.0",
        }

    @staticmethod
    def _validate_upload_url(upload_url: str) -> None:
        parsed = urlparse(upload_url)
        hostname = (parsed.hostname or "").lower()
        allowed = hostname == "linkedin.com" or hostname.endswith(
            (".linkedin.com", ".linkedin-ei.com")
        )
        if parsed.scheme != "https" or not allowed:
            raise LinkedInPublishError("LinkedIn returned an unsafe upload URL", "media_upload")

    @staticmethod
    async def _require_success(
        response: httpx.Response,
        stage: str,
        expected_statuses: set[int],
    ) -> None:
        if response.status_code in expected_statuses:
            return
        raise LinkedInPublishError(
            f"LinkedIn rejected the {stage.replace('_', ' ')} request",
            stage,
            response.status_code,
        )

    async def _initialize_single_upload(
        self,
        client: httpx.AsyncClient,
        access_token: str,
        owner_urn: str,
        content_type: str,
    ) -> tuple[str, str]:
        endpoint = IMAGES_URL if content_type == "image" else DOCUMENTS_URL
        response = await client.post(
            endpoint,
            headers={**self._api_headers(access_token), "Content-Type": "application/json"},
            json={"initializeUploadRequest": {"owner": owner_urn}},
        )
        await self._require_success(response, f"{content_type}_initialization", {200})
        try:
            value = response.json()["value"]
            upload_url = str(value["uploadUrl"])
            media_urn = str(value[content_type])
        except (KeyError, TypeError, ValueError) as exc:
            raise LinkedInPublishError(
                "LinkedIn returned an invalid media initialization response",
                f"{content_type}_initialization",
            ) from exc
        self._validate_upload_url(upload_url)
        return upload_url, media_urn

    async def _upload_image_or_document(
        self,
        client: httpx.AsyncClient,
        access_token: str,
        owner_urn: str,
        content_type: str,
        media_bytes: bytes,
        media_mime: str,
    ) -> str:
        upload_url, media_urn = await self._initialize_single_upload(
            client, access_token, owner_urn, content_type
        )
        response = await client.put(
            upload_url,
            content=media_bytes,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": media_mime,
            },
        )
        await self._require_success(response, f"{content_type}_upload", {200, 201})
        return media_urn

    async def _upload_video(
        self,
        client: httpx.AsyncClient,
        access_token: str,
        owner_urn: str,
        media_bytes: bytes,
    ) -> str:
        response = await client.post(
            VIDEOS_INITIALIZE_URL,
            headers={**self._api_headers(access_token), "Content-Type": "application/json"},
            json={
                "initializeUploadRequest": {
                    "owner": owner_urn,
                    "fileSizeBytes": len(media_bytes),
                    "uploadCaptions": False,
                    "uploadThumbnail": False,
                }
            },
        )
        await self._require_success(response, "video_initialization", {200})
        try:
            value = response.json()["value"]
            video_urn = str(value["video"])
            upload_token = str(value.get("uploadToken", ""))
            instructions = value["uploadInstructions"]
        except (KeyError, TypeError, ValueError) as exc:
            raise LinkedInPublishError(
                "LinkedIn returned an invalid video initialization response",
                "video_initialization",
            ) from exc

        uploaded_parts: list[str] = []
        for instruction in sorted(instructions, key=lambda item: int(item["firstByte"])):
            try:
                first_byte = int(instruction["firstByte"])
                last_byte = int(instruction["lastByte"])
                upload_url = str(instruction["uploadUrl"])
            except (KeyError, TypeError, ValueError) as exc:
                raise LinkedInPublishError(
                    "LinkedIn returned invalid video upload instructions",
                    "video_initialization",
                ) from exc
            if first_byte < 0 or last_byte < first_byte or last_byte >= len(media_bytes):
                raise LinkedInPublishError(
                    "LinkedIn returned invalid video byte ranges", "video_initialization"
                )
            self._validate_upload_url(upload_url)
            upload_response = await client.put(
                upload_url,
                content=media_bytes[first_byte : last_byte + 1],
                headers={"Content-Type": "application/octet-stream"},
            )
            await self._require_success(upload_response, "video_upload", {200, 201})
            etag = upload_response.headers.get("etag", "").strip('"')
            if not etag:
                raise LinkedInPublishError(
                    "LinkedIn did not confirm a video upload part", "video_upload"
                )
            uploaded_parts.append(etag)

        finalize_response = await client.post(
            VIDEOS_FINALIZE_URL,
            headers={**self._api_headers(access_token), "Content-Type": "application/json"},
            json={
                "finalizeUploadRequest": {
                    "video": video_urn,
                    "uploadToken": upload_token,
                    "uploadedPartIds": uploaded_parts,
                }
            },
        )
        await self._require_success(finalize_response, "video_finalization", {200})
        return video_urn

    async def publish(
        self,
        *,
        access_token: str,
        owner_urn: str,
        commentary: str,
        content_type: str,
        media_bytes: bytes | None = None,
        media_mime: str | None = None,
        media_title: str | None = None,
        article_source: str | None = None,
        article_title: str | None = None,
        article_description: str | None = None,
    ) -> LinkedInPublishResult:
        media_urn: str | None = None
        timeout = httpx.Timeout(30.0, read=120.0, write=120.0)
        try:
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
                if content_type in {"image", "document"}:
                    if media_bytes is None or media_mime is None:
                        raise LinkedInPublishError("A media file is required", "media_validation")
                    media_urn = await self._upload_image_or_document(
                        client,
                        access_token,
                        owner_urn,
                        content_type,
                        media_bytes,
                        media_mime,
                    )
                elif content_type == "video":
                    if media_bytes is None:
                        raise LinkedInPublishError("A video file is required", "media_validation")
                    media_urn = await self._upload_video(
                        client, access_token, owner_urn, media_bytes
                    )

                payload: dict[str, object] = {
                    "author": owner_urn,
                    "commentary": commentary,
                    "visibility": "PUBLIC",
                    "distribution": {
                        "feedDistribution": "MAIN_FEED",
                        "targetEntities": [],
                        "thirdPartyDistributionChannels": [],
                    },
                    "lifecycleState": "PUBLISHED",
                    "isReshareDisabledByAuthor": False,
                }
                if media_urn:
                    media: dict[str, str] = {"id": media_urn}
                    if media_title:
                        media["title"] = media_title
                    payload["content"] = {"media": media}
                elif content_type == "article":
                    payload["content"] = {
                        "article": {
                            "source": article_source,
                            "title": article_title,
                            "description": article_description or "",
                        }
                    }

                response = await client.post(
                    POSTS_URL,
                    headers={
                        **self._api_headers(access_token),
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                await self._require_success(response, "post_publication", {201})
        except httpx.RequestError as exc:
            raise LinkedInPublishError(
                "LinkedIn could not be reached while publishing", "network"
            ) from exc

        post_urn = response.headers.get("x-restli-id")
        if not post_urn:
            raise LinkedInPublishError(
                "LinkedIn published without returning a post identifier", "post_publication"
            )
        return LinkedInPublishResult(post_urn=post_urn, media_urn=media_urn)

    async def create_first_comment(
        self,
        *,
        access_token: str,
        owner_urn: str,
        post_urn: str,
        text: str,
    ) -> LinkedInCommentResult:
        # Wait 1.5 seconds for LinkedIn graph indexing to settle after post creation
        await asyncio.sleep(1.5)

        encoded_post_urn = quote(post_urn, safe="")
        endpoint = f"{SOCIAL_ACTIONS_URL}/{encoded_post_urn}/comments"
        headers = {
            **self._api_headers(access_token),
            "Content-Type": "application/json",
        }
        payload = {
            "actor": owner_urn,
            "object": post_urn,
            "message": {"text": text},
        }

        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(30.0), follow_redirects=False
            ) as client:
                response = await client.post(endpoint, headers=headers, json=payload)
                if response.status_code in {400, 404}:
                    # Attempt fallback to /rest/comments
                    fallback_endpoint = "https://api.linkedin.com/rest/comments"
                    fallback_payload = {
                        "author": owner_urn,
                        "object": post_urn,
                        "message": {"text": text},
                    }
                    fallback_resp = await client.post(fallback_endpoint, headers=headers, json=fallback_payload)
                    if fallback_resp.status_code in {200, 201}:
                        response = fallback_resp

                if response.status_code not in {200, 201}:
                    err_msg = response.text[:255] or f"HTTP {response.status_code}"
                    logger.warning("LinkedIn first comment failed status=%s body=%s", response.status_code, err_msg)
                    raise LinkedInPublishError(
                        f"LinkedIn rejected the first comment: {err_msg}",
                        "first_comment_publication",
                        response.status_code,
                    )
        except httpx.RequestError as exc:
            raise LinkedInPublishError(
                "LinkedIn could not be reached while adding the first comment",
                "first_comment_network",
            ) from exc

        comment_id = response.headers.get("x-restli-id") or response.headers.get("x-linkedin-id")
        comment_urn: str | None = response.headers.get("x-resourceidentity-urn")
        try:
            body = response.json()
            if isinstance(body, dict):
                if not comment_id and body.get("id") is not None:
                    comment_id = str(body["id"])
                if body.get("commentUrn") is not None:
                    comment_urn = str(body["commentUrn"])
                elif comment_id and not comment_urn:
                    comment_urn = f"urn:li:comment:({post_urn},{comment_id})"
        except (TypeError, ValueError):
            pass

        if not comment_id:
            comment_id = f"comment_{int(asyncio.get_event_loop().time())}"

        return LinkedInCommentResult(comment_id=comment_id, comment_urn=comment_urn)

    async def delete_post(
        self,
        *,
        access_token: str,
        post_urn: str,
    ) -> None:
        encoded_post_urn = quote(post_urn, safe="")
        endpoint = f"{POSTS_URL}/{encoded_post_urn}"
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(30.0), follow_redirects=False
            ) as client:
                response = await client.delete(
                    endpoint,
                    headers=self._api_headers(access_token),
                )
                await self._require_success(response, "post_deletion", {200, 204, 404})
        except httpx.RequestError as exc:
            raise LinkedInPublishError(
                "LinkedIn could not be reached while deleting the post",
                "post_deletion_network",
            ) from exc

    async def get_post_analytics(
        self,
        *,
        access_token: str,
        post_urn: str,
    ) -> dict[str, int]:
        encoded_post_urn = quote(post_urn, safe="")
        endpoint = f"{SOCIAL_ACTIONS_URL}/{encoded_post_urn}"
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(15.0), follow_redirects=False
            ) as client:
                response = await client.get(
                    endpoint,
                    headers=self._api_headers(access_token),
                )
                if response.status_code == 200:
                    data = response.json()
                    likes_summary = data.get("likesSummary", {})
                    comments_summary = data.get("commentsSummary", {})
                    return {
                        "likes_count": likes_summary.get("totalLikes", likes_summary.get("aggregatedTotalLikes", 0)),
                        "comments_count": comments_summary.get("totalComments", comments_summary.get("aggregatedTotalComments", 0)),
                        "reposts_count": data.get("repostsSummary", {}).get("totalReposts", 0),
                        "impressions_count": data.get("impressionSummary", {}).get("totalImpressions", 0),
                    }
        except Exception as exc:
            logger.warning("Could not fetch LinkedIn post analytics post_urn=%s exc=%s", post_urn, exc)
        return {"likes_count": 0, "comments_count": 0, "reposts_count": 0, "impressions_count": 0}

    async def get_post_comments(
        self,
        *,
        access_token: str,
        post_urn: str,
    ) -> list[dict[str, object]]:
        encoded_post_urn = quote(post_urn, safe="")
        endpoint = f"{SOCIAL_ACTIONS_URL}/{encoded_post_urn}/comments"
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(15.0), follow_redirects=False
            ) as client:
                response = await client.get(
                    endpoint,
                    headers=self._api_headers(access_token),
                )
                if response.status_code == 200:
                    data = response.json()
                    elements = data.get("elements", [])
                    results = []
                    for item in elements:
                        comment_id = str(item.get("$URN") or item.get("id") or item.get("object") or "")
                        actor = str(item.get("actor") or item.get("author") or "")
                        message_obj = item.get("message", {})
                        text = message_obj.get("text", "") if isinstance(message_obj, dict) else str(message_obj)
                        created = item.get("created", {})
                        created_time = created.get("time") if isinstance(created, dict) else None
                        results.append({
                            "id": comment_id,
                            "actor_urn": actor,
                            "actor_name": actor.split(":")[-1] if actor else "LinkedIn User",
                            "text": text,
                            "created_at": created_time,
                        })
                    return results
        except Exception as exc:
            logger.warning("Could not fetch LinkedIn post comments post_urn=%s exc=%s", post_urn, exc)
        return []

    async def fetch_member_posts(
        self,
        *,
        access_token: str,
        owner_urn: str,
    ) -> list[dict[str, object]]:
        encoded_owner = quote(owner_urn, safe="")
        endpoint = f"{POSTS_URL}?q=author&author={encoded_owner}&count=50"
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(20.0), follow_redirects=False
            ) as client:
                response = await client.get(
                    endpoint,
                    headers=self._api_headers(access_token),
                )
                if response.status_code == 200:
                    data = response.json()
                    elements = data.get("elements", [])
                    results = []
                    for item in elements:
                        post_urn = item.get("id") or item.get("postUrn") or item.get("urn")
                        commentary = item.get("commentary") or ""
                        created_at_ms = item.get("publishedAt") or item.get("createdAt")
                        if post_urn:
                            results.append({
                                "post_urn": str(post_urn),
                                "commentary": str(commentary),
                                "published_at": created_at_ms,
                            })
                    return results
        except Exception as exc:
            logger.warning("Could not fetch member posts from LinkedIn owner_urn=%s exc=%s", owner_urn, exc)
        return []

