import { type SelectHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, className = '', id, children, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide text-start ">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          "bg-white dark:bg-slate-700 border text-gray-900 dark:text-slate-100 border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm shadow-sm text-start",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400",
          "transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
