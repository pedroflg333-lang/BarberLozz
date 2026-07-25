import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({ icon, title, description, action, className = '' }: EmptyStateProps) => (
  <div className={`flex flex-col items-center justify-center text-center py-12 md:py-16 px-6 ${className}`}>
    <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mb-4">
      {icon || <Inbox className="w-6 h-6" />}
    </div>
    <h3 className="text-base md:text-lg font-bold text-text-primary m-0">{title}</h3>
    {description && (
      <p className="text-sm text-text-secondary mt-1.5 max-w-xs leading-relaxed m-0">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
