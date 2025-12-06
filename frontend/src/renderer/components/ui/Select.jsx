import React from 'react';

function Select({
  label,
  helper,
  error,
  options = [],
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
      <select
        className={`
          h-8 px-2.5 rounded bg-surface-sunken border
          text-sm text-ink-primary
          focus:outline-none focus:ring-2 focus:ring-accent-blue/50
          transition-colors duration-150
          ${error ? 'border-accent-red' : 'border-line hover:border-line-bright'}
          ${className}
        `}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {(helper || error) && (
        <span className={`text-xs ${error ? 'text-accent-red' : 'text-ink-muted'}`}>
          {error || helper}
        </span>
      )}
    </div>
  );
}

export default Select;
