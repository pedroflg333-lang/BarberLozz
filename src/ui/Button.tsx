import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-black text-white hover:bg-neutral-900 border border-transparent shadow-card',
  secondary: 'bg-gold text-black hover:bg-gold-dark border border-gold shadow-card',
  ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 border border-transparent',
  danger: 'bg-red-600 text-white hover:bg-red-700 border border-transparent shadow-card',
  outline: 'bg-transparent text-neutral-700 hover:bg-neutral-50 border border-border',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-xs gap-1.5',
  md: 'px-4 py-3 text-sm gap-2',
  lg: 'px-5 py-3.5 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, icon, className = '', children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-bold rounded-btn transition-btn focus-ring cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin shrink-0" />
      ) : icon ? (
        <span className="w-4 h-4 shrink-0 flex items-center justify-center">{icon}</span>
      ) : null}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
