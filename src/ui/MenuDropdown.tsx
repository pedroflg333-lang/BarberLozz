import { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import type { ReactNode } from 'react';

export interface MenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  icon?: ReactNode;
}

export interface MenuDropdownProps {
  items: MenuItem[];
  align?: 'left' | 'right';
  className?: string;
}

export const MenuDropdown = ({ items, align = 'right', className = '' }: MenuDropdownProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center transition-btn focus-ring cursor-pointer"
        aria-label="M\u00e1s opciones"
        aria-expanded={open}
      >
        <MoreVertical className="w-4 h-5 text-neutral-500" />
      </button>
      {open && (
        <div
          className={`absolute top-10 z-50 min-w-[140px] bg-surface rounded-xl border border-border shadow-menu py-1 overflow-hidden ${align === 'right' ? 'right-0' : 'left-0'}`}
          role="menu"
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-btn hover:bg-neutral-50 focus-ring cursor-pointer ${item.danger ? 'text-red-600' : 'text-text-primary'}`}
              role="menuitem"
            >
              {item.icon && <span className="w-4 h-4 shrink-0 flex items-center justify-center">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
