'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface UndoableAction<T> {
  id: string;
  data: T;
  timestamp: number;
  description: string;
}

export interface UseUndoOptions {
  maxItems?: number; // Maximum number of undoable actions to track
  expirationMs?: number; // Time in ms before actions expire
}

export interface UseUndoReturn<T> {
  undoableActions: UndoableAction<T>[];
  addUndoableAction: (id: string, data: T, description: string) => void;
  removeUndoableAction: (id: string) => void;
  getUndoableAction: (id: string) => UndoableAction<T> | undefined;
  clearAll: () => void;
  hasUndoableActions: boolean;
}

const DEFAULT_MAX_ITEMS = 5;
const DEFAULT_EXPIRATION_MS = 30000; // 30 seconds

export function useUndo<T>(options: UseUndoOptions = {}): UseUndoReturn<T> {
  const {
    maxItems = DEFAULT_MAX_ITEMS,
    expirationMs = DEFAULT_EXPIRATION_MS
  } = options;

  const [actions, setActions] = useState<UndoableAction<T>[]>([]);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup expired actions periodically
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      setActions((prev) =>
        prev.filter((action) => now - action.timestamp < expirationMs)
      );
    };

    // Run cleanup every second
    cleanupIntervalRef.current = setInterval(cleanup, 1000);

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [expirationMs]);

  const addUndoableAction = useCallback(
    (id: string, data: T, description: string) => {
      const newAction: UndoableAction<T> = {
        id,
        data,
        timestamp: Date.now(),
        description,
      };

      setActions((prev) => {
        // Remove any existing action with the same id
        const filtered = prev.filter((a) => a.id !== id);
        // Add new action at the beginning
        const updated = [newAction, ...filtered];
        // Limit to maxItems
        return updated.slice(0, maxItems);
      });
    },
    [maxItems]
  );

  const removeUndoableAction = useCallback((id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const getUndoableAction = useCallback(
    (id: string): UndoableAction<T> | undefined => {
      return actions.find((a) => a.id === id);
    },
    [actions]
  );

  const clearAll = useCallback(() => {
    setActions([]);
  }, []);

  return {
    undoableActions: actions,
    addUndoableAction,
    removeUndoableAction,
    getUndoableAction,
    clearAll,
    hasUndoableActions: actions.length > 0,
  };
}

// Specialized hook for calendar event undo
export interface UndoableCalendarEvent {
  eventId: string;
  googleEventId?: string;
}

export function useCalendarUndo() {
  return useUndo<UndoableCalendarEvent>({
    maxItems: 5,
    expirationMs: 30000, // 30 seconds
  });
}
