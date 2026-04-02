import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for Calgary Oaths commissioning services.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="py-12 lg:py-20">
      <div className="max-content max-w-3xl mx-auto">
        <h1 className="font-display font-bold text-3xl lg:text-4xl text-charcoal mb-2">Privacy Policy</h1>
        <p className="text-mid-grey text-sm mb-10">Last updated: April 2, 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-charcoal">
          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">1. Introduction</h2>
            <p className="text-sm leading-relaxed text-charcoal/80">
              Calgary Oaths, operated by Cethos Solutions Inc. (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), is committed to protecting
              the privacy of our customers and website visitors. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your personal information when you visit our website at calgaryoaths.com
              or use our services.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">2. Information We Collect</h2>
            <p className="text-sm leading-relaxed text-charcoal/80 mb-3">We collect the following types of personal information:</p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-charcoal/80">
              <li><strong>Contact Information:</strong> Name, email address, phone number — provided when you book an appointment.</li>
              <li><strong>Service Information:</strong> Details about the services you request, documents you bring, and appointment notes.</li>
              <li><strong>Payment Information:</strong> Payment is processed securely through Stripe. We do not store your credit card numbers. Stripe may collect billing details as described in their privacy policy.</li>
              <li><strong>Location Information:</strong> For mobile service bookings, your address is used to calculate travel fees and provide the service at your location.</li>
              <li><strong>Website Usage Data:</strong> We use Google Analytics and similar tools to collect anonymous usage statistics such as pages visited, time spent on site, and referral sources.</li>
              <li><strong>Identity Documents:</strong> During commissioning appointments, we verify your government-issued photo ID. We do not retain copies of your identification documents unless required for the specific service.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-charcoal/80">
              <li>To process and manage your bookings and appointments.</li>
              <li>To communicate with you about your appointments, including confirmations, reminders, and follow-ups.</li>
              <li>To process payments securely through our payment provider.</li>
              <li>To provide the commissioning services you have requested.</li>
              <li>To improve our website and services based on usage patterns.</li>
              <li>To comply with legal obligations and professional requirements.</li>
              <li>To send you important service-related communications (not marketing).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">4. Information Sharing</h2>
            <p className="text-sm leading-relaxed text-charcoal/80 mb-3">We do not sell or rent your personal information. We may share your information with:</p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-charcoal/80">
              <li><strong>Commissioners:</strong> Your booking details are shared with the commissioner assigned to your appointment so they can provide the service.</li>
              <li><strong>Service Providers:</strong> We use third-party services including Stripe (payments), Brevo (email), Supabase (data hosting), and Google (maps and analytics). These providers process data on our behalf and are bound by their own privacy policies.</li>
              <li><strong>Legal Requirements:</strong> We may disclose information when required by law, court order, or government regulation.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">5. Data Security</h2>
            <p className="text-sm leading-relaxed text-charcoal/80">
              We implement appropriate technical and organizational measures to protect your personal information against
              unauthorized access, alteration, disclosure, or destruction. This includes encrypted data transmission (HTTPS),
              secure cloud hosting, and access controls. However, no method of transmission over the Internet is 100% secure,
              and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">6. Data Retention</h2>
            <p className="text-sm leading-relaxed text-charcoal/80">
              We retain your personal information for as long as necessary to fulfill the purposes for which it was collected,
              including to satisfy legal, accounting, or reporting requirements. Booking records are retained for a minimum of
              7 years as required for business and tax purposes. You may request deletion of your personal information by
              contacting us, subject to our legal retention obligations.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">7. Cookies & Analytics</h2>
            <p className="text-sm leading-relaxed text-charcoal/80">
              Our website uses cookies and similar technologies for analytics and functionality purposes.
              We use Google Analytics 4 (GA4) and Google Tag Manager to understand website usage.
              These tools collect anonymous data about your browsing behaviour. You can opt out of Google Analytics
              by installing the Google Analytics opt-out browser add-on.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">8. Your Rights</h2>
            <p className="text-sm leading-relaxed text-charcoal/80 mb-3">Under Canadian privacy legislation, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-charcoal/80">
              <li>Access the personal information we hold about you.</li>
              <li>Request correction of inaccurate personal information.</li>
              <li>Request deletion of your personal information (subject to legal requirements).</li>
              <li>Withdraw consent for the processing of your personal information.</li>
              <li>File a complaint with the Office of the Privacy Commissioner of Canada.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">9. Changes to This Policy</h2>
            <p className="text-sm leading-relaxed text-charcoal/80">
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date.
              We encourage you to review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">10. Contact Us</h2>
            <p className="text-sm leading-relaxed text-charcoal/80">
              If you have questions about this Privacy Policy or wish to exercise your privacy rights, please contact us:
            </p>
            <div className="mt-3 bg-bg rounded-card p-5 text-sm space-y-1 text-charcoal/80">
              <p><strong>Calgary Oaths</strong> — Operated by Cethos Solutions Inc.</p>
              <p>Email: <a href="mailto:info@calgaryoaths.com" className="text-gold hover:underline">info@calgaryoaths.com</a></p>
              <p>Phone: <a href="tel:5876000746" className="text-gold hover:underline">(587) 600-0746</a></p>
              <p>Website: <a href="https://calgaryoaths.com" className="text-gold hover:underline">calgaryoaths.com</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
