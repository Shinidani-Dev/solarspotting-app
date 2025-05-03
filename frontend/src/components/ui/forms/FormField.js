import React from 'react';

export default function FormField({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder = '',
  className = '',
  ...props
}) {
  // For checkbox type, we need a different layout
  if (type === 'checkbox') {
    return (
      <div className={`flex items-center py-2 space-x-2 ${className}`}>
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={value}
          onChange={onChange}
          className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500"
          {...props}
        />
        <label className="mb-0 form-label" htmlFor={id}>
          {label}
        </label>
        {error && <p className="error-msg">{error}</p>}
      </div>
    );
  }

  // For text and number inputs
  return (
    <div className={className}>
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className="form-input"
        placeholder={placeholder}
        {...props}
      />
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}