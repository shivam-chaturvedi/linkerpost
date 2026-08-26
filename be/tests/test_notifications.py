from uuid import uuid4

from app.schemas.notification import NotificationResponse, NotificationsResponse
from app.services.notifications import AUTO_PUBLISH_MODE


def test_auto_publish_constant() -> None:
    assert AUTO_PUBLISH_MODE == "Auto publish"


def test_notification_response_is_user_scoped() -> None:
    user_id = uuid4()
    other_user_id = uuid4()
    item = NotificationResponse(
        id=uuid4(),
        user_id=user_id,
        title="AI Content Planner finished",
        body="Your agent run completed and was saved to Library.",
        kind="agent_run",
        agent_id=uuid4(),
        run_id=uuid4(),
        read_at=None,
        created_at="2026-08-18T00:00:00Z",
        read=False,
    )
    assert item.user_id == user_id
    assert item.user_id != other_user_id
    payload = NotificationsResponse(notifications=[item], unread_count=1)
    assert payload.unread_count == 1
    assert all(row.user_id == user_id for row in payload.notifications)
