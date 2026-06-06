import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ReviewCard } from "@/components/ui/review-card";
import { getAdminReviews } from "@/lib/admin-data";
import { adminLinks } from "@/lib/navigation";

export default async function AdminReviewsPage() {
  const reviews = await getAdminReviews();

  return (
    <DashboardShell title="Reviews" subtitle="Admin dashboard" links={adminLinks}>
      {reviews.length === 0 ? (
        <EmptyState title="No reviews yet" body="Guest reviews will appear here after completed stays." />
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
