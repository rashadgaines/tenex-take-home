'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar } from '@/components/ui';

interface NavItem {
  href: string;
  label: string;
}

const navItems: NavItem[] = [
  { href: '/brief', label: 'Brief' },
  { href: '/plan', label: 'Plan' },
  { href: '/time', label: 'Time' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/settings', label: 'Settings' },
];

interface TopNavProps {
  user?: {
    name: string;
    email: string;
    image?: string | null;
  } | null;
}

export function TopNav({ user }: TopNavProps) {
  const pathname = usePathname();
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsRef = useRef<(HTMLAnchorElement | null)[]>([]);

  // Find active index
  const activeIndex = navItems.findIndex(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  // Update indicator position
  useEffect(() => {
    const activeTab = tabsRef.current[activeIndex];
    if (activeTab) {
      const { offsetLeft, offsetWidth } = activeTab;
      setIndicatorStyle({ left: offsetLeft, width: offsetWidth });
    }
  }, [activeIndex, pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/brief" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-medium)] flex items-center justify-center">
              <svg className="w-4 h-4 text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-semibold text-[var(--text-primary)]">Tenex</span>
          </Link>

          {/* Navigation Tabs */}
          <nav className="relative flex items-center">
            {/* Animated Indicator */}
            <div
              className="absolute bottom-0 h-0.5 bg-[var(--accent-primary)] transition-all duration-300 ease-out"
              style={{
                left: indicatorStyle.left,
                width: indicatorStyle.width,
              }}
            />

            {/* Tab Items */}
            <div className="flex items-center">
              {navItems.map((item, index) => {
                const isActive = activeIndex === index;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    ref={(el) => { tabsRef.current[index] = el; }}
                    className={`
                      relative px-4 py-4
                      text-sm font-medium
                      transition-colors duration-150
                      ${isActive
                        ? 'text-[var(--accent-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }
                    `}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            {user ? (
              <button className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
                <Avatar src={user.image} name={user.name} size="sm" />
                <span className="text-sm font-medium text-[var(--text-primary)] hidden sm:block">
                  {user.name.split(' ')[0]}
                </span>
              </button>
            ) : (
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
                <div className="w-7 h-7 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
