import { google } from "googleapis";
import crypto from "crypto";

function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

export async function sendVerificationEmail(
  to: string,
  code: string
): Promise<void> {
  const gmail = getGmailClient();
  const from = process.env.GMAIL_FROM || "support@tenniscricketleague.com";

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #3B4E8C; margin-bottom: 8px;">Tennis Cricket League</h2>
      <p style="color: #555; margin-bottom: 24px;">Waiver & Registration</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin-bottom: 24px;" />
      <p>Your verification code is:</p>
      <div style="background: #f4f4f4; padding: 16px; text-align: center; border-radius: 8px; margin: 16px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #E07830;">${code}</span>
      </div>
      <p style="color: #888; font-size: 14px;">This code expires in 10 minutes.</p>
      <p style="color: #888; font-size: 14px;">If you did not request this, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin-top: 24px;" />
      <p style="color: #aaa; font-size: 12px;">Tennis Cricket League &mdash; Player Registration & Waiver System</p>
    </div>
  `;

  const messageParts = [
    `From: Tennis Cricket League <${from}>`,
    `To: ${to}`,
    `Subject: TCL Waiver - Email Verification Code`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    htmlBody,
  ];
  const message = messageParts.join("\n");

  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  });
}

export function generateVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}
