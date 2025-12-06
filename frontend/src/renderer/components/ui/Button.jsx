import React from 'react';

const variants = {
  primary: 'bg-accent-blue hover:bg-accent-blue/90 text-white',
  ghost: 'bg-transparent hover:bg-state-hover text-ink-primary',
  subtle: 'bg-surface-raised hover:bg-surface-highest text-ink-primary',
  danger: 'bg-accent-red hover:bg-accent-red/90 text-white',
};

const sizes = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-8 px-3 text-sm',
  lg: 'h-10 px-4 text-base',
};

function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  className = '',
  ...props
}) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-1.5 rounded font-medium
        transition-colors duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
