import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:scale-95 shadow-sm';
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/30 hover:shadow-md focus:ring-indigo-500 border border-transparent',
    secondary: 'bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-400 border border-gray-200 hover:shadow-md hover:border-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-red-500/30 hover:shadow-md focus:ring-red-500 border border-transparent',
    ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-400 border border-transparent shadow-none hover:shadow-none hover:translate-y-0 active:scale-100',
  };
  const sizes = { sm: 'px-2.5 py-1.5 text-sm', md: 'px-4 py-2 text-sm' };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />
  );
}
