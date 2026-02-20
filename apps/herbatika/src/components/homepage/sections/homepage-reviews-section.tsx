import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Rating } from "@techsio/ui-kit/atoms/rating";
import type { ReviewItem } from "@/components/homepage/homepage.data";

type HomepageReviewsSectionProps = {
  reviews: ReviewItem[];
};

export function HomepageReviewsSection({ reviews }: HomepageReviewsSectionProps) {
  return (
    <section className="space-y-400 rounded-2xl border border-border-secondary bg-surface p-400 md:p-550">
      <header className="flex items-end justify-between gap-400">
        <div>
          <h2 className="text-2xl font-bold text-fg-primary">
            Overené skúsenosti
          </h2>
          <p className="mt-100 text-sm text-fg-secondary">
            Skutočné hodnotenia od našich zákazníkov.
          </p>
        </div>
        <Badge
          className="rounded-full px-300 py-100 text-xs font-semibold"
          variant="info"
        >
          4.9 / 5
        </Badge>
      </header>

      <div className="grid grid-cols-1 gap-300 lg:grid-cols-3">
        {reviews.map((review) => (
          <article
            className="rounded-2xl border border-border-secondary bg-base/70 p-400"
            key={review.id}
          >
            <Rating readOnly size="sm" value={review.rating} />
            <p className="mt-200 text-sm font-bold text-fg-primary">{review.title}</p>
            <p className="mt-200 text-sm leading-relaxed text-fg-secondary">
              {review.message}
            </p>
            <p className="mt-300 text-xs font-semibold text-primary">
              {review.author}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
