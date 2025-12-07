import React from 'react';
import { BUTTON_SIZE, RADIUS, TRANSITION, DURATION } from '../design-tokens';

export interface IconButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'active' | 'danger';
  size?: 'icon' | 'primary';
  disabled?: boolean;
  ariaLabel: string;
  title?: string;
  className?: string;
}

const variantStyles = {
  default: 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-zinc-100',
  active: 'bg-zinc-200 dark:bg-white/20 text-zinc-900 dark:text-white',
  danger: 'text-zinc-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500'
} as const;

export const IconButton: React.FC<IconButtonProps> = ({
  onClick,
  children,
  variant = 'default',
  size = 'icon',
  disabled = false,
  ariaLabel,
  title,
  className = ''
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title || ariaLabel}
      className={`
        ${size === 'icon' ? BUTTON_SIZE.icon : BUTTON_SIZE.primary}
        flex items-center justify-center
        ${RADIUS.full}
        ${TRANSITION.colors} ${DURATION.normal}
        ${disabled ? 'opacity-30 cursor-not-allowed' : variantStyles[variant]}
        active:scale-95
        ${className}
      `}
    >
      {children}
    </button>
  );
};

export default IconButton;
