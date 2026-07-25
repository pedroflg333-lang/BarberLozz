import type { HTMLAttributes } from 'react';

export type SkeletonVariant = 'text' | 'card' | 'avatar' | 'title' | 'button';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  count?: number;
}

const variantStyles: Record<SkeletonVariant, string> = {
  text: 'h-4 w-full rounded-btn',
  card: 'h-32 w-full rounded-card',
  avatar: 'h-10 w-10 rounded-full shrink-0',
  title: 'h-6 w-1/2 rounded-btn',
  button: 'h-10 w-24 rounded-btn',
};

const Shimmer = ({ className = '' }: { className?: string }) => (
  <div className={`animate-shimmer ${className}`} />
);

export const Skeleton = ({ variant = 'text', count = 1, className = '', ...props }: SkeletonProps) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className={`space-y-2 ${className}`} {...props}>
        {variant === 'text' ? (
          <>
            <Shimmer className="h-4 w-full rounded-btn" />
            <Shimmer className="h-4 w-3/4 rounded-btn" />
          </>
        ) : variant === 'card' ? (
          <div className="space-y-3">
            <Shimmer className="h-4 w-1/3 rounded-btn" />
            <Shimmer className="h-4 w-1/2 rounded-btn" />
            <Shimmer className="h-10 w-full rounded-btn" />
          </div>
        ) : (
          <Shimmer className={variantStyles[variant]} />
        )}
      </div>
    ))}
  </>
);
