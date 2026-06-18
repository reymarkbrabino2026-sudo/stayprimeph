import "server-only";

import { Resend } from "resend";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { STANDARD_CHECK_IN_TIME, STANDARD_CHECK_OUT_TIME } from "@/lib/utils";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const brandColor = "#ff385c";
const ctaColor = "#004236";
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

function emailShell(content: string, preview = "StayPrimePH update") {
  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:${textColor};">
        <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preview)}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;">
          <tr>
            <td align="center" style="padding:56px 24px 42px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;">
                <tr>
                  <td style="padding:0 0 58px;">
                    <div style="font-size:34px;font-weight:800;color:${brandColor};letter-spacing:-0.2px;">StayPrimePH</div>
                  </td>
                </tr>
                ${content}
                <tr>
                  <td style="padding:72px 0 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:2px solid ${borderColor};">
                      <tr>
                        <td style="padding:34px 0 0;">
                          <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#9a9f98;">Sent with care from StayPrimePH</p>
                          <p style="margin:0;font-size:14px;line-height:22px;color:#9a9f98;">Need help? Reply to this email or visit your StayPrimePH dashboard.</p>
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
    </html>
  `;
}

function simpleEmail(input: { headline: string; body: string; buttonText?: string; buttonUrl?: string }) {
  const button = input.buttonText && input.buttonUrl
    ? `
      <tr>
        <td style="padding:8px 32px 34px;">
          <a href="${escapeHtml(input.buttonUrl)}" style="display:block;background:${ctaColor};border-radius:8px;color:#ffffff;font-size:18px;font-weight:700;line-height:56px;text-align:center;text-decoration:none;">${escapeHtml(input.buttonText)}</a>
        </td>
      </tr>
    `
    : "";

  return emailShell(`
    <tr>
      <td style="padding:0 32px 24px;">
        <h1 style="margin:0 0 12px;font-size:34px;line-height:40px;font-weight:800;color:${textColor};">${escapeHtml(input.headline)}</h1>
        <p style="margin:0;font-size:17px;line-height:27px;color:${textColor};">${escapeHtml(input.body)}</p>
      </td>
    </tr>
    ${button}
  `, input.headline);
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
        <a href="${escapeHtml(input.actionUrl)}" style="display:block;background:${ctaColor};border-radius:8px;color:#ffffff;font-size:18px;font-weight:700;line-height:58px;text-align:center;text-decoration:none;">${escapeHtml(input.buttonText)}</a>
      </td>
    </tr>
  `, input.headline);
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
    html: simpleEmail({
      headline: "Welcome to StayPrimePH",
      body: `Hi ${name}, your StayPrimePH account is ready.`,
      buttonText: "Open StayPrimePH",
      buttonUrl: env.NEXT_PUBLIC_APP_URL,
    }),
  });
}

export async function sendVerificationEmail(input: { to: string; name: string; token: string }) {
  const url = `${env.NEXT_PUBLIC_APP_URL}/verify-email/${encodeURIComponent(input.token)}`;
  await sendEmail({
    to: input.to,
    subject: "Verify your StayPrimePH email",
    html: simpleEmail({
      headline: "Verify your email",
      body: `Hi ${input.name}, confirm this email address so your StayPrimePH account stays protected.`,
      buttonText: "Verify Email",
      buttonUrl: url,
    }),
  });
}

export async function sendEmailChangeVerificationEmail(input: { to: string; name: string; token: string; currentEmail: string }) {
  const url = `${env.NEXT_PUBLIC_APP_URL}/verify-email/${encodeURIComponent(input.token)}`;
  await sendEmail({
    to: input.to,
    subject: "Confirm your new StayPrimePH email",
    html: simpleEmail({
      headline: "Confirm your new email",
      body: `Hi ${input.name}, confirm this address to replace ${input.currentEmail} as your StayPrimePH login email.`,
      buttonText: "Confirm Email",
      buttonUrl: url,
    }),
  });
}

export async function sendAdminMfaEmail(input: { to: string; name: string; code: string }) {
  await sendEmail({
    to: input.to,
    subject: "Your StayPrimePH admin sign-in code",
    html: simpleEmail({
      headline: "Admin sign-in code",
      body: `Hi ${input.name}, use code ${input.code} to finish signing in to the StayPrimePH admin area. This code expires in 10 minutes. If this was not you, change the admin password immediately.`,
    }),
  });
}

export async function sendPasswordResetEmail(input: { to: string; name: string; token: string }) {
  const url = `${env.NEXT_PUBLIC_APP_URL}/reset-password/${encodeURIComponent(input.token)}`;
  await sendEmail({
    to: input.to,
    subject: "Reset your StayPrimePH password",
    html: emailShell(
      `
        <tr>
          <td style="padding:0 0 24px;">
            <p style="margin:0 0 32px;font-size:26px;line-height:34px;color:${mutedColor};">Hi ${escapeHtml(input.name)},</p>
            <p style="margin:0 0 26px;font-size:28px;line-height:38px;color:${mutedColor};">We received a request to reset your password.</p>
            <p style="margin:0 0 36px;font-size:28px;line-height:38px;color:${mutedColor};">If you did not make the request, just ignore this message. Otherwise, you can reset your password.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 0 34px;">
            <a href="${escapeHtml(url)}" style="display:inline-block;background:${ctaColor};border-radius:8px;color:#ffffff;font-size:24px;font-weight:700;line-height:1.2;padding:22px 48px;text-align:center;text-decoration:none;">Reset your password</a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 0 34px;">
            <p style="margin:0;font-size:16px;line-height:24px;color:${mutedColor};">This link expires after one hour. If the button does not work, <a href="${escapeHtml(url)}" style="color:${ctaColor};font-weight:700;text-decoration:underline;">click this link</a>.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 0 8px;">
            <p style="margin:0;font-size:28px;line-height:38px;color:${mutedColor};">Thanks,<br>The StayPrimePH team</p>
          </td>
        </tr>
      `,
      "Use this secure link to reset your StayPrimePH password.",
    ),
  });
}

export async function sendPasswordChangedEmail(input: { to: string; name: string }) {
  await sendEmail({
    to: input.to,
    subject: "Your StayPrimePH password was changed",
    html: simpleEmail({
      headline: "Your password was changed",
      body: `Hi ${input.name}, your StayPrimePH password was updated. If this was not you, contact support right away.`,
      buttonText: "Open StayPrimePH",
      buttonUrl: env.NEXT_PUBLIC_APP_URL,
    }),
  });
}

export async function sendAccountDeletionVerificationEmail(input: { to: string; name: string; token: string }) {
  const url = `${env.NEXT_PUBLIC_APP_URL}/account-deletion/verify/${encodeURIComponent(input.token)}`;
  await sendEmail({
    to: input.to,
    subject: "Verify your StayPrimePH account deletion request",
    html: simpleEmail({
      headline: "Verify account deletion",
      body: `Hi ${input.name}, confirm that you requested deletion or anonymization for this StayPrimePH account. This link expires in 24 hours. If this was not you, ignore this email and change your password.`,
      buttonText: "Verify Deletion Request",
      buttonUrl: url,
    }),
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
    html: simpleEmail({
      headline: `Your listing was ${input.status}`,
      body: `Your listing ${input.title} was ${input.status}.`,
      buttonText: "View Listings",
      buttonUrl: `${env.NEXT_PUBLIC_APP_URL}/host/listings`,
    }),
  });
}
