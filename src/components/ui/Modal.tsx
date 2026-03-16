import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`modal-enter relative bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full ${widths[size]} mx-4 max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
          <h2 id="modal-title" className="text-base sm:text-lg font-semibold text-slate-800 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 rtl:right-auto rtl:left-4 text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-full text-xl leading-none transition-colors"
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
