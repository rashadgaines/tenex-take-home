'use client';

import { ReactNode } from 'react';
import { TopNav } from './TopNav';

interface AppShellProps {
  children: ReactNode;
  user?: {
    name: string;
    email: string;
    image?: string | null;
  } | null;
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      {/* Top Navigation */}
      <TopNav user={user} />

      {/* Main Content */}
      <div className="flex flex-col min-h-screen pt-14">
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
