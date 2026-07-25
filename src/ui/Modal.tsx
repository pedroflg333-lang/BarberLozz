import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const sheetVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring' as const, damping: 30, stiffness: 300 } },
  exit: { y: '100%', opacity: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const } },
};

const dialogVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: 'spring' as const, damping: 30, stiffness: 300 } },
  exit: { scale: 0.95, opacity: 0, transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] as const } },
};

export const Modal = ({ open, onClose, title, children, maxWidth = 'max-w-md', className = '' }: ModalProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Tab' && contentRef.current) {
      const focusable = contentRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => contentRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus());
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      if (previousActiveElement.current instanceof HTMLElement) previousActiveElement.current.focus();
    };
  }, [open, handleKeyDown]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={contentRef}
            variants={window.innerWidth < 768 ? sheetVariants : dialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`relative w-full md:rounded-modal md:m-4 rounded-t-3xl max-h-[85vh] overflow-y-auto bg-surface shadow-modal ${maxWidth} ${className}`}
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-surface z-10 flex items-center justify-between p-4 md:p-6 border-b border-border">
              {title && <h2 className="text-lg md:text-xl font-black text-text-primary m-0">{title}</h2>}
              <button
                onClick={onClose}
                className="ml-auto w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center transition-btn focus-ring cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-4 h-5 text-neutral-500" />
              </button>
            </div>
            <div className="p-4 md:p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
