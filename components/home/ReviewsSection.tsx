export default function ReviewsSection() {
  return (
    <section className="py-16 lg:py-24 bg-bg">
      <div className="max-content">
        <div className="text-center mb-10">
          <h2 className="section-heading text-3xl md:text-4xl">What our clients say</h2>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="flex text-gold text-xl" aria-label="5 out of 5 stars">
              {'★★★★★'}
            </div>
            <span className="font-display font-semibold text-charcoal text-lg">Excellent</span>
            <span className="text-mid-grey text-sm">— 106+ reviews on Google</span>
          </div>
        </div>

        {/* Trustindex widget placeholder */}
        <div className="bg-white rounded-card shadow-card p-8 text-center min-h-[200px] flex items-center justify-center">
          <div>
            {/* Paste Trustindex embed script here */}
            <p className="text-mid-grey text-sm">
              [Google Reviews widget — paste Trustindex embed code here]
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
