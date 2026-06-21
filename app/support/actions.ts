"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appendAuditLog } from "@/lib/audit-logs";
import { requireRole, requireUser, requireVerifiedEmail } from "@/lib/auth";
import { assertValidCsrfForm } from "@/lib/csrf";
import { sendSupportMessageEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { createMessage } from "@/lib/messages";
import { assertTrustedRequestOrigin } from "@/lib/request-safety";
import { getSupportAdmin, supportContact } from "@/lib/support";
import { getUserById } from "@/lib/users";

function cleanMessage(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function cleanTopic(value: FormDataEntryValue | null) {
  const topic = String(value ?? "").trim();
  if (topic === "booking" || topic === "hosting" || topic === "payments" || topic === "account" || topic === "safety") {
    return topic;
  }
  return "general";
}

function topicLabel(topic: string) {
  const labels: Record<string, string> = {
    account: "Account",
    booking: "Booking",
    general: "General",
    hosting: "Hosting",
    payments: "Payments",
    safety: "Safety",
  };
  return labels[topic] ?? "General";
}

export async function sendSupportMessage(formData: FormData) {
  await assertTrustedRequestOrigin();
  await assertValidCsrfForm(formData);

  const user = await requireUser({ redirectTo: "/login?next=/support/help-center" });
  if (user.role === "admin") redirect("/admin/support");
  requireVerifiedEmail(user);

  const body = cleanMessage(formData.get("message"));
  const topic = cleanTopic(formData.get("topic"));
  if (!body) {
    redirect(`/support/help-center?error=${encodeURIComponent("Write a message before starting chat.")}`);
  }

  const admin = await getSupportAdmin();
  if (!admin) throw new Error("No support admin account is available.");

  await createMessage({
    id: randomUUID(),
    senderId: user.id,
    receiverId: admin.id,
    message: `[${topicLabel(topic)}] ${body}`,
    createdAt: new Date().toISOString(),
  });

  const emailRecipients = Array.from(new Set([admin.email, supportContact.email].filter(Boolean)));
  for (const to of emailRecipients) {
    try {
      await sendSupportMessageEmail({
        to,
        topicLabel: topicLabel(topic),
        message: body,
        senderName: user.name,
        senderEmail: user.email,
      });
    } catch (error) {
      logger.error("support_message_email_failed", { error, to });
    }
  }

  revalidatePath("/support/help-center");
  revalidatePath("/admin/support");
  redirect("/support/help-center?sent=1");
}

export async function sendSupportReply(formData: FormData) {
  await assertTrustedRequestOrigin();
  await assertValidCsrfForm(formData);

  const user = await requireRole("admin", {
    redirectTo: "/admin/login?next=/admin/support",
    forbiddenMessage: "Only admins can reply to support chats.",
  });
  requireVerifiedEmail(user);

  const userId = String(formData.get("userId") ?? "");
  const body = cleanMessage(formData.get("message"));
  if (!body) redirect(`/admin/support?userId=${encodeURIComponent(userId)}&error=${encodeURIComponent("Write a reply before sending.")}`);

  const recipient = await getUserById(userId);
  if (!recipient || recipient.role === "admin") throw new Error("Support conversation not found.");

  await createMessage({
    id: randomUUID(),
    senderId: user.id,
    receiverId: recipient.id,
    message: body,
    createdAt: new Date().toISOString(),
  });
  await appendAuditLog({
    actorId: user.id,
    actorRole: "admin",
    action: "support.replied",
    entityType: "support_thread",
    entityId: recipient.id,
    metadata: {
      recipientRole: recipient.role,
    },
  });

  revalidatePath("/admin/support");
  revalidatePath("/support/help-center");
  redirect(`/admin/support?userId=${encodeURIComponent(recipient.id)}`);
}
