import React from 'react';

function Input({
  label,
  helper,
  error,
  className = '',
  ...props
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-ink-secondary">
          {label}
        </label>
      )}
      <input
        className={`
          h-8 px-2.5 rounded bg-surface-sunken border
          text-sm text-ink-primary placeholder:text-ink-muted
          focus:outline-none focus:ring-2 focus:ring-accent-blue/50
          transition-colors duration-150
          ${error ? 'border-accent-red' : 'border-line hover:border-line-bright'}
          ${className}
        `}
        {...props}
      />
      {(helper || error) && (
        <span className={`text-xs ${error ? 'text-accent-red' : 'text-ink-muted'}`}>
          {error || helper}
        </span>
      )}
    </div>
  );
}

export default Input;
