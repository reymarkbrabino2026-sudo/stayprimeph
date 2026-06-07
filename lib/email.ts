import "server-only";

import { Resend } from "resend";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendEmail(input: { to: string; subject: string; html: string }) {
  if (!resend || !env.EMAIL_FROM) {
    logger.info("email_skipped", { subject: input.subject, to: input.to });
    return;
  }
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
  if (error) {
    logger.error("email_send_failed", { subject: input.subject, to: input.to, error });
  } else {
    logger.info("email_sent", { subject: input.subject, to: input.to });
  }
}

export async function sendWelcomeEmail(to: string, name: string) {
  await sendEmail({
    to,
    subject: "Welcome to StayPrimePH",
    html: `<p>Hi ${escapeHtml(name)},</p><p>Your StayPrimePH account is ready.</p>`,
  });
}

export async function sendVerificationEmail(input: { to: string; name: string; token: string }) {
  await sendEmail({
    to: input.to,
    subject: "Verify your StayPrimePH email",
    html: `<p>Hi ${escapeHtml(input.name)},</p><p><a href="${env.NEXT_PUBLIC_APP_URL}/verify-email/${encodeURIComponent(input.token)}">Verify your email</a></p>`,
  });
}

export async function sendPasswordResetEmail(input: { to: string; name: string; token: string }) {
  await sendEmail({
    to: input.to,
    subject: "Reset your StayPrimePH password",
    html: `<p>Hi ${escapeHtml(input.name)},</p><p><a href="${env.NEXT_PUBLIC_APP_URL}/reset-password/${encodeURIComponent(input.token)}">Reset your password</a></p>`,
  });
}

export async function sendBookingCreatedEmail(input: { to: string; propertyTitle: string; checkIn: string; checkOut: string }) {
  await sendEmail({
    to: input.to,
    subject: `Booking received for ${input.propertyTitle}`,
    html: `<p>Your booking request for <strong>${escapeHtml(input.propertyTitle)}</strong> was received.</p><p>${escapeHtml(input.checkIn)} to ${escapeHtml(input.checkOut)}</p>`,
  });
}

export async function sendListingReviewEmail(input: { to: string; title: string; status: string }) {
  await sendEmail({
    to: input.to,
    subject: `Your listing was ${input.status}`,
    html: `<p>Your listing <strong>${escapeHtml(input.title)}</strong> was ${escapeHtml(input.status)}.</p>`,
  });
}
