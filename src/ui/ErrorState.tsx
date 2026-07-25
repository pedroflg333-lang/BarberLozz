import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
  className?: string;
}

export const ErrorState = ({ title = 'Algo sali\u00f3 mal', message, retry, className = '' }: ErrorStateProps) => (
  <div className={`flex flex-col items-center justify-center text-center py-12 md:py-16 px-6 ${className}`}>
    <div className="w-14 h-14 rounded-2xl bg-error-bg text-error flex items-center justify-center mb-4">
      <AlertCircle className="w-6 h-6" />
    </div>
    <h3 className="text-base md:text-lg font-bold text-text-primary m-0">{title}</h3>
    <p className="text-sm text-text-secondary mt-1.5 max-w-xs leading-relaxed m-0">{message}</p>
    {retry && (
      <Button variant="outline" size="sm" className="mt-4" onClick={retry}>
        Intentar de nuevo
      </Button>
    )}
  </div>
);
