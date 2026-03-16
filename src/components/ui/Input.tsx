import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-gray-500 uppercase tracking-wide text-left rtl:text-right">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`bg-white border text-gray-900 border-gray-200 rounded-lg px-3.5 py-2.5 text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150 ${className}`}
        {...props}
      />
    </div>
  );
}
