from cryptography.fernet import Fernet, InvalidToken, MultiFernet


class TokenDecryptionError(ValueError):
    pass


class TokenCipher:
    """Encrypt provider credentials, with first-key encryption and multi-key rotation."""

    def __init__(self, keys: list[str]) -> None:
        if not keys:
            raise ValueError("At least one token encryption key is required")
        try:
            self._fernet = MultiFernet([Fernet(key.encode()) for key in keys])
        except (TypeError, ValueError) as exc:
            raise ValueError("LinkedIn token encryption keys must be valid Fernet keys") from exc

    def encrypt(self, token: str) -> str:
        encrypted = self._fernet.encrypt(token.encode())
        return encrypted.decode()

    def decrypt(self, encrypted_token: str | None) -> str:
        if not encrypted_token:
            raise TokenDecryptionError("No stored access token to decrypt")
        try:
            decrypted = self._fernet.decrypt(encrypted_token.encode())
            return decrypted.decode()
        except (InvalidToken, TypeError, AttributeError) as exc:
            raise TokenDecryptionError("Unable to decrypt provider token") from exc
