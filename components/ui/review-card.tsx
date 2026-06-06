import type { Review } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="rounded-[1.5rem] bg-white p-5 soft-card">
      <p className="font-semibold">★ {review.rating}.0</p>
      <p className="mt-3 text-black/65">{review.comment}</p>
      <p className="mt-3 text-sm text-black/45">{formatDate(review.createdAt)}</p>
    </div>
  );
}
