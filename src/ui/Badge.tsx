import type { ReactNode } from 'react';

export type BadgeVariant = 'pending' | 'confirmed' | 'cancelled' | 'web' | 'manual' | 'ai' | 'neutral' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  pending: 'bg-warning-bg text-warning border-warning-border',
  confirmed: 'bg-success-bg text-success border-success-border',
  cancelled: 'bg-error-bg text-error border-error-border',
  web: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  manual: 'bg-amber-50 text-amber-700 border-amber-200',
  ai: 'bg-gold/10 text-gold-dark border-gold/20',
  neutral: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  success: 'bg-success-bg text-success border-success-border',
  warning: 'bg-warning-bg text-warning border-warning-border',
  error: 'bg-error-bg text-error border-error-border',
  info: 'bg-info-bg text-info border-info-border',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px] gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
};

export const Badge = ({ variant = 'neutral', size = 'sm', dot = false, pulse = false, icon, className = '', children }: BadgeProps) => (
  <span
    className={`inline-flex items-center font-bold rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${pulse ? 'animate-pulse' : ''} ${className}`}
  >
    {dot && (
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${variant === 'pending' ? 'bg-warning' : variant === 'confirmed' ? 'bg-success' : variant === 'cancelled' ? 'bg-error' : 'bg-current'}`} />
    )}
    {icon && <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">{icon}</span>}
    {children}
  </span>
);
