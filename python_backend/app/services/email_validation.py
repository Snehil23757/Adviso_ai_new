from __future__ import annotations

from functools import lru_cache
from typing import Any

import dns.resolver
from email_validator import EmailNotValidError, validate_email

from app.config import get_settings


DISPOSABLE_DOMAINS = {
    "10minutemail.com",
    "10minutemail.net",
    "20minutemail.com",
    "anonbox.net",
    "dispostable.com",
    "emailondeck.com",
    "fakeinbox.com",
    "getnada.com",
    "guerrillamail.com",
    "guerrillamail.net",
    "maildrop.cc",
    "mailinator.com",
    "mohmal.com",
    "mytemp.email",
    "sharklasers.com",
    "tempmail.com",
    "temp-mail.org",
    "throwawaymail.com",
    "trashmail.com",
    "yopmail.com",
}


def _csv_set(value: str) -> set[str]:
    return {item.strip().lower() for item in value.split(",") if item.strip()}


def _domain_from_email(email: str) -> str:
    return email.rsplit("@", 1)[-1].strip().lower()


def trusted_public_domains() -> set[str]:
    return _csv_set(get_settings().email_validation_allowed_public_domains)


def blocked_domains() -> set[str]:
    return DISPOSABLE_DOMAINS | _csv_set(get_settings().email_validation_blocked_domains)


@lru_cache(maxsize=2048)
def domain_has_mx(domain: str) -> bool:
    try:
        answers = dns.resolver.resolve(domain, "MX", lifetime=4.0)
        return bool(list(answers))
    except Exception:
        return False


def validate_registration_email(email: str) -> dict[str, Any]:
    raw_email = (email or "").strip()
    try:
        normalized = validate_email(raw_email, check_deliverability=False).normalized.lower()
    except EmailNotValidError as exc:
        return {
            "valid": False,
            "email": raw_email,
            "domain": "",
            "reason": "invalid_format",
            "message": str(exc),
        }

    domain = _domain_from_email(normalized)
    if not domain or domain in blocked_domains():
        return {
            "valid": False,
            "email": normalized,
            "domain": domain,
            "reason": "blocked_domain",
            "message": "Use a permanent business email or a trusted public email provider.",
        }

    has_mx = True
    if get_settings().email_validation_require_mx:
        has_mx = domain_has_mx(domain)
        if not has_mx:
            return {
                "valid": False,
                "email": normalized,
                "domain": domain,
                "reason": "missing_mx",
                "message": "This email domain does not appear to accept email.",
            }

    provider_type = "trusted_public" if domain in trusted_public_domains() else "company_domain"
    return {
        "valid": True,
        "email": normalized,
        "domain": domain,
        "reason": "",
        "message": "Email accepted.",
        "provider_type": provider_type,
        "has_mx": has_mx,
    }
