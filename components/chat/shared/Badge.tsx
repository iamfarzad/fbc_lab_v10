import React from 'react';
import { RADIUS, TEXT_SIZE, TRANSITION, DURATION, BORDER, BG } from '../design-tokens';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'status' | 'metadata' | 'tool';
  active?: boolean;
  pulse?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

const variantStyles = {
  status: `
    px-3 py-1
    ${BORDER.default}
    ${BG.card} backdrop-blur-sm
    ${TEXT_SIZE.metadata} font-medium tracking-wide
  `,
  metadata: `
    px-2.5 py-1
    bg-zinc-100 dark:bg-zinc-800
    ${TEXT_SIZE.metadata} font-mono
  `,
  tool: `
    px-2 py-1.5
    bg-zinc-100 dark:bg-zinc-800/50
    border-zinc-200 dark:border-zinc-700
    ${TEXT_SIZE.metadata} font-medium font-mono uppercase tracking-wider
  `
} as const;

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'status',
  active = false,
  pulse = false,
  icon,
  className = ''
}) => {
  return (
    <div
      className={`
        inline-flex items-center justify-center gap-1.5
        ${RADIUS.full}
        ${variant === 'tool' ? 'rounded-lg' : RADIUS.full}
        ${TRANSITION.colors} ${DURATION.normal}
        ${variantStyles[variant]}
        ${active ? 'ring-1 ring-zinc-400/30 dark:ring-white/20' : ''}
        ${className}
      `}
    >
      {icon && (
        <div className="relative flex items-center justify-center">
          {icon}
          {pulse && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-zinc-500 dark:bg-zinc-300 rounded-full animate-pulse shadow-sm" />
          )}
        </div>
      )}
      <span className="opacity-90">{children}</span>
    </div>
  );
};

export default Badge;
