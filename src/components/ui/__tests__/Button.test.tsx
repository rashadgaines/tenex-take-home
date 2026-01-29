import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

// Mock framer-motion to simplify testing
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, whileTap, transition, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
  HTMLMotionProps: {},
}));

// Mock LoadingSpinner
vi.mock('../LoadingSpinner', () => ({
  LoadingSpinner: ({ size, color }: any) => (
    <div data-testid="loading-spinner" data-size={size} data-color={color}>
      Loading...
    </div>
  ),
}));

describe('Button Component', () => {
  describe('rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>);

      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('should render button with children', () => {
      render(
        <Button>
          <span data-testid="child">Child content</span>
        </Button>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should render without children', () => {
      render(<Button />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('should apply primary variant styles by default', () => {
      render(<Button>Primary</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-[var(--accent-primary)]');
    });

    it('should apply secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-[var(--bg-tertiary)]');
    });

    it('should apply ghost variant styles', () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-transparent');
    });

    it('should apply danger variant styles', () => {
      render(<Button variant="danger">Danger</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-[var(--status-error)]');
    });
  });

  describe('sizes', () => {
    it('should apply medium size by default', () => {
      render(<Button>Medium</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('px-4');
      expect(button.className).toContain('py-2');
    });

    it('should apply small size styles', () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('px-3');
      expect(button.className).toContain('py-1.5');
    });

    it('should apply large size styles', () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('px-5');
      expect(button.className).toContain('py-2.5');
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when isLoading is true', () => {
      render(<Button isLoading>Loading</Button>);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should disable button when isLoading is true', () => {
      render(<Button isLoading>Loading</Button>);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should not show loading spinner when isLoading is false', () => {
      render(<Button isLoading={false}>Not Loading</Button>);

      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    it('should pass correct props to loading spinner', () => {
      render(<Button isLoading>Loading</Button>);

      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveAttribute('data-size', 'sm');
      expect(spinner).toHaveAttribute('data-color', 'current');
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should apply disabled styles', () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('disabled:opacity-50');
      expect(button.className).toContain('disabled:cursor-not-allowed');
    });

    it('should be disabled when both disabled and isLoading are true', () => {
      render(
        <Button disabled isLoading>
          Both
        </Button>
      );

      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('click handler', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click</Button>);

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn();
      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      );

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', () => {
      const handleClick = vi.fn();
      render(
        <Button onClick={handleClick} isLoading>
          Loading
        </Button>
      );

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
    });

    it('should merge custom className with default classes', () => {
      render(<Button className="my-custom-class" variant="primary">Merged</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('my-custom-class');
      expect(button.className).toContain('bg-[var(--accent-primary)]');
    });
  });

  describe('HTML attributes', () => {
    it('should pass through type attribute', () => {
      render(<Button type="submit">Submit</Button>);

      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('should pass through aria-label', () => {
      render(<Button aria-label="Close dialog">X</Button>);

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Close dialog');
    });

    it('should pass through data attributes', () => {
      render(<Button data-testid="my-button">Test</Button>);

      expect(screen.getByTestId('my-button')).toBeInTheDocument();
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to button element', () => {
      const ref = vi.fn();
      render(<Button ref={ref}>Ref Button</Button>);

      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('display name', () => {
    it('should have correct display name', () => {
      expect(Button.displayName).toBe('Button');
    });
  });

  describe('accessibility', () => {
    it('should have correct role', () => {
      render(<Button>Accessible</Button>);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should be focusable when not disabled', () => {
      render(<Button>Focusable</Button>);

      const button = screen.getByRole('button');
      button.focus();

      expect(document.activeElement).toBe(button);
    });

    it('should have focus-visible styles', () => {
      render(<Button>Focus Visible</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('focus-visible:outline-none');
    });
  });

  describe('variant and size combinations', () => {
    const variants = ['primary', 'secondary', 'ghost', 'danger'] as const;
    const sizes = ['sm', 'md', 'lg'] as const;

    variants.forEach((variant) => {
      sizes.forEach((size) => {
        it(`should render correctly with variant="${variant}" and size="${size}"`, () => {
          render(
            <Button variant={variant} size={size}>
              {variant} {size}
            </Button>
          );

          const button = screen.getByRole('button');
          expect(button).toBeInTheDocument();
          expect(button).not.toBeDisabled();
        });
      });
    });
  });
});
