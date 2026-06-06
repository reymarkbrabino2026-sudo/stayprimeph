import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ReviewCard } from "@/components/ui/review-card";
import { getCurrentUser } from "@/lib/auth";
import { guestLinks } from "@/lib/navigation";
import { getReviews } from "@/lib/reviews";

export default async function GuestReviewsPage() {
  const user = await getCurrentUser();
  const reviews = (await getReviews()).filter((review) => review.guestId === user?.id);

  return (
    <DashboardShell title="Reviews" subtitle="Guest dashboard" links={guestLinks}>
      {reviews.length === 0 ? (
        <EmptyState title="No reviews written yet" body="After a completed stay, reviews you write will appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
