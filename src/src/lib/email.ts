const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
const EMAIL_FROM = import.meta.env.EMAIL_FROM;
const APP_URL = import.meta.env.APP_URL || import.meta.env.PUBLIC_APP_URL;

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY || !EMAIL_FROM || !APP_URL) {
    throw new Error("Missing email configuration.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to send email: ${response.status} ${text}`);
  }
}

export async function sendVerificationEmail(to: string, rawToken: string) {
  const verifyUrl = `${APP_URL}/api/auth/verify?token=${encodeURIComponent(rawToken)}`;

  await sendEmail(
    to,
    "Verify your account",
    `
      <p>Welcome to Lifestyle App.</p>
      <p>Please verify your email by clicking the link below:</p>
      <p><a href="${verifyUrl}">Verify my account</a></p>
      <p>If you did not create this account, you can ignore this email.</p>
    `
  );
}

export async function sendPasswordResetEmail(to: string, rawToken: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;

  await sendEmail(
    to,
    "Reset your password",
    `
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl}">Reset password</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `
  );
}