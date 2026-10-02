from datetime import timedelta

import jwt
import pytest

from app.core import security


def test_hash_and_verify_password():
    hashed = security.hash_password("Secreta123!")

    assert hashed != "Secreta123!"
    assert security.verify_password("Secreta123!", hashed)
    assert not security.verify_password("otra-clave", hashed)


def test_hash_is_salted():
    assert security.hash_password("Secreta123!") != security.hash_password("Secreta123!")


def test_access_token_roundtrip():
    payload = security.decode_token(security.create_access_token(42))

    assert payload["sub"] == "42"
    assert payload["type"] == "access"
    assert "exp" in payload and "iat" in payload


def test_refresh_token_roundtrip():
    payload = security.decode_token(security.create_refresh_token(42))

    assert payload["sub"] == "42"
    assert payload["type"] == "refresh"
    assert payload["exp"] > payload["iat"]


def test_decode_tampered_token_fails():
    token = security.create_access_token(1)

    with pytest.raises(jwt.InvalidTokenError):
        security.decode_token(token[:-2] + "xx")


def test_decode_expired_token_fails():
    token = security._create_token(1, "access", timedelta(seconds=-1))

    with pytest.raises(jwt.ExpiredSignatureError):
        security.decode_token(token)
