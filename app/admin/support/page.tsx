import Link from "next/link";
import { Mail, MessageSquareText, Phone, Send } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { sendSupportReply } from "@/app/support/actions";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageAutoRefresh } from "@/components/ui/message-auto-refresh";
import { MessageThread } from "@/components/ui/message-thread";
import { getCurrentUser } from "@/lib/auth";
import { csrfFieldName, getCsrfToken } from "@/lib/csrf";
import { getMessages } from "@/lib/messages";
import { adminLinks } from "@/lib/navigation";
import { buildSupportThreads, supportContact } from "@/lib/support";
import { getUsers } from "@/lib/users";
import { cn } from "@/lib/utils";

type AdminSupportSearchParams = {
  userId?: string;
  error?: string;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<AdminSupportSearchParams>;
}) {
  noStore();
  const query = await searchParams;
  const [admin, messages, users, csrfToken] = await Promise.all([getCurrentUser(), getMessages(), getUsers(), getCsrfToken()]);
  if (!admin) redirect("/admin/login?next=/admin/support");

  const threads = buildSupportThreads(messages, users, admin.id);
  const activeThread = threads.find((thread) => thread.user.id === query.userId) ?? threads[0] ?? null;

  return (
    <DashboardShell
      title="Support Inbox"
      subtitle="Admin dashboard"
      description="Reply to live help-center chats from guests and hosts."
      links={adminLinks}
    >
      <MessageAutoRefresh />

      <div className="mb-5 grid gap-3 md:grid-cols-2">
        <a href={supportContact.phoneHref} className="flex min-w-0 items-center gap-3 rounded-2xl bg-white p-4 soft-card">
          <span className="grid size-10 place-items-center rounded-full bg-[#083f35] text-white">
            <Phone size={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-black/40">Support number</span>
            <span className="break-words font-semibold">{supportContact.phoneDisplay}</span>
          </span>
        </a>
        <a href={`mailto:${supportContact.email}`} className="flex min-w-0 items-center gap-3 rounded-2xl bg-white p-4 soft-card">
          <span className="grid size-10 place-items-center rounded-full bg-[#21170f] text-white">
            <Mail size={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-black/40">Support email</span>
            <span className="break-all font-semibold">{supportContact.email}</span>
          </span>
        </a>
      </div>

      {threads.length === 0 ? (
        <EmptyState title="No support chats yet" body="Guest and host help-center messages will appear here." />
      ) : (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[340px_1fr] lg:gap-6">
          <aside className="min-w-0 space-y-3">
            {threads.map((thread) => {
              const isActive = thread.user.id === activeThread?.user.id;
              return (
                <Link
                  key={thread.user.id}
                  href={`/admin/support?userId=${encodeURIComponent(thread.user.id)}`}
                  className={cn(
                    "block rounded-[1.25rem] border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black",
                    isActive && "border-[#083f35] ring-2 ring-[#083f35]/15",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{thread.user.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-black/40">{thread.user.role}</p>
                    </div>
                    <span className="text-xs text-black/45">{formatDateTime(thread.latestMessage.createdAt)}</span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-black/60">{thread.latestMessage.message}</p>
                </Link>
              );
            })}
          </aside>

          <section className="min-w-0 space-y-4">
            {activeThread ? (
              <>
                <div className="rounded-[1.5rem] bg-white p-5 soft-card">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <span className="grid size-11 place-items-center rounded-full bg-[#fbf7f2] text-[#083f35]">
                        <MessageSquareText size={20} />
                      </span>
                      <div className="min-w-0">
                        <h2 className="break-words text-xl font-bold">{activeThread.user.name}</h2>
                        <p className="mt-1 break-all text-sm text-black/55">{activeThread.user.email}</p>
                      </div>
                    </div>
                    <span className="w-fit rounded-full bg-black/[0.04] px-3 py-1 text-xs font-semibold capitalize text-black/55">
                      {activeThread.user.role}
                    </span>
                  </div>
                </div>

                <MessageThread messages={activeThread.messages} currentUserId={admin.id} />

                {query.error ? <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{query.error}</p> : null}

                <form action={sendSupportReply} className="rounded-[1.5rem] bg-white p-4 soft-card sm:p-5">
                  <input type="hidden" name={csrfFieldName} value={csrfToken} />
                  <input type="hidden" name="userId" value={activeThread.user.id} />
                  <label className="sr-only" htmlFor="admin-support-message">Reply</label>
                  <textarea
                    id="admin-support-message"
                    name="message"
                    rows={3}
                    required
                    className="min-h-28 w-full resize-y rounded-2xl border border-black/10 p-4 text-sm outline-none transition focus:border-[#083f35]"
                    placeholder={`Reply to ${activeThread.user.name}`}
                  />
                  <div className="mt-3 flex justify-end">
                    <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#083f35] px-5 text-sm font-semibold text-white transition hover:bg-[#062f28] sm:w-auto">
                      <Send size={16} /> Send reply
                    </button>
                  </div>
                </form>
              </>
            ) : null}
          </section>
        </div>
      )}
    </DashboardShell>
  );
}
