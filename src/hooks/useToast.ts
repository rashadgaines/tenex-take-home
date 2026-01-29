'use client';

import { useContext, useCallback } from 'react';
import { ToastContext, ToastContextValue } from '@/components/ui/ToastProvider';

export interface ToastOptions {
  duration?: number;
}

export interface ToastMethods {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
}

export interface UseToastReturn {
  toast: ToastMethods;
}

export function useToast(): UseToastReturn {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  const { addToast } = context as ToastContextValue;

  const success = useCallback(
    (message: string, options?: ToastOptions) => {
      addToast(message, 'success', options?.duration);
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, options?: ToastOptions) => {
      addToast(message, 'error', options?.duration);
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, options?: ToastOptions) => {
      addToast(message, 'warning', options?.duration);
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, options?: ToastOptions) => {
      addToast(message, 'info', options?.duration);
    },
    [addToast]
  );

  return {
    toast: {
      success,
      error,
      warning,
      info,
    },
  };
}
