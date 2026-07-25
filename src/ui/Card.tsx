import type { HTMLAttributes } from 'react';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padding?: CardPadding;
}

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3 md:p-4',
  md: 'p-4 md:p-6',
  lg: 'p-4 md:p-8',
};

export const Card = ({ hoverable = false, padding = 'md', className = '', children, ...props }: CardProps) => (
  <div
    className={`bg-surface rounded-card border border-border shadow-card transition-card ${paddingStyles[padding]} ${hoverable ? 'hover:shadow-card-hover' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

/* Convenient sub-components for card layout */

export const CardHeader = ({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex items-center justify-between gap-3 ${className}`} {...props}>
    {children}
  </div>
);

export const CardBody = ({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={className} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex items-center justify-end gap-3 pt-4 border-t border-border mt-4 ${className}`} {...props}>
    {children}
  </div>
);
