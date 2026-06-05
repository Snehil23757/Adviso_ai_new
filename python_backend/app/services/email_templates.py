from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from html import escape
from typing import Any

from app.config import get_settings


PRIMARY_BLUE = "#145DFF"
DEEP_BLUE = "#0B3FCC"
ACCENT_CYAN = "#20D7FF"
TEXT = "#071536"
MUTED = "#64748B"


@dataclass(frozen=True)
class RenderedEmail:
    subject: str
    html: str
    text: str
    from_address: str


def _app_url(path: str = "") -> str:
    base = get_settings().app_public_url.rstrip("/") or "https://adviso.ai"
    return f"{base}/{path.lstrip('/')}" if path else base


def _logo_url() -> str:
    configured = get_settings().email_logo_url.strip()
    if configured:
        return configured
    return _app_url("email/adviso-mark.png")


def _hero_image_url() -> str:
    configured = get_settings().email_hero_image_url.strip()
    if configured:
        return configured
    return _app_url("email/welcome-hero.jpg")


def _email_date(value: Any) -> str:
    if isinstance(value, datetime):
        return value.strftime("%d %B %Y, %H:%M UTC")
    if isinstance(value, str) and value:
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed.strftime("%d %B %Y, %H:%M UTC")
        except ValueError:
            return value
    return "Ready now"


def _base_layout(title: str, preheader: str, body: str, footer_note: str = "") -> str:
    logo = escape(_logo_url())
    support = escape(get_settings().email_reply_to or "support@adviso.ai")
    safe_preheader = escape(preheader)
    return f"""<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{escape(title)}</title>
  </head>
  <body style="margin:0;background:#F6F9FF;font-family:Inter,Segoe UI,Arial,sans-serif;color:{TEXT};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{safe_preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#F8FBFF 0%,#EEF5FF 100%);padding:32px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#FFFFFF;border:1px solid #DDE8FF;border-radius:28px;box-shadow:0 24px 70px rgba(20,93,255,0.13);overflow:hidden;">
            <tr>
              <td style="padding:30px 34px 18px;background:radial-gradient(circle at 50% 0%,rgba(32,215,255,0.20),transparent 42%),linear-gradient(135deg,#FFFFFF 0%,#F8FBFF 48%,#EEF5FF 100%);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center">
                      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                        <tr>
                          <td valign="middle" style="padding-right:10px;">
                            <img src="{logo}" width="42" height="42" alt="Adviso AI" style="display:block;border:0;border-radius:10px;" />
                          </td>
                          <td valign="middle" style="font-size:28px;line-height:34px;font-weight:900;letter-spacing:-0.03em;color:#06122D;">
                            Adviso <span style="color:{PRIMARY_BLUE};">AI</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 34px 36px;">
                {body}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 34px 30px;border-top:1px solid #E5EEFF;background:#FBFDFF;">
                <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:{MUTED};">Need help? Reply to this email or contact <a href="mailto:{support}" style="color:{PRIMARY_BLUE};font-weight:700;text-decoration:none;">{support}</a>.</p>
                <p style="margin:0;font-size:12px;line-height:18px;color:#94A3B8;">{escape(footer_note or "You are receiving this because an Adviso AI account action was requested for this email address.")}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


def _button(label: str, href: str) -> str:
    return f"""
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto 0;">
        <tr>
          <td style="border-radius:14px;background:linear-gradient(135deg,{PRIMARY_BLUE},{DEEP_BLUE});box-shadow:0 16px 34px rgba(20,93,255,0.28);">
            <a href="{escape(href)}" style="display:inline-block;padding:15px 28px;color:#FFFFFF;font-size:15px;font-weight:900;text-decoration:none;border-radius:14px;">{escape(label)} &rarr;</a>
          </td>
        </tr>
      </table>
    """


def _checklist(items: list[str]) -> str:
    rows = "".join(
        f"""
        <tr>
          <td width="28" valign="top" style="padding:7px 0;"><span style="display:inline-block;width:20px;height:20px;line-height:20px;border-radius:50%;background:{PRIMARY_BLUE};color:#FFFFFF;font-size:13px;text-align:center;font-weight:900;">&#10003;</span></td>
          <td style="padding:7px 0;font-size:15px;line-height:22px;color:#1E2A44;font-weight:700;">{escape(item)}</td>
        </tr>
        """
        for item in items
    )
    return f"""<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;padding:16px 18px;border:1px solid #DCE8FF;border-radius:18px;background:#F8FBFF;">{rows}</table>"""


