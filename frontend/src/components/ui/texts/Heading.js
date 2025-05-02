import React from 'react';

export const Heading = ({
  children,
  level = 1,
  size,
  color = 'default',
  align = 'left',
  className = '',
  withAccent = false,
  ...props
}) => {
  // Convert level to h1, h2, etc.
  const Tag = `h${level}`;
  
  // Size mapping - if no size is specified, use responsive default based on level
  const sizeClasses = {
    xs: 'text-sm md:text-base',
    sm: 'text-base md:text-lg',
    md: 'text-lg md:text-xl',
    lg: 'text-xl md:text-2xl',
    xl: 'text-2xl md:text-3xl',
    '2xl': 'text-3xl md:text-4xl',
    '3xl': 'text-4xl md:text-5xl',
  };
  
  // Default sizes based on heading level
  const defaultSizes = {
    1: sizeClasses['2xl'],
    2: sizeClasses.xl,
    3: sizeClasses.lg,
    4: sizeClasses.md,
    5: sizeClasses.sm,
    6: sizeClasses.xs,
  };
  
  // Color variants
  const colorClasses = {
    default: 'text-slate-50',
    primary: 'text-amber-400',
    secondary: 'text-slate-300',
    muted: 'text-slate-400',
    accent: 'text-amber-500',
    danger: 'text-red-500',
  };
  
  // Text alignment
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };
  
  // Accent line styles - only for levels 1-3
  const accentClasses = withAccent && level <= 3 
    ? 'border-b border-amber-600/30 pb-2 mb-4' 
    : '';
  
  return (
    <Tag
      className={`
        font-semibold mb-3
        ${size ? sizeClasses[size] : defaultSizes[level]}
        ${colorClasses[color]}
        ${alignClasses[align]}
        ${accentClasses}
        ${className}
      `}
      {...props}
    >
      {children}
    </Tag>
  );
};

export default Heading;