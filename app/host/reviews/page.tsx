import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ReviewCard } from "@/components/ui/review-card";
import { getCurrentUser } from "@/lib/auth";
import { hostLinks } from "@/lib/navigation";
import { getProperties } from "@/lib/properties";
import { getReviews } from "@/lib/reviews";

export default async function HostReviewsPage() {
  const user = await getCurrentUser();
  const [properties, reviews] = await Promise.all([getProperties(), getReviews()]);
  const hostPropertyIds = new Set(properties.filter((property) => property.hostId === user?.id).map((property) => property.id));
  const hostReviews = reviews.filter((review) => hostPropertyIds.has(review.propertyId));

  return (
    <DashboardShell title="Reviews" subtitle="Host dashboard" links={hostLinks}>
      {hostReviews.length === 0 ? (
        <EmptyState title="No reviews yet" body="Reviews from completed guest stays will appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {hostReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
