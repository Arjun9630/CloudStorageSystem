import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_reset_email(to_email: str, reset_token: str):
    """
    Sends a password reset email using SMTP.
    Fallback to console logging if SMTP is not configured.
    """
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    
    # Fallback to console if not configured
    if not all([smtp_server, smtp_port, smtp_user, smtp_pass]):
        print("\n" + "="*50)
        print("SMTP NOT CONFIGURED - MOCK EMAIL LOG")
        print(f"To: {to_email}")
        print(f"Subject: Reset Your Password")
        print(f"Link: {reset_link}")
        print("="*50 + "\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Reset Your Password - Cloud Storage"
        msg["From"] = f"Cloud Storage <{smtp_user}>"
        msg["To"] = to_email

        # HTML Template
        html = f"""
        <html>
            <body style="font-family: sans-serif; background-color: #f4f4f4; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2563eb; margin: 0;">Cloud Storage</h1>
                    </div>
                    <p style="font-size: 16px; color: #374151; line-height: 1.6;">Hello,</p>
                    <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                        We received a request to reset your password. Click the button below to choose a new one. This link will expire in 15 minutes.
                    </p>
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="{reset_link}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Reset Password</a>
                    </div>
                    <p style="font-size: 14px; color: #6b7280; text-align: center;">
                        If you didn't request this, you can safely ignore this email.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 40px 0;">
                    <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                        Cloud Storage Inc. &bull; Secure & Simple
                    </p>
                </div>
            </body>
        </html>
        """
        
        part1 = MIMEText(f"Reset your password here: {reset_link}", "plain")
        part2 = MIMEText(html, "html")
        msg.attach(part1)
        msg.attach(part2)

        with smtplib.SMTP(smtp_server, int(smtp_port), timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, to_email, msg.as_string())
        
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False
