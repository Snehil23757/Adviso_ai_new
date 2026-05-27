import json
from functools import lru_cache
from typing import Any

import firebase_admin
from fastapi import Depends, HTTPException, Request
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from app.config import get_settings


@lru_cache
def firebase_app_ready() -> bool:
    settings = get_settings()
    if firebase_admin._apps:
        return True

    try:
        if settings.firebase_credentials_json.strip():
            cred = credentials.Certificate(json.loads(settings.firebase_credentials_json))
            options = {"projectId": settings.firebase_project_id} if settings.firebase_project_id else None
            firebase_admin.initialize_app(cred, options)
        elif settings.firebase_credentials_path.strip():
            cred = credentials.Certificate(settings.firebase_credentials_path)
            options = {"projectId": settings.firebase_project_id} if settings.firebase_project_id else None
            firebase_admin.initialize_app(cred, options)
        else:
            cred = credentials.ApplicationDefault()
            options = {"projectId": settings.firebase_project_id} if settings.firebase_project_id else None
            firebase_admin.initialize_app(cred, options)
        return True
    except Exception:
        return False


def bearer_token_from_request(request: Request) -> str:
    header = request.headers.get("authorization") or ""
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Authentication is required.")
    return token.strip()


def verify_firebase_claims(token: str) -> dict[str, Any]:
    if not firebase_app_ready():
        raise HTTPException(
            status_code=503,
            detail="Authentication verification is not configured on the backend.",
        )
    try:
        return firebase_auth.verify_id_token(token, check_revoked=True)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication session.") from exc


def get_firebase_claims(request: Request) -> dict[str, Any]:
    cached = getattr(request.state, "firebase_claims", None)
    if isinstance(cached, dict):
        return cached
    return verify_firebase_claims(bearer_token_from_request(request))


def generate_password_reset_link(email: str) -> str:
    if not firebase_app_ready():
        raise HTTPException(status_code=503, detail="Password reset is not configured on the backend.")
    try:
        return firebase_auth.generate_password_reset_link(email)
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Password reset could not be prepared.") from exc


def generate_email_verification_link(email: str) -> str:
    if not firebase_app_ready():
        raise HTTPException(status_code=503, detail="Email verification is not configured on the backend.")
    try:
        return firebase_auth.generate_email_verification_link(email)
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Email verification could not be prepared.") from exc


FirebaseClaims = Depends(get_firebase_claims)
