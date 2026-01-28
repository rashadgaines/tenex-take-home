'use client';

import { Card } from '@/components/ui';
import { Button } from '@/components/ui';
import { ActionItem } from '@/types';

interface ActionCardProps {
  item: ActionItem;
  onAction: (action: string, payload?: unknown) => void;
}

const typeIcons: Record<ActionItem['type'], React.ReactNode> = {
  scheduling_request: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  email_reply: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  ),
  conflict: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  reminder: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
};

const typeColors: Record<ActionItem['type'], string> = {
  scheduling_request: 'text-[var(--text-secondary)] bg-[var(--bg-tertiary)]',
  email_reply: 'text-[var(--status-success)] bg-emerald-900/20',
  conflict: 'text-[var(--status-warning)] bg-amber-900/20',
  reminder: 'text-[var(--text-secondary)] bg-[var(--bg-tertiary)]',
};

export function ActionCard({ item, onAction }: ActionCardProps) {
  return (
    <Card padding="md" className="mb-3">
      <div className="flex gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColors[item.type]}`}>
          {typeIcons[item.type]}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-[var(--text-primary)]">{item.title}</h4>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{item.description}</p>
          <div className="flex gap-2 mt-3">
            {item.actions.map((action, index) => (
              <Button
                key={action.label}
                variant={index === 0 ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onAction(action.action, action.payload)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
