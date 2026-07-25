import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

type InputVariant = 'light' | 'dark';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  icon?: ReactNode;
}

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  variant?: InputVariant;
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
}

const variantStyles: Record<InputVariant, string> = {
  light: 'bg-white border-border text-text-primary placeholder:text-text-tertiary',
  dark: 'bg-surface-dark-muted border-border-dark text-text-inverse placeholder:text-neutral-500',
};

function useInputStyles(variant: InputVariant, error?: string, success?: boolean) {
  const base = `w-full rounded-btn px-4 py-3 text-sm border outline-none transition-btn focus-ring ${variantStyles[variant]}`;
  const state =
    error ? 'border-error text-error'
    : success ? 'border-success' : '';
  return `${base} ${state}`.trim();
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'light', label, error, success, helperText, icon, className = '', id: externalId, ...props }, ref) => {
    const generatedId = useId();
    const id = externalId || generatedId;
    const styles = useInputStyles(variant, error, success);

    return (
      <div className={`w-full space-y-1.5 ${className}`}>
        {label && (
          <label htmlFor={id} className={`block text-sm font-semibold ${variant === 'dark' ? 'text-neutral-300' : 'text-text-primary'}`}>
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none shrink-0 flex items-center justify-center">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            className={`${styles} ${icon ? 'pl-11' : ''}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
            {...props}
          />
        </div>
        {error && (
          <p id={`${id}-error`} className="text-xs font-medium text-error" role="alert">{error}</p>
        )}
        {helperText && !error && (
          <p id={`${id}-helper`} className="text-xs text-text-tertiary">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ variant = 'light', label, error, success, helperText, className = '', id: externalId, ...props }, ref) => {
    const generatedId = useId();
    const id = externalId || generatedId;
    const styles = useInputStyles(variant, error, success);

    return (
      <div className={`w-full space-y-1.5 ${className}`}>
        {label && (
          <label htmlFor={id} className={`block text-sm font-semibold ${variant === 'dark' ? 'text-neutral-300' : 'text-text-primary'}`}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={`${styles} min-h-[100px] resize-y`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          {...props}
        />
        {error && (
          <p id={`${id}-error`} className="text-xs font-medium text-error" role="alert">{error}</p>
        )}
        {helperText && !error && (
          <p id={`${id}-helper`} className="text-xs text-text-tertiary">{helperText}</p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
