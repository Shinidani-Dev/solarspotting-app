import React from 'react';

export const Input = ({ 
  label,
  id,
  type = 'text',
  placeholder = '',
  error = '',
  helperText = '',
  className = '',
  ...props 
}) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        className={`form-input ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
        {...props}
      />
      {helperText && !error && (
        <p className="text-slate-400 text-sm mt-1">{helperText}</p>
      )}
      {error && (
        <p className="error-msg">{error}</p>
      )}
    </div>
  );
};

export default Input;