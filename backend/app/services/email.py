import os
import smtplib
from email.message import EmailMessage


def email_enabled():
    return bool(os.environ.get("SMTP_HOST"))


def send_email(to, subject, body):
    """Returns True only if the SMTP server accepted the message."""
    if not email_enabled():
        return False
    msg = EmailMessage()
    msg["From"] = os.environ.get("SMTP_FROM", "no-reply@medislot.demo")
    msg["To"], msg["Subject"] = to, subject
    msg.set_content(body)
    with smtplib.SMTP(os.environ["SMTP_HOST"], int(os.environ.get("SMTP_PORT", "587")), timeout=10) as s:
        s.starttls()
        if os.environ.get("SMTP_USER"):
            s.login(os.environ["SMTP_USER"], os.environ.get("SMTP_PASSWORD", ""))
        s.send_message(msg)
    return True
