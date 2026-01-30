import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import React from 'react';
import { ChatInput } from '../ChatInput';

describe('ChatInput', () => {
  it('exposes focus() via ref and focuses the textarea', async () => {
    const onSend = vi.fn();
    const ref = React.createRef<{ focus: () => void }>();

    render(<ChatInput ref={ref} onSend={onSend} placeholder="Test input" />);

    // Call the exposed focus method
    ref.current?.focus();

    const textarea = screen.getByPlaceholderText('Test input') as HTMLTextAreaElement;
    expect(document.activeElement).toBe(textarea);
  });
});
