import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const session = await auth();

  if (session) {
    redirect('/brief');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-xl w-full space-y-12 py-16">
          {/* Hero */}
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-medium)] flex items-center justify-center">
              <svg className="w-10 h-10 text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[var(--text-primary)]">Tenex</h1>
              <p className="mt-3 text-lg text-[var(--text-secondary)]">
                AI-powered calendar assistant that helps you manage your time smarter.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="grid gap-4 text-sm">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-medium)] flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">Daily Briefings</p>
                <p className="text-[var(--text-tertiary)]">Get AI-generated summaries of your schedule and priorities.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-medium)] flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">Smart Scheduling</p>
                <p className="text-[var(--text-tertiary)]">Chat with AI to find optimal meeting times and manage conflicts.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-medium)] flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">Time Analytics</p>
                <p className="text-[var(--text-tertiary)]">Understand how you spend your time with visual insights.</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-4">
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-[var(--border-medium)] rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center text-xs text-[var(--text-tertiary)]">
        <div className="space-x-4">
          <Link href="/privacy" className="hover:text-[var(--text-secondary)] transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-[var(--text-secondary)] transition-colors">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}
