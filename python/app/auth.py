import hmac
import hashlib
import json
import base64
import secrets
from app.config import SESSION_SECRET, SESSION_COOKIE, SESSION_MAX_AGE_DAYS

SESSION_MAX_AGE = SESSION_MAX_AGE_DAYS * 24 * 60 * 60


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt.encode("utf-8"),
        n=16384,
        r=8,
        p=1,
        dklen=64,
    )
    return f"{salt}:{key.hex()}"


def verify_password(password: str, stored: str) -> bool:
    parts = stored.split(":")
    if len(parts) != 2:
        return False
    salt, hash_hex = parts[0], parts[1]
    key = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt.encode("utf-8"),
        n=16384,
        r=8,
        p=1,
        dklen=64,
    )
    return hmac.compare_digest(key.hex(), hash_hex)


def sign_session(user_id: int, username: str) -> str:
    exp = __import__("time").time() + SESSION_MAX_AGE
    data = json.dumps({"userId": user_id, "username": username, "exp": exp})
    sig = hmac.new(SESSION_SECRET.encode(), data.encode(), hashlib.sha256).hexdigest()
    payload = json.dumps({"data": data, "sig": sig})
    return base64.urlsafe_b64encode(payload.encode()).decode().rstrip("=")


def verify_session(token: str) -> dict | None:
    try:
        padding = 4 - len(token) % 4
        if padding != 4:
            token += "=" * padding
        payload = json.loads(base64.urlsafe_b64decode(token).decode())
        data, sig = payload["data"], payload["sig"]
        expected = hmac.new(SESSION_SECRET.encode(), data.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        parsed = json.loads(data)
        if parsed["exp"] < __import__("time").time():
            return None
        return {"userId": parsed["userId"], "username": parsed["username"]}
    except Exception:
        return None


def get_session_from_cookie(cookie_header: str | None) -> dict | None:
    if not cookie_header:
        return None
    for part in cookie_header.split(";"):
        part = part.strip()
        if part.startswith(f"{SESSION_COOKIE}="):
            token = part.split("=", 1)[1].strip()
            return verify_session(token)
    return None


def get_session_cookie_name() -> str:
    return SESSION_COOKIE
