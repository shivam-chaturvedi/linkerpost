from app.schemas.settings import NotificationPrefs, PublicConfigResponse, UpdateProfileRequest


def test_pricing_defaults_to_off() -> None:
    assert PublicConfigResponse(pricing_enabled=False).pricing_enabled is False


def test_profile_and_notification_payloads() -> None:
    profile = UpdateProfileRequest(first_name="Ada", last_name="Lovelace")
    assert profile.first_name == "Ada"
    prefs = NotificationPrefs()
    assert prefs.post_failures is True
    assert prefs.publish_confirmations is False
