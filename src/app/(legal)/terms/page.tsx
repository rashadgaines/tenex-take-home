export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8">Terms of Service</h1>

        <div className="space-y-6 text-[var(--text-secondary)]">
          <p className="text-sm text-[var(--text-tertiary)]">Last updated: January 28, 2025</p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Tenex (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">2. Description of Service</h2>
            <p>
              Tenex is an AI-powered calendar assistant that helps you manage your schedule, analyze your time usage,
              and communicate more effectively. The Service integrates with your Google Calendar and Gmail to provide
              personalized scheduling assistance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">3. Account Registration</h2>
            <p>
              To use the Service, you must sign in with a valid Google account. You are responsible for maintaining
              the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">4. Google API Services</h2>
            <p>
              The Service uses Google API Services to access your calendar and email data. By using the Service,
              you also agree to be bound by the Google API Services User Data Policy, including the Limited Use requirements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">5. Permitted Use</h2>
            <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Use the Service in any way that violates applicable laws or regulations</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Use the Service to transmit harmful or malicious content</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">6. AI-Generated Content</h2>
            <p>
              The Service uses artificial intelligence to generate suggestions, summaries, and draft communications.
              While we strive for accuracy, AI-generated content may contain errors. You are responsible for reviewing
              and approving any actions taken through the Service, including emails sent on your behalf.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">7. Intellectual Property</h2>
            <p>
              The Service and its original content, features, and functionality are owned by Tenex and are protected
              by international copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">8. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
              WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">9. Limitation of Liability</h2>
            <p>
              IN NO EVENT SHALL TENEX BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
              INCLUDING LOSS OF PROFITS, DATA, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">10. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of any material changes
              by posting the new Terms on this page. Your continued use of the Service after such modifications
              constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">11. Termination</h2>
            <p>
              We may terminate or suspend your access to the Service immediately, without prior notice, for any reason,
              including breach of these Terms. Upon termination, your right to use the Service will cease immediately.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">12. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at support@tenex.app.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-[var(--border-medium)]">
          <a
            href="/login"
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            &larr; Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}
