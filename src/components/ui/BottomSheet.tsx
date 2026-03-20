import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  isDark?: boolean;
}

export function BottomSheet({ open, onClose, title, children, isDark }: Props) {
  const surfaceCard = isDark ? '#0f172a' : '#ffffff';
  const onSurface = isDark ? '#f1f5f9' : '#2c3437';
  const onSurfaceVariant = isDark ? '#94a3b8' : '#596064';
  const handleColor = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(172,179,183,0.5)';
  const closeBg = isDark ? 'rgba(30,41,59,0.8)' : '#eaeff2';

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed bottom-0 start-0 end-0 z-50 rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ backgroundColor: surfaceCard }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: handleColor }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-4">
          <h3 className="text-base font-bold font-heebo tracking-tight" style={{ color: onSurface }}>{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors active:opacity-70"
            style={{ backgroundColor: closeBg, color: onSurfaceVariant }}
            aria-label="Close"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Content */}
        <div
          className="overflow-y-auto"
          style={{
            maxHeight: '65vh',
            paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
