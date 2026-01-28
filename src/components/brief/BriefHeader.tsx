'use client';

interface BriefHeaderProps {
  greeting: string;
  date: Date;
  summary: string;
  userName?: string;
}

export function BriefHeader({ greeting, date, summary, userName }: BriefHeaderProps) {
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mb-6">
      <p className="text-sm text-[var(--text-secondary)] mb-1">{formattedDate}</p>
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">
        {greeting}{userName ? `, ${userName}` : ''}.
      </h1>
      <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl">
        {summary}
      </p>
    </div>
  );
}