def _metric_card(left: str, right: str) -> str:
    return f"""
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;border:1px solid #DCE8FF;border-radius:20px;background:linear-gradient(135deg,#FFFFFF,#F4F8FF);">
      <tr>
        <td width="50%" style="padding:22px;border-right:1px solid #DCE8FF;">
          {left}
        </td>
        <td width="50%" style="padding:22px;">
          {right}
        </td>
      </tr>
    </table>
    """


def _welcome_logo() -> str:
    logo = escape(_logo_url())
    return f"""
      <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto 18px;">
        <tr>
          <td valign="middle" style="padding-right:10px;">
            <img src="{logo}" width="34" height="34" alt="Adviso AI" style="display:block;border:0;border-radius:8px;" />
          </td>
          <td valign="middle" style="font-size:24px;line-height:30px;font-weight:900;letter-spacing:-0.04em;color:#06122D;">
            Adviso <span style="color:{PRIMARY_BLUE};">AI</span>
          </td>
        </tr>
      </table>
    """


def _welcome_status_card(icon: str, title: str, body: str, accent: str) -> str:
    return f"""
      <td width="33.33%" valign="top" style="padding:0 5px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="height:128px;border:1px solid #DDE8FF;border-radius:16px;background:#FFFFFF;box-shadow:0 16px 34px rgba(20,93,255,0.10);">
          <tr>
            <td style="position:relative;padding:22px 14px 16px;">
              <div style="margin:-34px 0 4px auto;width:22px;height:22px;line-height:22px;border-radius:50%;background:#16C957;color:#FFFFFF;text-align:center;font-size:13px;font-weight:900;box-shadow:0 8px 18px rgba(22,201,87,0.28);">&#10003;</div>
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td valign="top" style="padding-right:12px;">
                    <div style="width:54px;height:54px;line-height:54px;border-radius:50%;background:{accent};text-align:center;color:#FFFFFF;font-size:25px;font-weight:900;box-shadow:0 14px 28px rgba(20,93,255,0.18);">{icon}</div>
                  </td>
                  <td valign="top">
                    <div style="font-size:16px;line-height:18px;font-weight:900;color:#071536;letter-spacing:-0.02em;">{escape(title)}</div>
                    <div style="margin-top:7px;font-size:11px;line-height:16px;font-weight:600;color:#42526E;">{escape(body)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    """


