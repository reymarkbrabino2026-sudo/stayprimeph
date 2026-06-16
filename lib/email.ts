import "server-only";

import { Resend } from "resend";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { STANDARD_CHECK_IN_TIME, STANDARD_CHECK_OUT_TIME } from "@/lib/utils";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const brandColor = "#ff385c";
const textColor = "#222222";
const mutedColor = "#717171";
const borderColor = "#dddddd";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${env.NEXT_PUBLIC_APP_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00+08:00`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function bookingCode(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function emailShell(content: string) {
  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f7f7f7;font-family:Arial,Helvetica,sans-serif;color:${textColor};">
        <div style="display:none;max-height:0;overflow:hidden;">StayPrimePH booking update</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f7;">
          <tr>
            <td align="center" style="padding:32px 12px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;">
                <tr>
                  <td style="padding:32px 32px 18px;">
                    <div style="font-size:22px;font-weight:800;color:${brandColor};letter-spacing:.2px;">StayPrimePH</div>
                  </td>
                </tr>
                ${content}
                <tr>
                  <td style="padding:26px 32px 34px;border-top:1px solid ${borderColor};">
                    <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:${mutedColor};">Need help? Reply to this email or visit your StayPrimePH dashboard.</p>
                    <p style="margin:0;font-size:12px;line-height:18px;color:#9a9a9a;">StayPrimePH sends booking updates for reservations made on stayprimeph.com.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

type BookingEmailDetails = {
  to: string;
  recipientName?: string;
  propertyTitle: string;
  propertyImageUrl?: string;
  propertyLocation?: string;
  propertyAddress?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  bookingId: string;
  actionUrl: string;
  hostName?: string;
  guestName?: string;
};

function bookingSummaryRows(input: BookingEmailDetails) {
  const safeAddress = input.propertyAddress ? escapeHtml(input.propertyAddress) : "Shared after confirmation";
  return `
    <tr>
      <td style="padding:0 32px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid ${borderColor};border-bottom:1px solid ${borderColor};">
          <tr>
            <td valign="top" width="50%" style="padding:24px 14px 24px 0;">
              <p style="margin:0 0 6px;font-size:15px;color:${mutedColor};">Check-in</p>
              <p style="margin:0;font-size:20px;line-height:28px;font-weight:700;color:${textColor};">${escapeHtml(formatDate(input.checkIn))}</p>
              <p style="margin:8px 0 0;font-size:14px;color:${mutedColor};">Check-in ${escapeHtml(STANDARD_CHECK_IN_TIME)}</p>
            </td>
            <td valign="top" width="50%" style="padding:24px 0 24px 14px;text-align:right;border-left:1px solid #eeeeee;">
              <p style="margin:0 0 6px;font-size:15px;color:${mutedColor};">Check-out</p>
              <p style="margin:0;font-size:20px;line-height:28px;font-weight:700;color:${textColor};">${escapeHtml(formatDate(input.checkOut))}</p>
              <p style="margin:8px 0 0;font-size:14px;color:${mutedColor};">Check-out ${escapeHtml(STANDARD_CHECK_OUT_TIME)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 32px 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding:18px 0;border-bottom:1px solid ${borderColor};font-size:18px;color:${textColor};">Address</td>
            <td align="right" style="padding:18px 0;border-bottom:1px solid ${borderColor};font-size:15px;line-height:22px;color:${mutedColor};">${safeAddress}</td>
          </tr>
          <tr>
            <td style="padding:18px 0;border-bottom:1px solid ${borderColor};font-size:18px;color:${textColor};">Guests</td>
            <td align="right" style="padding:18px 0;border-bottom:1px solid ${borderColor};font-size:17px;color:${textColor};">${input.guests}</td>
          </tr>
          <tr>
            <td style="padding:18px 0;border-bottom:1px solid ${borderColor};font-size:18px;color:${textColor};">Amount</td>
            <td align="right" style="padding:18px 0;border-bottom:1px solid ${borderColor};font-size:17px;color:${textColor};">${escapeHtml(formatCurrency(input.totalPrice))}</td>
          </tr>
          <tr>
            <td style="padding:18px 0;border-bottom:1px solid ${borderColor};font-size:18px;color:${textColor};">Reservation code</td>
            <td align="right" style="padding:18px 0;border-bottom:1px solid ${borderColor};font-size:17px;font-weight:700;color:${textColor};">${escapeHtml(bookingCode(input.bookingId))}</td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function bookingEmail(input: BookingEmailDetails & {
  eyebrow: string;
  headline: string;
  intro: string;
  buttonText: string;
  note?: string;
}) {
  const image = input.propertyImageUrl
    ? `<img src="${escapeHtml(absoluteUrl(input.propertyImageUrl))}" width="576" alt="${escapeHtml(input.propertyTitle)}" style="display:block;width:100%;max-width:576px;height:auto;border-radius:16px;">`
    : `<div style="height:250px;border-radius:16px;background:#f2ede7;"></div>`;
  const location = input.propertyLocation ? ` in ${escapeHtml(input.propertyLocation)}` : "";
  const note = input.note ? `<p style="margin:18px 0 0;font-size:15px;line-height:23px;color:${mutedColor};">${escapeHtml(input.note)}</p>` : "";

  return emailShell(`
    <tr>
      <td style="padding:0 32px 24px;">
        <p style="margin:0 0 12px;font-size:14px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${brandColor};">${escapeHtml(input.eyebrow)}</p>
        <h1 style="margin:0 0 12px;font-size:36px;line-height:42px;font-weight:800;color:${textColor};">${escapeHtml(input.headline)}</h1>
        <p style="margin:0;font-size:18px;line-height:28px;color:${textColor};">${escapeHtml(input.intro)}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 24px;">${image}</td>
    </tr>
    <tr>
      <td style="padding:0 32px 24px;">
        <h2 style="margin:0 0 8px;font-size:26px;line-height:33px;font-weight:500;color:${textColor};">${escapeHtml(input.propertyTitle)}</h2>
        <p style="margin:0;font-size:16px;color:${mutedColor};">Private stay${location}${input.hostName ? ` hosted by ${escapeHtml(input.hostName)}` : ""}</p>
        ${note}
      </td>
    </tr>
    ${bookingSummaryRows(input)}
    <tr>
      <td style="padding:30px 32px 34px;">
        <a href="${escapeHtml(input.actionUrl)}" style="display:block;background:${brandColor};border-radius:8px;color:#ffffff;font-size:18px;font-weight:700;line-height:58px;text-align:center;text-decoration:none;">${escapeHtml(input.buttonText)}</a>
      </td>
    </tr>
  `);
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

export async function sendBookingReceivedEmail(input: BookingEmailDetails) {
  await sendEmail({
    to: input.to,
    subject: `Booking received for ${input.propertyTitle}`,
    html: bookingEmail({
      ...input,
      eyebrow: "Booking received",
      headline: "Your booking request was received",
      intro: "We sent your request to the host. You will get another email when the booking is approved.",
      buttonText: "View Booking",
      note: "No final confirmation yet. The host still needs to approve this request.",
    }),
  });
}

export async function sendBookingRequestEmail(input: BookingEmailDetails) {
  await sendEmail({
    to: input.to,
    subject: `New booking request for ${input.propertyTitle}`,
    html: bookingEmail({
      ...input,
      eyebrow: "New booking request",
      headline: "You have a new booking request",
      intro: `${input.guestName ?? "A guest"} wants to stay at your place. Review the details and approve or decline the request.`,
      buttonText: "Review Request",
      note: "Please review the request promptly so the guest can finish planning their stay.",
    }),
  });
}

export async function sendBookingConfirmedEmail(input: BookingEmailDetails & { recipientRole: "guest" | "host" }) {
  await sendEmail({
    to: input.to,
    subject: `Booking confirmed for ${input.propertyTitle}`,
    html: bookingEmail({
      ...input,
      eyebrow: "Booking confirmed",
      headline: input.recipientRole === "guest" ? "Your reservation is confirmed" : "This booking is confirmed",
      intro: input.recipientRole === "guest"
        ? `You're going to ${input.propertyLocation || "your StayPrimePH stay"}.`
        : `${input.guestName ?? "Your guest"} is confirmed for these dates.`,
      buttonText: input.recipientRole === "guest" ? "View Full Itinerary" : "View Booking",
      note: input.recipientRole === "guest"
        ? "Keep this email handy for your check-in details and reservation code."
        : "The reservation is now active in your host dashboard.",
    }),
  });
}

export const sendBookingCreatedEmail = sendBookingReceivedEmail;

export async function sendListingReviewEmail(input: { to: string; title: string; status: string }) {
  await sendEmail({
    to: input.to,
    subject: `Your listing was ${input.status}`,
    html: `<p>Your listing <strong>${escapeHtml(input.title)}</strong> was ${escapeHtml(input.status)}.</p>`,
  });
}
