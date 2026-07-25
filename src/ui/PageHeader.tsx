import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: (() => void) | string;
  actions?: ReactNode;
  className?: string;
}

export const PageHeader = ({ title, subtitle, backTo, actions, className = '' }: PageHeaderProps) => (
  <div className={`flex items-start justify-between gap-4 mb-6 md:mb-8 ${className}`}>
    <div className="flex items-start gap-3 min-w-0">
      {backTo && (
        <button
          onClick={typeof backTo === 'function' ? backTo : undefined}
          className="mt-0.5 w-9 h-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center shrink-0 transition-btn focus-ring cursor-pointer"
          aria-label="Volver"
        >
          <ArrowLeft className="w-4 h-5 text-neutral-600" />
        </button>
      )}
      <div className="min-w-0">
        <h1 className="text-xl md:text-3xl font-black text-text-primary m-0 truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm text-text-secondary mt-0.5 m-0 truncate">{subtitle}</p>
        )}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);
