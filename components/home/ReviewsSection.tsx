import { Star } from 'lucide-react';

type Review = {
  author: string;
  authorPhoto: string | null;
  authorUrl: string | null;
  rating: number;
  text: string;
  relativeTime: string;
};

type ReviewsData = {
  rating: number | null;
  totalReviews: number;
  googleMapsUrl: string | null;
  reviews: Review[];
};

async function getReviews(): Promise<ReviewsData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/reviews`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= rating ? 'fill-gold text-gold' : 'fill-border text-border'}
        />
      ))}
    </div>
  );
}

export default async function ReviewsSection() {
  const data = await getReviews();

  // Fallback if API fails
  if (!data || !data.reviews.length) {
    return (
      <section className="py-16 lg:py-24 bg-bg">
        <div className="max-content text-center">
          <h2 className="section-heading text-3xl md:text-4xl">What our clients say</h2>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="flex text-gold text-xl" aria-label="5 out of 5 stars">{'★★★★★'}</div>
            <span className="font-display font-semibold text-charcoal text-lg">Excellent</span>
            <span className="text-mid-grey text-sm">— 100+ reviews on Google</span>
          </div>
          <p className="text-mid-grey text-sm mt-8">
            <a
              href="https://www.google.com/maps/place/Calgary+Oaths/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:text-gold-light font-medium"
            >
              Read our reviews on Google →
            </a>
          </p>
        </div>
      </section>
    );
  }

  const { rating, totalReviews, googleMapsUrl, reviews } = data;

  return (
    <section className="py-16 lg:py-24 bg-bg">
      <div className="max-content">
        <div className="text-center mb-10">
          <h2 className="section-heading text-3xl md:text-4xl">What our clients say</h2>
          <div className="flex items-center justify-center gap-3 mt-4">
            {rating && <Stars rating={Math.round(rating)} size={20} />}
            {rating && (
              <span className="font-display font-semibold text-charcoal text-lg">
                {rating.toFixed(1)}
              </span>
            )}
            <span className="text-mid-grey text-sm">
              — {totalReviews}+ reviews on Google
            </span>
          </div>
        </div>

        {/* Reviews grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.slice(0, 6).map((review, i) => (
            <div key={i} className="bg-white rounded-card shadow-card p-5 flex flex-col">
              {/* Author row */}
              <div className="flex items-center gap-3 mb-3">
                {review.authorPhoto ? (
                  <img
                    src={review.authorPhoto}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-display font-bold text-sm">
                      {review.author.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-charcoal text-sm truncate">
                    {review.authorUrl ? (
                      <a href={review.authorUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">
                        {review.author}
                      </a>
                    ) : review.author}
                  </p>
                  <p className="text-xs text-mid-grey">{review.relativeTime}</p>
                </div>
              </div>

              {/* Stars */}
              <Stars rating={review.rating} />

              {/* Review text */}
              {review.text && (
                <p className="text-sm text-mid-grey leading-relaxed mt-3 flex-1 line-clamp-4">
                  {review.text}
                </p>
              )}

              {/* Google attribution */}
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" className="flex-shrink-0">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="text-[10px] text-mid-grey">Google review</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        {googleMapsUrl && (
          <div className="text-center mt-8">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-base"
            >
              See all {totalReviews}+ reviews on Google →
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
