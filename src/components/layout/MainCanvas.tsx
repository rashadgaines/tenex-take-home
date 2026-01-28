'use client';

import { ReactNode } from 'react';

interface MainCanvasProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
}

export function MainCanvas({ children, title, subtitle, headerAction }: MainCanvasProps) {
  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-6">
        {(title || headerAction) && (
          <header className="mb-6">
            <div className="flex items-start justify-between">
              <div>
                {title && (
                  <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-1 text-[var(--text-secondary)]">
                    {subtitle}
                  </p>
                )}
              </div>
              {headerAction && <div>{headerAction}</div>}
            </div>
          </header>
        )}
        <main>{children}</main>
      </div>
    </div>
  );
}
