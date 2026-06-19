import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getNotificationsForUser } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ userId: null, role: null, notifications: [] }, { status: 401 });

  const notifications = await getNotificationsForUser(user);
  return NextResponse.json({
    userId: user.id,
    role: user.role,
    notifications,
  });
}
