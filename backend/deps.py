import os
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import Request, HTTPException, WebSocket
from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "type": "refresh",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response, access_token: str, refresh_token: str):
    response.set_cookie("access_token", access_token, httponly=True, secure=True,
                        samesite="none", max_age=7 * 24 * 3600, path="/")
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=True,
                        samesite="none", max_age=30 * 24 * 3600, path="/")


def clear_auth_cookies(response):
    for key in ("access_token", "refresh_token", "session_token"):
        response.delete_cookie(key, path="/")


def sanitize_user(user: dict) -> dict:
    if not user:
        return user
    user = {k: v for k, v in user.items() if k not in ("_id", "password_hash")}
    return user


async def _user_from_jwt(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
        return user
    except Exception:
        return None


async def _user_from_session(session_token: str) -> Optional[dict]:
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        return None
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user


async def _resolve_user(request_cookies: dict, auth_header: str) -> Optional[dict]:
    session_token = request_cookies.get("session_token")
    if session_token:
        user = await _user_from_session(session_token)
        if user:
            return user
    access = request_cookies.get("access_token")
    if access:
        user = await _user_from_jwt(access)
        if user:
            return user
    bearer = None
    if auth_header and auth_header.startswith("Bearer "):
        bearer = auth_header[7:]
    if bearer:
        user = await _user_from_jwt(bearer)
        if user:
            return user
        user = await _user_from_session(bearer)
        if user:
            return user
    return None


async def get_current_user(request: Request) -> dict:
    user = await _resolve_user(request.cookies, request.headers.get("Authorization", ""))
    if not user:
        raise HTTPException(status_code=401, detail="Kimlik doğrulanamadı")
    return sanitize_user(user)


async def get_ws_user(websocket: WebSocket) -> Optional[dict]:
    cookies = websocket.cookies
    auth = websocket.headers.get("Authorization", "")
    token = websocket.query_params.get("token")
    if token and not auth:
        auth = f"Bearer {token}"
    user = await _resolve_user(cookies, auth)
    return sanitize_user(user) if user else None
