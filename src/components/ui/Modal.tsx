import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  dir?: 'ltr' | 'rtl';
}

export function Modal({ open, onClose, title, children, size = 'md', dir }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose ?? undefined} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        dir={dir}
        className={`modal-enter relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg w-full ${widths[size]} mx-4 max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 id="modal-title" className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className={`absolute top-3 right-3 rtl:right-auto rtl:left-3 text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 p-2.5 rounded-full text-xl leading-none transition-colors duration-150 ${!onClose ? 'hidden' : ''}`}
          >
            <span className="sr-only">Close</span>
            ×
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
