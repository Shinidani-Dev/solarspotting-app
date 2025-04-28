import React from 'react';

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-amber-500 text-slate-900 hover:bg-amber-400 active:bg-amber-600 focus:ring-amber-500',
    secondary: 'bg-slate-700 text-slate-100 hover:bg-slate-600 active:bg-slate-800 border border-slate-600 focus:ring-slate-500',
    outline: 'bg-transparent border border-amber-500 text-amber-500 hover:bg-amber-500/10 focus:ring-amber-500',
    ghost: 'bg-transparent text-amber-400 hover:bg-slate-800 focus:ring-amber-400',
    danger: 'bg-red-600 text-white hover:bg-red-500 active:bg-red-700 focus:ring-red-500',
  };
  
  const sizes = {
    sm: 'text-xs px-2.5 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-3',
  };
  
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  
  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabledStyles} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;