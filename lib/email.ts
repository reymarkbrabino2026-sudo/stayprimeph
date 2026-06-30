import "server-only";

import { Resend } from "resend";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { isNotificationEmailAllowed, type NotificationEmailKind } from "@/lib/notification-consent";
import { STANDARD_CHECK_IN_TIME, STANDARD_CHECK_OUT_TIME } from "@/lib/utils";

let cachedResend: { apiKey: string; client: Resend } | null = null;
const brandColor = "#083f35";
const ctaColor = "#004236";
const textColor = "#222222";
const mutedColor = "#717171";
const borderColor = "#dddddd";
const codeHighlightBackground = "#eef8f5";
const codeHighlightBorder = "#c4ddd5";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function optionalEmailEnv(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "\"\"" || trimmed === "''") return undefined;
  return trimmed;
}

function emailDeliveryConfig() {
  const apiKey = optionalEmailEnv(process.env.RESEND_API_KEY) ?? env.RESEND_API_KEY;
  const from = optionalEmailEnv(process.env.EMAIL_FROM) ?? env.EMAIL_FROM;

  if (!apiKey) {
    return {
      client: null,
      from,
      hasResendApiKey: false,
      hasEmailFrom: Boolean(from),
    };
  }

  if (cachedResend?.apiKey !== apiKey) {
    cachedResend = { apiKey, client: new Resend(apiKey) };
  }

  return {
    client: cachedResend.client,
    from,
    hasResendApiKey: true,
    hasEmailFrom: Boolean(from),
  };
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
                    <img src="${env.NEXT_PUBLIC_APP_URL}/email-logo.png" width="190" alt="StayPrime PH" style="display:block;height:auto;border:0;outline:none;text-decoration:none;" />
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

function highlightedEmailCode(value: string) {
  return `<span style="display:inline-block;margin:0 2px;padding:2px 10px;border:1px solid ${codeHighlightBorder};border-radius:8px;background:${codeHighlightBackground};color:${brandColor};font-family:'Courier New',Courier,monospace;font-size:20px;line-height:26px;font-weight:800;letter-spacing:.12em;">${escapeHtml(value)}</span>`;
}

function simpleEmail(input: { headline: string; body: string; trustedBodyHtml?: string; buttonText?: string; buttonUrl?: string }) {
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
        <p style="margin:0;font-size:17px;line-height:27px;color:${textColor};">${input.trustedBodyHtml ?? escapeHtml(input.body)}</p>
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

type EmailConsent = {
  kind: NotificationEmailKind;
  scope?: "offers" | "account";
  preferenceId?: string;
};

async function sendEmail(input: { to: string; subject: string; html: string; consent: EmailConsent }) {
  const allowed = await isNotificationEmailAllowed({
    to: input.to,
    kind: input.consent.kind,
    scope: input.consent.scope,
    preferenceId: input.consent.preferenceId,
  });
  if (!allowed) {
    logger.info("email_suppressed_by_notification_preferences", {
      subject: input.subject,
      to: input.to,
      scope: input.consent.scope,
      preferenceId: input.consent.preferenceId,
    });
    return;
  }

  const delivery = emailDeliveryConfig();
  if (!delivery.client || !delivery.from) {
    logger.warn("email_skipped", {
      subject: input.subject,
      to: input.to,
      reason: "missing_email_config",
      hasResendApiKey: delivery.hasResendApiKey,
      hasEmailFrom: delivery.hasEmailFrom,
    });
    return;
  }

  const { error } = await delivery.client.emails.send({
    from: delivery.from,
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
    consent: { kind: "essential" },
    html: simpleEmail({
      headline: "Welcome to StayPrimePH",
      body: `Hi ${name}, your StayPrimePH account is ready.`,
      buttonText: "Open StayPrimePH",
      buttonUrl: env.NEXT_PUBLIC_APP_URL,
    }),
  });
}

export async function sendVerificationEmail(input: { to: string; name: string; token: string; code: string }) {
  const url = `${env.NEXT_PUBLIC_APP_URL}/verify-email/${encodeURIComponent(input.token)}`;
  const body = `Hi ${input.name}, use code ${input.code} to verify your StayPrimePH account. This code expires in 1 hour. You can also use the verification button below.`;
  await sendEmail({
    to: input.to,
    subject: "Your StayPrimePH verification code",
    consent: { kind: "essential" },
    html: simpleEmail({
      headline: "Verify your email",
      body,
      trustedBodyHtml: `Hi ${escapeHtml(input.name)}, use code ${highlightedEmailCode(input.code)} to verify your StayPrimePH account. This code expires in 1 hour. You can also use the verification button below.`,
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
    consent: { kind: "essential" },
    html: simpleEmail({
      headline: "Confirm your new email",
      body: `Hi ${input.name}, confirm this address to replace ${input.currentEmail} as your StayPrimePH login email.`,
      buttonText: "Confirm Email",
      buttonUrl: url,
    }),
  });
}

export async function sendPrivilegedMfaEmail(input: { to: string; name: string; code: string; role: "admin" | "host" }) {
  const roleLabel = input.role === "admin" ? "admin" : "host";
  const destination = input.role === "admin" ? "admin area" : "host dashboard";
  const body = `Hi ${input.name}, use code ${input.code} to finish signing in to the StayPrimePH ${destination}. This code expires in 10 minutes. If this was not you, change your password immediately.`;
  await sendEmail({
    to: input.to,
    subject: `Your StayPrimePH ${roleLabel} sign-in code`,
    consent: { kind: "essential" },
    html: simpleEmail({
      headline: `${roleLabel[0].toUpperCase()}${roleLabel.slice(1)} sign-in code`,
      body,
      trustedBodyHtml: `Hi ${escapeHtml(input.name)}, use code ${highlightedEmailCode(input.code)} to finish signing in to the StayPrimePH ${escapeHtml(destination)}. This code expires in 10 minutes. If this was not you, change your password immediately.`,
    }),
  });
}

export async function sendAdminMfaEmail(input: { to: string; name: string; code: string }) {
  await sendPrivilegedMfaEmail({ ...input, role: "admin" });
}

export async function sendSupportMessageEmail(input: {
  to: string;
  topicLabel: string;
  message: string;
  senderName: string;
  senderEmail: string;
}) {
  await sendEmail({
    to: input.to,
    subject: `New support chat: ${input.topicLabel}`,
    consent: { kind: "essential" },
    html: simpleEmail({
      headline: `New ${escapeHtml(input.topicLabel)} support message`,
      body: `From ${escapeHtml(input.senderName)} (${escapeHtml(input.senderEmail)}): ${escapeHtml(input.message)}`,
      buttonText: "Open support inbox",
      buttonUrl: `${env.NEXT_PUBLIC_APP_URL}/admin/support`,
    }),
  });
}

export async function sendPasswordResetEmail(input: { to: string; name: string; token: string }) {
  const url = `${env.NEXT_PUBLIC_APP_URL}/reset-password/${encodeURIComponent(input.token)}`;
  await sendEmail({
    to: input.to,
    subject: "Reset your StayPrimePH password",
    consent: { kind: "essential" },
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
    consent: { kind: "essential" },
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
    consent: { kind: "essential" },
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
    consent: { kind: "account", scope: "account", preferenceId: "Reservations:Booking requests" },
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
    consent: { kind: "account", scope: "account", preferenceId: "Reservations:Booking requests" },
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
    consent: { kind: "account", scope: "account", preferenceId: "Reservations:Booking requests" },
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
    consent: { kind: "account", scope: "account", preferenceId: "Hosting:Listing status" },
    html: simpleEmail({
      headline: `Your listing was ${input.status}`,
      body: `Your listing ${input.title} was ${input.status}.`,
      buttonText: "View Listings",
      buttonUrl: `${env.NEXT_PUBLIC_APP_URL}/host/listings`,
    }),
  });
}