def _welcome_upgrade_panel(upgrade_url: str) -> str:
    safe_upgrade_url = escape(upgrade_url)
    return f"""
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:26px;border:1px solid #CFE0FF;border-radius:18px;background:linear-gradient(135deg,#FFFFFF 0%,#F3F8FF 55%,#EAF3FF 100%);overflow:hidden;">
        <tr>
          <td width="42%" valign="middle" style="padding:24px 20px;">
            <div style="font-size:14px;line-height:18px;font-weight:800;color:#64748B;">Upgrade anytime to</div>
            <div style="margin-top:8px;font-size:27px;line-height:31px;font-weight:900;letter-spacing:-0.04em;color:#071536;">Unlock more <span style="color:{PRIMARY_BLUE};">with Adviso AI</span> <span style="color:{PRIMARY_BLUE};">&#10022;</span></div>
            <a href="{safe_upgrade_url}" style="display:inline-block;margin-top:16px;padding:9px 14px;border-radius:999px;background:#EEF4FF;color:#071536;font-size:11px;font-weight:900;text-decoration:none;">Upgrade when you're ready</a>
          </td>
          <td width="28%" valign="middle" style="padding:24px 8px;border-left:1px solid #D8E6FF;">
            <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
              {''.join(
                f'''
                <tr>
                  <td width="26" style="padding:5px 0;"><span style="display:inline-block;width:18px;height:18px;line-height:18px;border-radius:6px;background:{color};color:#FFFFFF;text-align:center;font-size:11px;font-weight:900;">{icon}</span></td>
                  <td style="padding:5px 0;font-size:12px;line-height:16px;font-weight:800;color:#071536;">{label}</td>
                </tr>
                '''
                for icon, label, color in [
                    ("+", "Larger Datasets", "#3B82F6"),
                    ("~", "AI Forecasting", "#8B5CF6"),
                    ("#", "Advanced Insights", "#F59E0B"),
                    ("&", "Collaboration & Sharing", "#22C55E"),
                    ("*", "AI Reports & Automation", "#EC4899"),
                ]
              )}
            </table>
          </td>
          <td width="30%" valign="bottom" style="padding:22px 18px 18px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="height:128px;border-radius:18px;background:linear-gradient(145deg,#DBEAFE 0%,#EEF2FF 52%,#FFFFFF 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.9);">
              <tr>
                <td valign="bottom" align="center" style="padding:14px;">
                  <div style="height:74px;white-space:nowrap;">
                    <span style="display:inline-block;width:24px;height:48px;border-radius:8px;background:linear-gradient(180deg,#93C5FD,#2563EB);vertical-align:bottom;margin-right:6px;"></span>
                    <span style="display:inline-block;width:24px;height:72px;border-radius:8px;background:linear-gradient(180deg,#A78BFA,#4F46E5);vertical-align:bottom;margin-right:6px;"></span>
                    <span style="display:inline-block;width:24px;height:96px;border-radius:8px;background:linear-gradient(180deg,#22D3EE,#145DFF);vertical-align:bottom;"></span>
                  </div>
                  <a href="{safe_upgrade_url}" style="display:inline-block;margin-top:-5px;padding:9px 18px;border-radius:10px;background:linear-gradient(135deg,{PRIMARY_BLUE},{DEEP_BLUE});color:#FFFFFF;font-size:12px;font-weight:900;text-decoration:none;box-shadow:0 12px 26px rgba(20,93,255,0.25);">&#9819; Upgrade</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    """


