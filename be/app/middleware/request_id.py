import re
from uuid import uuid4

from starlette.types import ASGIApp, Message, Receive, Scope, Send

REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{8,128}$")


class RequestIdMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = (
            dict(scope.get("headers", [])).get(b"x-request-id", b"").decode("ascii", "ignore")
        )
        request_id = incoming if REQUEST_ID_PATTERN.fullmatch(incoming) else uuid4().hex
        scope.setdefault("state", {})["request_id"] = request_id

        async def send_with_request_id(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode()))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_request_id)
