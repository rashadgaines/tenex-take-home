'use client';

import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface ProtectedTime {
  label?: string;
  start: string;
  end: string;
  days: number[];
}

interface ProtectedTimeEditorProps {
  protectedTimes: ProtectedTime[];
  onChange: (times: ProtectedTime[]) => void;
  isSaving?: boolean;
}

const DAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export function ProtectedTimeEditor({ protectedTimes, onChange, isSaving }: ProtectedTimeEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ProtectedTime | null>(null);

  const handleAdd = () => {
    const newTime: ProtectedTime = {
      label: 'New Protected Time',
      days: [1, 2, 3, 4, 5], // Mon-Fri default
      start: '12:00',
      end: '13:00',
    };
    const newTimes = [...protectedTimes, newTime];
    onChange(newTimes);
    setEditingIndex(newTimes.length - 1);
    setEditForm(newTime);
  };

  const handleDelete = (index: number) => {
    const newTimes = protectedTimes.filter((_, i) => i !== index);
    onChange(newTimes);
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditForm(null);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...protectedTimes[index] });
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !editForm) return;

    const newTimes = protectedTimes.map((time, i) =>
      i === editingIndex ? editForm : time
    );
    onChange(newTimes);
    setEditingIndex(null);
    setEditForm(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const toggleDay = (day: number) => {
    if (!editForm) return;

    const newDays = editForm.days.includes(day)
      ? editForm.days.filter(d => d !== day)
      : [...editForm.days, day].sort((a, b) => a - b);

    setEditForm({ ...editForm, days: newDays });
  };

  const formatDays = (days: number[]): string => {
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && days.every(d => d >= 1 && d <= 5)) return 'Weekdays';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
    return days.map(d => DAY_OPTIONS[d].label).join(', ');
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <Card padding="lg">
      <CardHeader
        title="Protected Times"
        subtitle="Block time that should be kept free from meetings"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAdd}
            disabled={isSaving}
          >
            Add Block
          </Button>
        }
      />

      {protectedTimes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[var(--text-secondary)] mb-4">
            No protected time blocks configured
          </p>
          <Button variant="primary" size="sm" onClick={handleAdd}>
            Add Your First Block
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {protectedTimes.map((time, index) => (
            <div
              key={index}
              className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-light)]"
            >
              {editingIndex === index && editForm ? (
                // Edit Mode
                <div className="space-y-4">
                  <Input
                    label="Label (optional)"
                    value={editForm.label || ''}
                    onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                    placeholder="e.g., Morning workout, Lunch break"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Start Time"
                      type="time"
                      value={editForm.start}
                      onChange={(e) => setEditForm({ ...editForm, start: e.target.value })}
                    />
                    <Input
                      label="End Time"
                      type="time"
                      value={editForm.end}
                      onChange={(e) => setEditForm({ ...editForm, end: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Days
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DAY_OPTIONS.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className={`
                            px-3 py-1.5 rounded-lg text-sm font-medium
                            transition-colors duration-150
                            ${editForm.days.includes(day.value)
                              ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                            }
                          `}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={editForm.days.length === 0}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      {time.label || 'Protected Time'}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {formatTime(time.start)} - {formatTime(time.end)} | {formatDays(time.days)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(index)}
                      disabled={isSaving}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(index)}
                      disabled={isSaving}
                      className="text-[var(--status-error)] hover:text-[var(--status-error)]"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
