'use client';

interface SkipLinkProps {
  href?: string;
  children?: React.ReactNode;
}

export function SkipLink({ href = '#main-content', children = 'Skip to main content' }: SkipLinkProps) {
  return (
    <a
      href={href}
      className="
        sr-only
        focus:not-sr-only
        focus:fixed
        focus:top-4
        focus:left-4
        focus:z-[100]
        focus:px-4
        focus:py-2
        focus:bg-[var(--accent-primary)]
        focus:text-[var(--bg-primary)]
        focus:rounded-lg
        focus:font-medium
        focus:outline-none
        focus:ring-2
        focus:ring-offset-2
        focus:ring-[var(--border-medium)]
      "
    >
      {children}
    </a>
  );
}