def _welcome_email_html(title: str, preheader: str, launch_url: str, upgrade_url: str) -> str:
    logo = _welcome_logo()
    hero_image = escape(_hero_image_url())
    support = escape(get_settings().email_reply_to or "support@adviso.ai")
    safe_launch_url = escape(launch_url)
    safe_preheader = escape(preheader)
    return f"""<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{escape(title)}</title>
  </head>
  <body style="margin:0;background:#1F1F1F;font-family:Inter,Segoe UI,Arial,sans-serif;color:{TEXT};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{safe_preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#1F1F1F;padding:14px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#FFFFFF;border:1px solid #CFE0FF;border-radius:0;overflow:hidden;">
            <tr>
              <td style="padding:16px 20px 8px;">
                {logo}
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:16px;background:linear-gradient(135deg,#06114A 0%,#061B88 48%,#0B35E8 100%);overflow:hidden;">
                  <tr>
                    <td width="46%" valign="middle" style="padding:28px 0 28px 34px;">
                      <div style="font-size:28px;line-height:28px;">&#128075;</div>
                      <h1 style="margin:24px 0 0;font-size:38px;line-height:42px;font-weight:900;letter-spacing:-0.055em;color:#FFFFFF;">Welcome to<br /><span style="font-size:46px;line-height:50px;color:{ACCENT_CYAN};">Adviso AI</span></h1>
                      <p style="margin:13px 0 0;font-size:17px;line-height:25px;color:#FFFFFF;font-weight:500;">Your intelligent business workspace is ready.</p>
                      <div style="margin-top:22px;width:42px;height:4px;border-radius:999px;background:{PRIMARY_BLUE};"></div>
                    </td>
                    <td width="54%" valign="middle" align="right" style="padding:18px 18px 18px 0;">
                      <img src="{hero_image}" width="324" alt="Adviso AI Workspace" style="display:block;width:324px;max-width:100%;height:auto;border:0;border-radius:18px;box-shadow:0 18px 36px rgba(0,0,0,0.22);" />
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:30px;">
                  <tr>
                    {_welcome_status_card("&#10003;", "Workspace Initialized", "Your workspace is created and ready.", "linear-gradient(135deg,#4ADE80,#10B981)")}
                    {_welcome_status_card("&#10022;", "AI Models Activated", "Powerful AI models are now active.", "linear-gradient(135deg,#A78BFA,#7C3AED)")}
                    {_welcome_status_card("&#8679;", "Data Pipeline Ready", "You can upload and analyze your data.", "linear-gradient(135deg,#67E8F9,#2563EB)")}
                  </tr>
                </table>

                <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:22px auto 0;">
                  <tr>
                    <td style="border-radius:12px;background:linear-gradient(135deg,{PRIMARY_BLUE},{DEEP_BLUE});box-shadow:0 18px 34px rgba(20,93,255,0.32);">
                      <a href="{safe_launch_url}" style="display:inline-block;min-width:226px;padding:17px 28px;color:#FFFFFF;font-size:17px;line-height:20px;font-weight:900;text-align:center;text-decoration:none;border-radius:12px;">Launch Workspace&nbsp;&nbsp;&rarr;</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:18px 0 0;text-align:center;font-size:15px;line-height:20px;font-weight:700;font-style:italic;color:{PRIMARY_BLUE};">Let's build something amazing! &#128640; &#8599;</p>

                {_welcome_upgrade_panel(upgrade_url)}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:18px;background:linear-gradient(135deg,#F8FBFF 0%,#EEF6FF 100%);">
                  <tr>
                    <td width="78" align="center" style="padding:18px 0 18px 20px;">
                      <div style="width:48px;height:48px;line-height:48px;border-radius:50%;background:linear-gradient(135deg,{PRIMARY_BLUE},{DEEP_BLUE});color:#FFFFFF;text-align:center;font-size:24px;box-shadow:0 14px 28px rgba(20,93,255,0.25);">&#9993;</div>
                    </td>
                    <td style="padding:18px 8px;">
                      <p style="margin:0;font-size:13px;line-height:20px;font-weight:800;color:#071536;">Need help? Reply to this email or contact <a href="mailto:{support}" style="color:{PRIMARY_BLUE};font-weight:900;text-decoration:none;">{support}</a></p>
                      <p style="margin:6px 0 0;font-size:11px;line-height:17px;color:#64748B;">Adviso AI sends onboarding and account emails for your workspace.</p>
                    </td>
                    <td width="108" align="right" valign="bottom" style="padding:18px 18px 16px 0;">
                      <div style="width:76px;height:44px;border-radius:14px;background:linear-gradient(135deg,#DBEAFE,#FFFFFF);color:{PRIMARY_BLUE};font-size:23px;line-height:44px;text-align:center;">&#9993;<span style="display:inline-block;margin-left:-8px;width:18px;height:18px;line-height:18px;border-radius:50%;background:{PRIMARY_BLUE};color:#FFFFFF;font-size:11px;">&#10003;</span></div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


def _password_reset_email_html(reset_url: str) -> str:
    logo = _welcome_logo()
    support = escape(get_settings().email_reply_to or "support@adviso.ai")
    safe_reset_url = escape(reset_url)
    safe_preheader = "Use your secure Adviso AI password reset link."
    return f"""<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset your Adviso AI password</title>
  </head>
  <body style="margin:0;background:#1F1F1F;font-family:Inter,Segoe UI,Arial,sans-serif;color:{TEXT};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{safe_preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#1F1F1F;padding:14px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#FFFFFF;border:1px solid #CFE0FF;overflow:hidden;">
            <tr>
              <td style="padding:16px 20px 8px;">
                {logo}
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:16px;background:radial-gradient(circle at 82% 18%,rgba(32,215,255,0.40),transparent 26%),linear-gradient(135deg,#06114A 0%,#061B88 50%,#0B35E8 100%);overflow:hidden;">
                  <tr>
                    <td width="56%" valign="middle" style="padding:34px 0 34px 34px;">
                      <div style="display:inline-block;padding:7px 11px;border-radius:999px;background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.18);font-size:10px;line-height:12px;font-weight:900;letter-spacing:0.16em;color:#BFD7FF;">SECURE ACCOUNT RECOVERY</div>
                      <h1 style="margin:22px 0 0;font-size:40px;line-height:44px;font-weight:900;letter-spacing:-0.055em;color:#FFFFFF;">Reset your<br /><span style="color:{ACCENT_CYAN};">Adviso AI</span><br />password</h1>
                      <p style="margin:14px 0 0;font-size:16px;line-height:25px;color:#E5EEFF;font-weight:500;">We received a request to help you get back into your workspace securely.</p>
                      <div style="margin-top:22px;width:46px;height:4px;border-radius:999px;background:{ACCENT_CYAN};"></div>
                    </td>
                    <td width="44%" valign="middle" align="center" style="padding:24px 24px 24px 8px;">
                      <table role="presentation" width="210" cellspacing="0" cellpadding="0" style="border-radius:24px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);box-shadow:0 22px 45px rgba(0,0,0,0.24);">
                        <tr>
                          <td align="center" style="padding:28px 18px;">
                            <div style="width:82px;height:82px;line-height:82px;border-radius:26px;background:linear-gradient(135deg,{PRIMARY_BLUE},{ACCENT_CYAN});color:#FFFFFF;font-size:42px;font-weight:900;box-shadow:0 18px 38px rgba(20,93,255,0.34);">&#128274;</div>
                            <div style="margin-top:18px;font-size:12px;line-height:18px;font-weight:900;letter-spacing:0.12em;color:#DCEBFF;">ONE-TIME LINK</div>
                            <div style="margin:12px auto 0;width:132px;height:8px;border-radius:999px;background:rgba(255,255,255,0.22);"></div>
                            <div style="margin:8px auto 0;width:92px;height:8px;border-radius:999px;background:{ACCENT_CYAN};"></div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;">
                  <tr>
                    <td width="33.33%" valign="top" style="padding:0 5px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="height:112px;border:1px solid #DDE8FF;border-radius:16px;background:#FFFFFF;box-shadow:0 16px 34px rgba(20,93,255,0.10);">
                        <tr><td style="padding:20px 14px;"><div style="font-size:22px;color:{PRIMARY_BLUE};">&#10003;</div><div style="margin-top:10px;font-size:14px;font-weight:900;color:#071536;">Secure Link</div><div style="margin-top:6px;font-size:11px;line-height:16px;color:#42526E;">Generated by Firebase Authentication.</div></td></tr>
                      </table>
                    </td>
                    <td width="33.33%" valign="top" style="padding:0 5px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="height:112px;border:1px solid #DDE8FF;border-radius:16px;background:#FFFFFF;box-shadow:0 16px 34px rgba(20,93,255,0.10);">
                        <tr><td style="padding:20px 14px;"><div style="font-size:22px;color:{PRIMARY_BLUE};">&#9201;</div><div style="margin-top:10px;font-size:14px;font-weight:900;color:#071536;">Time Limited</div><div style="margin-top:6px;font-size:11px;line-height:16px;color:#42526E;">The reset link expires automatically.</div></td></tr>
                      </table>
                    </td>
                    <td width="33.33%" valign="top" style="padding:0 5px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="height:112px;border:1px solid #DDE8FF;border-radius:16px;background:#FFFFFF;box-shadow:0 16px 34px rgba(20,93,255,0.10);">
                        <tr><td style="padding:20px 14px;"><div style="font-size:22px;color:{PRIMARY_BLUE};">&#128737;</div><div style="margin-top:10px;font-size:14px;font-weight:900;color:#071536;">Protected</div><div style="margin-top:6px;font-size:11px;line-height:16px;color:#42526E;">Ignore this email if it was not you.</div></td></tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:28px auto 0;">
                  <tr>
                    <td style="border-radius:12px;background:linear-gradient(135deg,{PRIMARY_BLUE},{DEEP_BLUE});box-shadow:0 18px 34px rgba(20,93,255,0.32);">
                      <a href="{safe_reset_url}" style="display:inline-block;min-width:226px;padding:17px 28px;color:#FFFFFF;font-size:17px;line-height:20px;font-weight:900;text-align:center;text-decoration:none;border-radius:12px;">Reset Password&nbsp;&nbsp;&rarr;</a>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;border-radius:18px;background:#F8FBFF;border:1px solid #DDE8FF;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0;font-size:13px;line-height:21px;color:#42526E;">For your security, Adviso AI will never ask for your current password over email. If you did not request this reset, no action is needed.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:18px;background:linear-gradient(135deg,#F8FBFF 0%,#EEF6FF 100%);">
                  <tr>
                    <td width="78" align="center" style="padding:18px 0 18px 20px;">
                      <div style="width:48px;height:48px;line-height:48px;border-radius:50%;background:linear-gradient(135deg,{PRIMARY_BLUE},{DEEP_BLUE});color:#FFFFFF;text-align:center;font-size:24px;box-shadow:0 14px 28px rgba(20,93,255,0.25);">&#9993;</div>
                    </td>
                    <td style="padding:18px 8px;">
                      <p style="margin:0;font-size:13px;line-height:20px;font-weight:800;color:#071536;">Need help? Reply to this email or contact <a href="mailto:{support}" style="color:{PRIMARY_BLUE};font-weight:900;text-decoration:none;">{support}</a></p>
                      <p style="margin:6px 0 0;font-size:11px;line-height:17px;color:#64748B;">Adviso AI sends account security emails for your workspace.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


def render_email_template(template: str, context: dict[str, Any]) -> RenderedEmail:
    name = escape(str(context.get("full_name") or "there").split(" ")[0])
    plan = escape(str(context.get("plan_name") or "Free Workspace"))
    launch_url = str(context.get("launch_url") or _app_url("login"))
    upgrade_url = str(context.get("upgrade_url") or _app_url("pricing"))
    reset_url = str(context.get("reset_url") or _app_url("login"))
    verification_url = str(context.get("verification_url") or _app_url("login"))
    hero_image = escape(_hero_image_url())

    if template == "new_registration_admin":
        registrant_name = escape(str(context.get("full_name") or "Unknown user"))
        registrant_email = escape(str(context.get("email") or ""))
        provider = escape(str(context.get("auth_provider") or "password"))
        firebase_uid = escape(str(context.get("firebase_uid") or ""))
        registration_time = escape(_email_date(context.get("registration_time")))
        body = f"""
          <h1 style="margin:0;text-align:center;font-size:30px;line-height:36px;letter-spacing:-0.04em;color:#071536;">New Adviso AI registration</h1>
          <p style="margin:14px auto 0;max-width:520px;text-align:center;font-size:15px;line-height:24px;color:{MUTED};">A new user account was created and the registration workflow was queued.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;border:1px solid #DCE8FF;border-radius:18px;background:#F8FBFF;">
            <tr><td style="padding:14px 18px;font-size:13px;color:#64748B;border-bottom:1px solid #E5EEFF;">Name</td><td style="padding:14px 18px;font-size:14px;font-weight:900;color:#071536;border-bottom:1px solid #E5EEFF;">{registrant_name}</td></tr>
            <tr><td style="padding:14px 18px;font-size:13px;color:#64748B;border-bottom:1px solid #E5EEFF;">Email</td><td style="padding:14px 18px;font-size:14px;font-weight:900;color:#071536;border-bottom:1px solid #E5EEFF;">{registrant_email}</td></tr>
            <tr><td style="padding:14px 18px;font-size:13px;color:#64748B;border-bottom:1px solid #E5EEFF;">Provider</td><td style="padding:14px 18px;font-size:14px;font-weight:900;color:#071536;border-bottom:1px solid #E5EEFF;">{provider}</td></tr>
            <tr><td style="padding:14px 18px;font-size:13px;color:#64748B;border-bottom:1px solid #E5EEFF;">Firebase UID</td><td style="padding:14px 18px;font-size:12px;font-weight:800;color:#071536;border-bottom:1px solid #E5EEFF;">{firebase_uid}</td></tr>
            <tr><td style="padding:14px 18px;font-size:13px;color:#64748B;">Registered at</td><td style="padding:14px 18px;font-size:14px;font-weight:900;color:#071536;">{registration_time}</td></tr>
          </table>
          {_button("Open Adviso AI", _app_url("login"))}
        """
        return RenderedEmail(
            subject=f"New Adviso AI registration: {registrant_email}",
            html=_base_layout("New registration", "A new Adviso AI user registered.", body, "Internal Adviso AI registration notification."),
            text=(
                f"New Adviso AI registration\n"
                f"Name: {context.get('full_name') or 'Unknown user'}\n"
                f"Email: {context.get('email') or ''}\n"
                f"Provider: {context.get('auth_provider') or 'password'}\n"
                f"Firebase UID: {context.get('firebase_uid') or ''}\n"
                f"Registered at: {_email_date(context.get('registration_time'))}"
            ),
            from_address=get_settings().email_from_support,
        )

    if template == "password_reset":
        return RenderedEmail(
            subject="Reset your Adviso AI password",
            html=_password_reset_email_html(reset_url),
            text=(
                "Reset your Adviso AI password\n\n"
                "Use the secure one-time link below to choose a new password. "
                "If you did not request this, you can ignore this email.\n\n"
                f"{reset_url}"
            ),
            from_address=get_settings().email_from_support,
        )

    if template == "email_verification":
        body = f"""
          <h1 style="margin:0;text-align:center;font-size:34px;line-height:40px;letter-spacing:-0.04em;color:#071536;">Verify your Adviso AI email</h1>
          <p style="margin:16px auto 0;max-width:520px;text-align:center;font-size:16px;line-height:26px;color:{MUTED};">Hi {name}, confirm this email address to secure your Adviso AI account and keep account recovery protected.</p>
          {_checklist(["Secure workspace ownership", "Protected account recovery", "Trusted onboarding emails"])}
          {_button("Verify Email", verification_url)}
          <p style="margin:22px 0 0;text-align:center;font-size:13px;line-height:20px;color:{MUTED};">If you did not create an Adviso AI account, you can safely ignore this email.</p>
        """
        return RenderedEmail(
            subject="Verify your Adviso AI email",
            html=_base_layout("Verify your email", "Confirm your Adviso AI email address.", body),
            text=f"Verify your Adviso AI email: {verification_url}",
            from_address=get_settings().email_from_support,
        )

    if template == "upgrade_cta":
        body = f"""
          <h1 style="margin:0;text-align:center;font-size:34px;line-height:40px;letter-spacing:-0.04em;color:#071536;">Unlock deeper decision intelligence</h1>
          <p style="margin:16px auto 0;max-width:520px;text-align:center;font-size:16px;line-height:26px;color:{MUTED};">Move beyond starter limits with larger datasets, AI forecasting, advanced insights, and collaboration.</p>
          {_checklist(["Larger dataset capacity", "AI forecasting and simulations", "Advanced insights and exports", "Team collaboration"])}
          {_button("Upgrade Plan", upgrade_url)}
        """
        return RenderedEmail(
            subject="Get more from Adviso AI",
            html=_base_layout("Upgrade Adviso AI", "Unlock larger datasets and advanced AI workflows.", body),
            text=f"Upgrade Adviso AI: {upgrade_url}",
            from_address=get_settings().email_from_welcome,
        )

    if template == "trial_started":
        body = f"""
          <h1 style="margin:0;text-align:center;font-size:34px;line-height:40px;letter-spacing:-0.04em;color:#071536;">Your {plan} is active</h1>
          <p style="margin:16px auto 0;max-width:520px;text-align:center;font-size:16px;line-height:26px;color:{MUTED};">Your Adviso AI account is ready for datasets, AI chat, and decision workflows.</p>
          {_checklist(["Workspace created", "AI analytics enabled", "Dataset upload ready"])}
          {_button("Launch Workspace", launch_url)}
        """
        return RenderedEmail(
            subject="Your Adviso AI workspace is active",
            html=_base_layout("Workspace active", "Your Adviso AI workspace is ready.", body),
            text=f"Your Adviso AI workspace is active. Launch workspace: {launch_url}",
            from_address=get_settings().email_from_welcome,
        )

    if template == "registration_success":
        return RenderedEmail(
            subject="Welcome to Adviso AI",
            html=_welcome_email_html(
                "Welcome to Adviso AI",
                "Your intelligent business workspace is ready.",
                launch_url,
                upgrade_url,
            ),
            text=f"Welcome to Adviso AI. Your intelligent business workspace is ready. Launch workspace: {launch_url}",
            from_address=get_settings().email_from_welcome,
        )

    return RenderedEmail(
        subject="Welcome to Adviso AI",
        html=_welcome_email_html(
            "Welcome to Adviso AI",
            "Your intelligent business workspace is ready.",
            launch_url,
            upgrade_url,
        ),
        text=f"Welcome to Adviso AI. Your intelligent business workspace is ready. Launch workspace: {launch_url}",
        from_address=get_settings().email_from_welcome,
    )
