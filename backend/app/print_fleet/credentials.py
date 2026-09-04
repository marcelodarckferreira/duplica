import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken


class CredentialConfigurationError(RuntimeError):
    pass


class CredentialDecryptionError(RuntimeError):
    pass


class SnmpCredentialCipher:
    def __init__(self, secret: str | None) -> None:
        if not secret or not secret.strip():
            raise CredentialConfigurationError("Chave de criptografia SNMP não configurada.")
        derived_key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode("utf-8")).digest())
        self._fernet = Fernet(derived_key)

    def __repr__(self) -> str:
        return "SnmpCredentialCipher(configured=True)"

    def encrypt(self, community: str) -> str:
        normalized = community.strip()
        if not normalized:
            raise ValueError("Informe a comunidade SNMP.")
        return self._fernet.encrypt(normalized.encode("utf-8")).decode("ascii")

    def decrypt(self, ciphertext: str) -> str:
        try:
            return self._fernet.decrypt(ciphertext.encode("ascii")).decode("utf-8")
        except (InvalidToken, UnicodeError, ValueError) as exc:
            raise CredentialDecryptionError("Não foi possível acessar a credencial SNMP protegida.") from exc
