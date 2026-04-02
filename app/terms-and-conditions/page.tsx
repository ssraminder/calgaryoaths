// Terms & Conditions page — cancellation policy (12h rule), customer responsibilities
// (valid ID, unsigned docs), commissioner cancellation rights (invalid ID, misrepresentation,
// incomplete docs), drafting services, mobile/virtual terms, and governing law.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Terms and conditions for Calgary Oaths commissioning services, including cancellation policy, refund policy, and customer responsibilities.',
};

export default function TermsAndConditionsPage() {
  return (
    <div className="py-12 lg:py-20">
      <div className="max-content max-w-3xl mx-auto">
        <h1 className="font-display font-bold text-3xl lg:text-4xl text-charcoal mb-2">Terms & Conditions</h1>
        <p className="text-mid-grey text-sm mb-10">Last updated: April 2, 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-charcoal">
          {/* 1. Services */}
          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">1. Services</h2>
            <p className="text-sm leading-relaxed text-charcoal/80">
              Calgary Oaths, operated by Cethos Solutions Inc. (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), provides Commissioner of Oaths and related
              document services through our website at calgaryoaths.com. By booking an appointment or using our
              services, you (&ldquo;the customer&rdquo;, &ldquo;you&rdquo;) agree to be bound by these Terms & Conditions.
            </p>
            <p className="text-sm leading-relaxed text-charcoal/80 mt-3">
              Our services include, but are not limited to: commissioning of oaths, affidavits, statutory declarations,
              travel consent letters, certified true copies, and document drafting. Services are performed by licensed
              Commissioners of Oaths in the Province of Alberta.
            </p>
          </section>

          {/* 2. Booking & Payment */}
          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">2. Booking & Payment</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-charcoal/80">
              <li>All bookings are made through our online booking system. Payment is required at the time of booking to secure your appointment.</li>
              <li>The booking fee covers the base service for one document. Additional documents, pages, or services beyond the standard scope may incur additional charges, which will be communicated to you before or at the beginning of your appointment.</li>
              <li>Prices displayed on the website are in Canadian Dollars (CAD) and include applicable convenience fees and taxes as shown during checkout.</li>
              <li>A booking request is not a confirmed appointment. Your commissioner will review the request and confirm it. <strong>Your appointment is not final until it is confirmed by the commissioner.</strong></li>
              <li>We accept payment via credit card and debit card through our secure payment processor (Stripe). We do not store your payment card details.</li>
            </ul>
          </section>

          {/* 3. Cancellation Policy */}
          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">3. Cancellation Policy</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-card p-5 mb-4">
              <h3 className="font-semibold text-amber-800 text-sm mb-2">Summary</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-amber-800">
                <li><strong>More than 12 hours before appointment:</strong> Full refund. You may cancel at no charge.</li>
                <li><strong>Within 12 hours of appointment:</strong> No refund. The cancellation will be treated as a no-show.</li>
              </ul>
            </div>
            <ul className="list-disc pl-5 space-y-2 text-sm text-charcoal/80">
              <li>You may cancel your appointment using the cancellation link provided in your booking confirmation email.</li>
              <li>Cancellations made <strong>more than 12 hours</strong> before the scheduled appointment time are eligible for a full refund of the booking fee. Refunds are processed to the original payment method and may take 5&ndash;10 business days to appear.</li>
              <li>Cancellations made <strong>within 12 hours</strong> of the scheduled appointment time are treated as a no-show, and <strong>no refund will be issued</strong>.</li>
              <li>If you fail to appear for your appointment without prior notice (no-show), no refund will be issued.</li>
              <li>We reserve the right to cancel or reschedule appointments due to unforeseen circumstances, emergencies, or operational requirements. In such cases, you will be offered a full refund or the option to reschedule at no additional cost.</li>
            </ul>
          </section>

          {/* 4. Customer Responsibilities */}
          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">4. Customer Responsibilities</h2>
            <p className="text-sm leading-relaxed text-charcoal/80 mb-3">
              To ensure your appointment proceeds smoothly, you are responsible for the following:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-charcoal/80">
              <li><strong>Valid Identification:</strong> You must present a valid, government-issued photo ID (e.g., driver&apos;s licence, passport, permanent resident card) at the time of your appointment. Expired identification will not be accepted.</li>
              <li><strong>Document Preparation:</strong> You must bring all required documents to the appointment. Documents must be complete, accurate, and ready for commissioning. <strong>Do not sign documents before the appointment</strong> &mdash; they must be signed in the presence of the commissioner.</li>
              <li><strong>Accuracy & Truthfulness:</strong> All information provided in your documents and to the commissioner must be truthful and accurate. You are swearing or affirming under oath that the contents of your documents are true. Providing false information is a criminal offence under Canadian law.</li>
              <li><strong>Timeliness:</strong> Please arrive on time for your appointment. If you are more than 15 minutes late, the appointment may be cancelled and treated as a no-show.</li>
              <li><strong>Additional Signers:</strong> If your service requires multiple signers (e.g., joint affidavits), all parties must be present with valid government-issued photo ID.</li>
            </ul>
          </section>

          {/* 5. Appointment Cancellation by Commissioner */}
          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">5. Cancellation by Commissioner (No Refund)</h2>
            <p className="text-sm leading-relaxed text-charcoal/80 mb-3">
              The commissioner reserves the right to cancel an appointment without a refund if any of the following conditions apply:
            </p>
            <div className="bg-red-50 border border-red-200 rounded-card p-5">
              <ul className="list-disc pl-5 space-y-2 text-sm text-red-800">
                <li><strong>Invalid or Missing Identification:</strong> You do not present a valid, government-issued photo ID, or the ID presented is expired, damaged, or does not match your identity.</li>
                <li><strong>Incomplete or Improperly Prepared Documents:</strong> Your documents are incomplete, contain blank fields that should have been filled in, or are otherwise not ready for commissioning.</li>
                <li><strong>Misrepresentation or Fraud:</strong> There is evidence of misrepresentation, false information, or suspected fraud in the documents or in the identity of the person appearing.</li>
                <li><strong>Refusal to Take Oath or Affirmation:</strong> You refuse to swear or affirm the contents of the document as required by law.</li>
                <li><strong>Intoxication or Incapacity:</strong> You appear to be under the influence of drugs or alcohol, or otherwise unable to understand the nature and consequences of the oath or affirmation.</li>
                <li><strong>Abusive or Threatening Behaviour:</strong> You engage in abusive, threatening, or disrespectful behaviour toward the commissioner or staff.</li>
                <li><strong>Legal or Ethical Concerns:</strong> The commissioner has reasonable grounds to believe that commissioning the document would be unlawful, unethical, or contrary to professional obligations.</li>
                <li><strong>Service Scope Beyond Booking:</strong> The documents or service required are materially different from or more complex than what was booked, and you decline to pay any additional fees that may apply.</li>
              </ul>
            </div>
            <p className="text-sm leading-relaxed text-charcoal/80 mt-3">
              In any of the above circumstances, the appointment will be terminated, and <strong>no refund will be issued</strong>.
              The commissioner&apos;s time and availability have been reserved for your appointment, and the cancellation is a direct
              result of the customer&apos;s failure to meet the requirements.
            </p>
          </section>

          {/* 6. Drafting Services */}
          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">6. Drafting Services</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-charcoal/80">
              <li>Some services include document drafting (e.g., affidavit writing). The booking fee covers the basic drafting service for standard, straightforward documents.</li>
              <li>If your needs require additional effort, research, or time beyond the standard scope, you will be informed of any additional charges <strong>before your appointment begins</strong>. You may choose to proceed or cancel at that time.</li>
              <li>Drafted documents are prepared based on the information you provide. We are not responsible for errors resulting from incorrect or incomplete information provided by you.</li>
              <li>Drafting services do not constitute legal advice. We recommend consulting a lawyer for complex legal matters.</li>
            </ul>
          </section>

          {/* 7. Mobile & Virtual Services */}
          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">7. Mobile & Virtual Services</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-charcoal/80">
              <li>Mobile services are subject to a travel fee based on the distance from the commissioner&apos;s office to your location. This fee is calculated and displayed during booking.</li>
              <li>For mobile appointments, you must ensure the meeting location is safe, accessible, and suitable for conducting the commissioning.</li>
              <li>Virtual appointments are available for select services only. You will receive a video call link after booking. You must have a stable internet connection, a device with camera and microphone, and valid photo ID visible on camera.</li>
              <li>The same cancellation policy applies to mobile and virtual appointments.</li>
            </ul>
          </section>

          {/* 8. Limitation of Liability */}
          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">8. Limitation of Liability</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-charcoal/80">
              <li>Our services are limited to commissioning oaths and affirmations, certifying documents, and related administrative services. We do not provide legal advice, and our services should not be construed as such.</li>
              <li>We are not responsible for the legal validity, accuracy, or sufficiency of any document you bring for commissioning. It is your responsibility to ensure your documents are correct and suitable for their intended purpose.</li>
              <li>Our total liability to you for any claim arising from our services is limited to the amount you paid for the specific service giving rise to the claim.</li>
              <li>We are not liable for any indirect, consequential, or incidental damages arising from the use of our services.</li>
            </ul>
          </section>

          {/* 9. Privacy */}
          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">9. Privacy</h2>
            <p className="text-sm leading-relaxed text-charcoal/80">
              We collect and process personal information in accordance with our{' '}
              <a href="/privacy-policy" className="text-gold hover:underline">Privacy Policy</a>.
              Information collected during booking and appointments is used solely for the purpose of providing our services
              and is handled in compliance with applicable Canadian privacy legislation.
            </p>
          </section>

          {/* 10. Modifications */}
          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">10. Modifications</h2>
            <p className="text-sm leading-relaxed text-charcoal/80">
              We reserve the right to update or modify these Terms & Conditions at any time. Changes will be effective
              immediately upon posting on this page. Your continued use of our services after any changes constitutes
              acceptance of the updated terms. We encourage you to review this page periodically.
            </p>
          </section>

          {/* 11. Governing Law */}
          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">11. Governing Law</h2>
            <p className="text-sm leading-relaxed text-charcoal/80">
              These Terms & Conditions are governed by and construed in accordance with the laws of the Province of Alberta
              and the federal laws of Canada applicable therein. Any disputes arising from these terms or our services shall
              be subject to the exclusive jurisdiction of the courts of Alberta.
            </p>
          </section>

          {/* 12. Contact */}
          <section>
            <h2 className="font-display font-semibold text-xl text-charcoal border-b border-border pb-2 mb-4">12. Contact Us</h2>
            <p className="text-sm leading-relaxed text-charcoal/80">
              If you have any questions about these Terms & Conditions, please contact us:
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
