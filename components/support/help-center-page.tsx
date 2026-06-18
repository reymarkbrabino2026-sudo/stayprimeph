import Link from "next/link";
import { Mail, MessageCircle, Phone, Send, ShieldCheck } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import { sendSupportMessage } from "@/app/support/actions";
import { MessageAutoRefresh } from "@/components/ui/message-auto-refresh";
import { MessageThread } from "@/components/ui/message-thread";
import { getCurrentUser } from "@/lib/auth";
import { csrfFieldName, getCsrfToken } from "@/lib/csrf";
import { getMessagesForUser } from "@/lib/messages";
import { getSupportAdmin, getSupportMessagesForUser, supportContact } from "@/lib/support";

type HelpCenterSearchParams = {
  error?: string;
  sent?: string;
};

const helpTopics = [
  { value: "booking", label: "Booking or trip" },
  { value: "hosting", label: "Hosting" },
  { value: "payments", label: "Payments" },
  { value: "account", label: "Account access" },
  { value: "safety", label: "Safety concern" },
  { value: "general", label: "General question" },
];

const quickHelp = [
  "Reservation changes, check-in questions, and cancellation help",
  "Host listing, calendar, payout, and guest coordination issues",
  "Account access, profile, verification, and privacy requests",
  "Stay concerns that need admin review or platform records",
];

export async function HelpCenterPage({ searchParams }: { searchParams: HelpCenterSearchParams }) {
  noStore();
  const [user, admin, csrfToken] = await Promise.all([getCurrentUser(), getSupportAdmin(), getCsrfToken()]);
  const userMessages = user && admin ? await getMessagesForUser(user.id) : [];
  const supportMessages = user && admin ? getSupportMessagesForUser(userMessages, user.id, admin.id) : [];

  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-10 sm:px-6 md:py-14">
      <MessageAutoRefresh />

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div>
          <p className="text-sm font-semibold text-rose-600">Help Center</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Talk to StayPrimePH support.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-black/65 sm:text-lg">
            Guests and hosts can reach the admin team by live chat, phone, or email. Keep trip and listing issues here so the support record stays complete.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <a
              href={supportContact.phoneHref}
              className="flex min-h-24 items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#083f35] text-white">
                <Phone size={20} />
              </span>
              <span>
                <span className="block text-sm text-black/50">Call support</span>
                <span className="block font-semibold">{supportContact.phoneDisplay}</span>
              </span>
            </a>

            <a
              href={`mailto:${supportContact.email}`}
              className="flex min-h-24 items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#21170f] text-white">
                <Mail size={20} />
              </span>
              <span>
                <span className="block text-sm text-black/50">Email support</span>
                <span className="block break-all font-semibold">{supportContact.email}</span>
              </span>
            </a>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {quickHelp.map((item) => (
              <div key={item} className="rounded-2xl border bg-white p-4 text-sm leading-6 text-black/65">
                {item}
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-rose-50 text-rose-600">
              <MessageCircle size={21} />
            </span>
            <div>
              <h2 className="text-xl font-semibold">Live chat</h2>
              <p className="text-sm text-black/55">Replies refresh while this page is open.</p>
            </div>
          </div>

          {!admin ? (
            <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
              Add an admin account before support chat can receive messages.
            </div>
          ) : user?.role === "admin" ? (
            <div className="mt-5 rounded-2xl bg-[#fbf7f2] p-4">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 shrink-0 text-[#083f35]" size={20} />
                <div>
                  <p className="font-semibold">Admin support tools</p>
                  <p className="mt-1 text-sm leading-6 text-black/60">Open the support inbox to answer guest and host conversations.</p>
                </div>
              </div>
              <Link
                href="/admin/support"
                className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[#083f35] px-5 text-sm font-semibold text-white transition hover:bg-[#062f28]"
              >
                Open support inbox
              </Link>
            </div>
          ) : user ? (
            <div className="mt-5 space-y-4">
              {supportMessages.length ? (
                <MessageThread messages={supportMessages} currentUserId={user.id} />
              ) : (
                <div className="rounded-2xl border border-dashed p-5 text-sm leading-6 text-black/55">
                  Start a chat with the admin team. Your conversation will stay here when they reply.
                </div>
              )}

              {searchParams.sent ? <p className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">Message sent to support.</p> : null}
              {searchParams.error ? <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{searchParams.error}</p> : null}

              <form action={sendSupportMessage} className="space-y-3">
                <input type="hidden" name={csrfFieldName} value={csrfToken} />
                <label className="sr-only" htmlFor="support-topic">Topic</label>
                <select
                  id="support-topic"
                  name="topic"
                  className="min-h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-[#083f35]"
                  defaultValue="general"
                >
                  {helpTopics.map((topic) => (
                    <option key={topic.value} value={topic.value}>{topic.label}</option>
                  ))}
                </select>
                <label className="sr-only" htmlFor="support-message">Message</label>
                <textarea
                  id="support-message"
                  name="message"
                  rows={4}
                  required
                  className="min-h-32 w-full resize-y rounded-2xl border border-black/10 p-4 text-sm outline-none transition focus:border-[#083f35]"
                  placeholder="Tell support what happened and include booking, listing, or account details when useful."
                />
                <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#083f35] px-5 text-sm font-semibold text-white transition hover:bg-[#062f28]">
                  <Send size={16} /> Send to support
                </button>
              </form>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <p className="rounded-2xl bg-[#fbf7f2] p-4 text-sm leading-6 text-black/65">
                Sign in as a guest or host to start a live support chat with the admin team.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Link
                  href="/login?role=guest&next=/support/help-center"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#083f35] px-5 text-sm font-semibold text-white transition hover:bg-[#062f28]"
                >
                  Guest sign in
                </Link>
                <Link
                  href="/login?role=host&next=/support/help-center"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold transition hover:border-black/30 hover:bg-black/[0.02]"
                >
                  Host sign in
                </Link>
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
