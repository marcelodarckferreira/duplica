import pytest

from app.print_fleet.credentials import (
    CredentialConfigurationError,
    CredentialDecryptionError,
    SnmpCredentialCipher,
)


def test_encrypts_community_with_randomized_ciphertext() -> None:
    cipher = SnmpCredentialCipher("chave-local-de-teste")

    first = cipher.encrypt("comunidade-somente-leitura")
    second = cipher.encrypt("comunidade-somente-leitura")

    assert first != second
    assert "comunidade-somente-leitura" not in first
    assert cipher.decrypt(first) == "comunidade-somente-leitura"
    assert cipher.decrypt(second) == "comunidade-somente-leitura"


def test_rejects_empty_community() -> None:
    with pytest.raises(ValueError, match="comunidade SNMP"):
        SnmpCredentialCipher("chave-local-de-teste").encrypt("  ")


def test_requires_configured_encryption_key() -> None:
    with pytest.raises(CredentialConfigurationError, match="não configurada"):
        SnmpCredentialCipher(None)


def test_wrong_key_raises_sanitized_error() -> None:
    ciphertext = SnmpCredentialCipher("primeira-chave").encrypt("segredo-que-nao-pode-vazar")

    with pytest.raises(CredentialDecryptionError) as error:
        SnmpCredentialCipher("segunda-chave").decrypt(ciphertext)

    assert "segredo-que-nao-pode-vazar" not in str(error.value)
    assert ciphertext not in str(error.value)

