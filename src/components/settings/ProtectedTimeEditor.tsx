'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';

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
  { value: 0, label: 'Sun', short: 'S' },
  { value: 1, label: 'Mon', short: 'M' },
  { value: 2, label: 'Tue', short: 'T' },
  { value: 3, label: 'Wed', short: 'W' },
  { value: 4, label: 'Thu', short: 'T' },
  { value: 5, label: 'Fri', short: 'F' },
  { value: 6, label: 'Sat', short: 'S' },
];

const PRESETS = [
  {
    label: 'Weekday mornings',
    days: [1, 2, 3, 4, 5],
    start: '06:00',
    end: '09:00',
  },
  {
    label: 'Lunch daily',
    days: [0, 1, 2, 3, 4, 5, 6],
    start: '12:00',
    end: '13:00',
  },
  {
    label: 'Weekday evenings',
    days: [1, 2, 3, 4, 5],
    start: '17:00',
    end: '19:00',
  },
  {
    label: 'Weekend mornings',
    days: [0, 6],
    start: '08:00',
    end: '11:00',
  },
];

// Week preview component
function WeekPreview({ protectedTimes }: { protectedTimes: ProtectedTime[] }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getBlocksForDay = (day: number) => {
    return protectedTimes
      .filter(pt => pt.days.includes(day))
      .map(pt => {
        const [startH, startM] = pt.start.split(':').map(Number);
        const [endH, endM] = pt.end.split(':').map(Number);
        const startPercent = ((startH * 60 + startM) / (24 * 60)) * 100;
        const endPercent = ((endH * 60 + endM) / (24 * 60)) * 100;
        return {
          start: startPercent,
          width: endPercent - startPercent,
          label: pt.label || 'Protected',
        };
      });
  };

  return (
    <div className="mt-6 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-light)]">
      <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Week Preview
      </h4>

      {/* Time labels */}
      <div className="flex mb-1 text-[10px] text-[var(--text-tertiary)]">
        <div className="w-10 flex-shrink-0" />
        <div className="flex-1 flex justify-between px-0.5">
          <span>12am</span>
          <span>6am</span>
          <span>12pm</span>
          <span>6pm</span>
          <span>12am</span>
        </div>
      </div>

      <div className="space-y-1">
        {DAY_OPTIONS.map((day) => {
          const blocks = getBlocksForDay(day.value);
          return (
            <div key={day.value} className="flex items-center gap-2">
              <span className="w-10 text-xs text-[var(--text-secondary)] flex-shrink-0">
                {day.label}
              </span>
              <div className="flex-1 h-6 bg-[var(--bg-tertiary)] rounded relative overflow-hidden">
                {/* Work hours indicator (9-5) */}
                <div
                  className="absolute h-full bg-[var(--bg-elevated)] opacity-30"
                  style={{ left: '37.5%', width: '33.33%' }}
                />
                {/* Protected time blocks */}
                {blocks.map((block, idx) => (
                  <div
                    key={idx}
                    className="absolute h-full bg-[var(--accent-primary)] opacity-70 rounded-sm"
                    style={{ left: `${block.start}%`, width: `${block.width}%` }}
                    title={block.label}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 text-[10px] text-[var(--text-tertiary)]">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-[var(--bg-elevated)] opacity-30 rounded-sm" />
          <span>Work hours</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-[var(--accent-primary)] opacity-70 rounded-sm" />
          <span>Protected time</span>
        </div>
      </div>
    </div>
  );
}

export function ProtectedTimeEditor({ protectedTimes, onChange, isSaving }: ProtectedTimeEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ProtectedTime | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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
    setValidationErrors({});
  };

  const handleAddPreset = (preset: typeof PRESETS[number]) => {
    const newTime: ProtectedTime = {
      label: preset.label,
      days: [...preset.days],
      start: preset.start,
      end: preset.end,
    };
    const newTimes = [...protectedTimes, newTime];
    onChange(newTimes);
    setShowPresets(false);
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
    setValidationErrors({});
  };

  const validateForm = useCallback((form: ProtectedTime): boolean => {
    const errors: Record<string, string> = {};

    if (form.days.length === 0) {
      errors.days = 'Select at least one day';
    }

    if (!form.start) {
      errors.start = 'Start time is required';
    }

    if (!form.end) {
      errors.end = 'End time is required';
    }

    if (form.start && form.end && form.start >= form.end) {
      errors.end = 'End time must be after start time';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, []);

  const handleSaveEdit = () => {
    if (editingIndex === null || !editForm) return;

    if (!validateForm(editForm)) return;

    const newTimes = protectedTimes.map((time, i) =>
      i === editingIndex ? editForm : time
    );
    onChange(newTimes);
    setEditingIndex(null);
    setEditForm(null);
    setValidationErrors({});
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditForm(null);
    setValidationErrors({});
  };

  const toggleDay = (day: number) => {
    if (!editForm) return;

    const newDays = editForm.days.includes(day)
      ? editForm.days.filter(d => d !== day)
      : [...editForm.days, day].sort((a, b) => a - b);

    setEditForm({ ...editForm, days: newDays });

    // Clear day validation error if we now have days selected
    if (newDays.length > 0 && validationErrors.days) {
      setValidationErrors(prev => {
        const { days, ...rest } = prev;
        return rest;
      });
    }
  };

  const selectDayGroup = (group: 'weekdays' | 'weekends' | 'all') => {
    if (!editForm) return;

    let newDays: number[];
    switch (group) {
      case 'weekdays':
        newDays = [1, 2, 3, 4, 5];
        break;
      case 'weekends':
        newDays = [0, 6];
        break;
      case 'all':
        newDays = [0, 1, 2, 3, 4, 5, 6];
        break;
    }

    setEditForm({ ...editForm, days: newDays });
    if (validationErrors.days) {
      setValidationErrors(prev => {
        const { days, ...rest } = prev;
        return rest;
      });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newTimes = [...protectedTimes];
    const draggedItem = newTimes[draggedIndex];
    newTimes.splice(draggedIndex, 1);
    newTimes.splice(index, 0, draggedItem);

    onChange(newTimes);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
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
        title={
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Protected Times
          </span>
        }
        subtitle="Block time that should be kept free from meetings"
        action={
          <div className="flex gap-2">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPresets(!showPresets)}
                disabled={isSaving}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Add
              </Button>

              <AnimatePresence>
                {showPresets && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 top-full mt-1 z-10 w-56 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-lg shadow-lg overflow-hidden"
                  >
                    <div className="p-2">
                      <p className="text-xs text-[var(--text-tertiary)] px-2 py-1 mb-1">Presets</p>
                      {PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAddPreset(preset)}
                          className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-md transition-colors"
                        >
                          <div className="font-medium">{preset.label}</div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            {formatTime(preset.start)} - {formatTime(preset.end)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleAdd}
              disabled={isSaving}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Block
            </Button>
          </div>
        }
      />

      {protectedTimes.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-[var(--text-secondary)] mb-2">No protected time blocks configured</p>
          <p className="text-sm text-[var(--text-tertiary)] mb-4">
            Add blocks to protect your personal time from meetings
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="secondary" size="sm" onClick={() => setShowPresets(true)}>
              Use Preset
            </Button>
            <Button variant="primary" size="sm" onClick={handleAdd}>
              Add Custom Block
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {protectedTimes.map((time, index) => (
                <motion.div
                  key={index}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  draggable={editingIndex !== index}
                  onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, index)}
                  onDragOver={(e) => handleDragOver(e as unknown as React.DragEvent, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-light)]
                    ${draggedIndex === index ? 'opacity-50' : ''}
                    ${editingIndex !== index ? 'cursor-grab active:cursor-grabbing' : ''}
                  `}
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
                          onChange={(e) => {
                            setEditForm({ ...editForm, start: e.target.value });
                            if (validationErrors.start) {
                              setValidationErrors(prev => {
                                const { start, ...rest } = prev;
                                return rest;
                              });
                            }
                          }}
                          error={validationErrors.start}
                        />
                        <Input
                          label="End Time"
                          type="time"
                          value={editForm.end}
                          onChange={(e) => {
                            setEditForm({ ...editForm, end: e.target.value });
                            if (validationErrors.end) {
                              setValidationErrors(prev => {
                                const { end, ...rest } = prev;
                                return rest;
                              });
                            }
                          }}
                          error={validationErrors.end}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-[var(--text-primary)]">
                            Days
                          </label>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => selectDayGroup('weekdays')}
                              className="px-2 py-0.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded transition-colors"
                            >
                              Weekdays
                            </button>
                            <button
                              type="button"
                              onClick={() => selectDayGroup('weekends')}
                              className="px-2 py-0.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded transition-colors"
                            >
                              Weekends
                            </button>
                            <button
                              type="button"
                              onClick={() => selectDayGroup('all')}
                              className="px-2 py-0.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded transition-colors"
                            >
                              All
                            </button>
                          </div>
                        </div>

                        {/* Pill-style day toggles */}
                        <div className="flex gap-1.5">
                          {DAY_OPTIONS.map((day) => (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => toggleDay(day.value)}
                              className={`
                                flex-1 py-2 rounded-full text-sm font-medium
                                transition-all duration-150
                                ${editForm.days.includes(day.value)
                                  ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-sm'
                                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                                }
                              `}
                            >
                              {day.short}
                            </button>
                          ))}
                        </div>
                        {validationErrors.days && (
                          <p className="mt-1.5 text-sm text-[var(--status-error)]">{validationErrors.days}</p>
                        )}
                      </div>

                      <div className="flex gap-2 justify-end pt-2 border-t border-[var(--border-light)]">
                        <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleSaveEdit}
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Drag handle */}
                        <div className="text-[var(--text-tertiary)] cursor-grab">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {time.label || 'Protected Time'}
                          </p>
                          <p className="text-sm text-[var(--text-secondary)]">
                            {formatTime(time.start)} - {formatTime(time.end)} | {formatDays(time.days)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(index)}
                          disabled={isSaving}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(index)}
                          disabled={isSaving}
                          className="text-[var(--status-error)] hover:text-[var(--status-error)] hover:bg-red-500/10"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Week Preview */}
          <WeekPreview protectedTimes={protectedTimes} />
        </>
      )}
    </Card>
  );
}
