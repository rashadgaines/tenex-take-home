'use client';

import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { motion, AnimatePresence } from 'framer-motion';

interface AccountSectionProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onDisconnect: () => void;
  isDisconnecting?: boolean;
}

export function AccountSection({ user, onDisconnect, isDisconnecting }: AccountSectionProps) {
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const handleDisconnect = () => {
    onDisconnect();
    setShowDisconnectConfirm(false);
  };

  return (
    <Card padding="lg">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Connected Account
          </span>
        }
        subtitle="Your linked Google account for calendar sync"
      />

      <div className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-light)]">
        <Avatar
          src={user.image}
          name={user.name || 'User'}
          size="lg"
        />

        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--text-primary)] truncate">
            {user.name || 'User'}
          </p>
          <p className="text-sm text-[var(--text-secondary)] truncate">
            {user.email}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs text-[var(--text-tertiary)]">Connected via Google</span>
          </div>
        </div>

        {/* Google logo indicator */}
        <div className="flex-shrink-0 p-2 bg-[var(--bg-tertiary)] rounded-lg">
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        </div>
      </div>

      {/* Permissions info */}
      <div className="mt-4 space-y-2">
        <p className="text-sm font-medium text-[var(--text-primary)]">Connected permissions:</p>
        <div className="flex flex-wrap gap-2">
          {['Calendar', 'Events', 'Gmail Send'].map((perm) => (
            <span
              key={perm}
              className="px-2 py-1 text-xs bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-full"
            >
              {perm}
            </span>
          ))}
        </div>
      </div>

      {/* Disconnect section */}
      <div className="mt-4 pt-4 border-t border-[var(--border-light)]">
        <AnimatePresence mode="wait">
          {!showDisconnectConfirm ? (
            <motion.div
              key="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDisconnectConfirm(true)}
                className="text-[var(--text-secondary)]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Disconnect account
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
            >
              <p className="text-sm text-[var(--text-primary)] mb-3">
                Are you sure you want to disconnect your Google account? You will need to sign in again to use calendar features.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDisconnectConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDisconnect}
                  isLoading={isDisconnecting}
                >
                  Disconnect
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}
