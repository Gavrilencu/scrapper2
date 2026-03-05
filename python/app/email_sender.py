import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import re


def send_email(
    host: str,
    port: int,
    secure: bool,
    user: str,
    password: str,
    from_addr: str,
    to_list: list[str],
    subject: str,
    html: str,
    text: str | None = None,
) -> None:
    if not text:
        text = re.sub(r"<[^>]*>", "", html)
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = ", ".join(to_list)
    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))
    if secure:
        with smtplib.SMTP_SSL(host, port) as server:
            server.login(user, password)
            server.sendmail(from_addr, to_list, msg.as_string())
    else:
        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(user, password)
            server.sendmail(from_addr, to_list, msg.as_string())


def build_job_success_email(job_name: str, rows_inserted: int, run_at: str) -> str:
    return f"""
    <h2>Job executat cu succes</h2>
    <p><strong>Job:</strong> {job_name}</p>
    <p><strong>Rânduri inserate:</strong> {rows_inserted}</p>
    <p><strong>Data/Ora:</strong> {run_at}</p>
    """


def build_job_error_email(job_name: str, error_message: str, run_at: str) -> str:
    return f"""
    <h2>Eroare la executarea job-ului</h2>
    <p><strong>Job:</strong> {job_name}</p>
    <p><strong>Eroare:</strong></p>
    <pre>{error_message}</pre>
    <p><strong>Data/Ora:</strong> {run_at}</p>
    """
