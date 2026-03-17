import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
}

export function IconButton({ icon, variant = 'ghost', size = 'md', className = '', ...props }: IconButtonProps) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 dark:focus:ring-blue-400 border border-transparent shadow-sm',
    secondary: 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 focus:ring-gray-300 dark:focus:ring-slate-500 border border-gray-200 dark:border-slate-600 shadow-sm',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 dark:focus:ring-red-400 border border-transparent shadow-sm',
    ghost: 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-slate-100 focus:ring-gray-300 dark:focus:ring-slate-500 border border-transparent shadow-none',
  };
  
  const sizes = { 
    sm: 'p-1.5', // 6px padding
    md: 'p-2'    // 8px padding
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {icon}
    </button>
  );
}
