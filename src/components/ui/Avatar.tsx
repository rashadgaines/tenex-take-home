'use client';

import { HTMLAttributes, forwardRef } from 'react';
import Image from 'next/image';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

const sizePx = {
  sm: 32,
  md: 40,
  lg: 48,
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getColorFromName(name: string): string {
  const colors = [
    'bg-neutral-600',
    'bg-neutral-500',
    'bg-zinc-600',
    'bg-zinc-500',
    'bg-stone-600',
    'bg-stone-500',
    'bg-gray-600',
    'bg-gray-500',
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, name, size = 'md', className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          relative rounded-full overflow-hidden flex-shrink-0
          ${sizeStyles[size]}
          ${!src ? getColorFromName(name) : ''}
          ${className}
        `}
        {...props}
      >
        {src ? (
          <Image
            src={src}
            alt={name}
            width={sizePx[size]}
            height={sizePx[size]}
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white font-medium">
            {getInitials(name)}
          </div>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';
