import os
import re
import ipaddress
import logging
import httpx
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

logger = logging.getLogger("fikirizm.mailer")

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Fikirizm Cloud")
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")
APP_URL = os.environ.get("APP_URL", "")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan(); scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str) -> str | None:
    if not EMAIL_KEY:
        logger.warning("EMERGENT_EMAIL_KEY not set; skipping email")
        return None
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if EMAIL_REPLY_TO:
        payload["contact_email"] = EMAIL_REPLY_TO
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{EMAIL_BASE_URL}/api/v1/email/send",
            headers={"X-Email-Key": EMAIL_KEY},
            json=payload,
        )
    resp.raise_for_status()
    return resp.json().get("id")


def _shell(inner: str) -> str:
    link = f"{APP_URL}/panel"
    return (
        '<table role="presentation" width="100%" style="background:#f4f4f5;padding:24px 0">'
        '<tr><td align="center">'
        '<table role="presentation" width="560" style="background:#ffffff;border:1px solid #e4e4e7;'
        'border-radius:12px;font-family:Arial,Helvetica,sans-serif;color:#18181b">'
        '<tr><td style="padding:24px 28px 8px">'
        '<span style="font-size:18px;font-weight:700;color:#4f46e5">Fikirizm Cloud</span></td></tr>'
        f'<tr><td style="padding:8px 28px 20px;font-size:14px;line-height:1.6">{inner}'
        f'<p style="margin-top:20px"><a href="{link}" '
        'style="background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;'
        'border-radius:8px;display:inline-block;font-weight:600">Uygulamayı aç</a></p>'
        '</td></tr>'
        '<tr><td style="padding:16px 28px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a">'
        'Bu e-posta Fikirizm Cloud tarafından gönderildi. Parola veya kart bilgisi hiçbir zaman '
        'e-posta ile istenmez.</td></tr>'
        '</table></td></tr></table>'
    )


async def email_task_assigned(to_email, to_name, actor_name, task_title, project_name=""):
    subject = f"Yeni görev atandı: {task_title}"
    inner = (
        f"<p>Merhaba {escape(to_name or '')},</p>"
        f"<p><strong>{escape(actor_name or '')}</strong> sizi "
        f"<strong>{escape(task_title or '')}</strong> görevine atadı"
        + (f" ({escape(project_name)} projesi)." if project_name else ".") + "</p>"
        "<p>Görevi görüntülemek için uygulamaya giriş yapın.</p>"
    )
    try:
        await send_email(to=to_email, subject=subject, html=_shell(inner))
    except Exception as e:
        logger.warning(f"task assign email failed: {e}")


async def email_project_added(to_email, to_name, actor_name, project_name):
    subject = f"Bir projeye eklendiniz: {project_name}"
    inner = (
        f"<p>Merhaba {escape(to_name or '')},</p>"
        f"<p><strong>{escape(actor_name or '')}</strong> sizi "
        f"<strong>{escape(project_name or '')}</strong> projesine ekledi.</p>"
        "<p>Projeye erişmek için uygulamaya giriş yapabilirsiniz.</p>"
    )
    try:
        await send_email(to=to_email, subject=subject, html=_shell(inner))
    except Exception as e:
        logger.warning(f"project add email failed: {e}")


async def email_invite(to_email, to_name, actor_name, invite_link, role_label):
    subject = "Fikirizm Cloud ekibine davet edildiniz"
    inner = (
        f"<p>Merhaba {escape(to_name or '')},</p>"
        f"<p><strong>{escape(actor_name or '')}</strong> sizi Fikirizm Cloud'a "
        f"<strong>{escape(role_label)}</strong> olarak davet etti.</p>"
        "<p>Kurulumu tamamlamak ve kendi parolanızı belirlemek için aşağıdaki butona tıklayın. "
        "Bağlantı 7 gün geçerlidir.</p>"
        f'<p style="margin-top:20px"><a href="{invite_link}" '
        'style="background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;'
        'border-radius:8px;display:inline-block;font-weight:600">Daveti kabul et</a></p>'
    )
    await send_email(to=to_email, subject=subject, html=_shell(inner))


async def email_budget_alert(to_email, to_name, project_name, actual, planned, currency):
    subject = f"Bütçe uyarısı: {project_name}"
    inner = (
        f"<p>Merhaba {escape(to_name or '')},</p>"
        f"<p><strong>{escape(project_name or '')}</strong> projesinde gerçekleşen giderler "
        f"planlanan bütçeyi aştı.</p>"
        f"<p>Gerçekleşen gider: <strong>{currency}{actual:,.0f}</strong><br>"
        f"Planlanan gider: {currency}{planned:,.0f}</p>"
        "<p>Detaylar için projenin Bütçe sekmesini inceleyin.</p>"
    )
    try:
        await send_email(to=to_email, subject=subject, html=_shell(inner))
    except Exception as e:
        logger.warning(f"budget alert email failed: {e}")


async def email_daily_reminder(to_email, to_name, titles):
    subject = f"Günlük hatırlatma: {len(titles)} görevin son tarihi yaklaşıyor"
    items = "".join(f"<li>{escape(t)}</li>" for t in titles[:15])
    inner = (
        f"<p>Merhaba {escape(to_name or '')},</p>"
        "<p>Bugün veya yarın son tarihi olan görevleriniz:</p>"
        f"<ul>{items}</ul>"
        "<p>Detaylar için uygulamaya giriş yapın.</p>"
    )
    try:
        await send_email(to=to_email, subject=subject, html=_shell(inner))
    except Exception as e:
        logger.warning(f"daily reminder email failed: {e}")


async def email_weekly_summary(to_email, to_name, open_count, overdue_titles):
    subject = f"Haftalık özet: {open_count} açık görev"
    od = ""
    if overdue_titles:
        items = "".join(f"<li>{escape(t)}</li>" for t in overdue_titles[:10])
        od = f"<p><strong>Geciken görevler:</strong></p><ul>{items}</ul>"
    inner = (
        f"<p>Merhaba {escape(to_name or '')},</p>"
        f"<p>Bu hafta üzerinizde <strong>{open_count}</strong> açık görev var"
        + (f", bunlardan <strong>{len(overdue_titles)}</strong> tanesi gecikmiş." if overdue_titles else ".") + "</p>"
        f"{od}"
        "<p>İyi bir hafta dileriz! 🚀</p>"
    )
    try:
        await send_email(to=to_email, subject=subject, html=_shell(inner))
    except Exception as e:
        logger.warning(f"weekly summary email failed: {e}")
