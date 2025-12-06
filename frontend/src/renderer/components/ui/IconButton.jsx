import React from 'react';

const variants = {
  ghost: 'bg-transparent hover:bg-state-hover text-ink-secondary hover:text-ink-primary',
  subtle: 'bg-surface-raised hover:bg-surface-highest text-ink-secondary',
};

const sizes = {
  sm: 'w-6 h-6 text-sm',
  md: 'w-8 h-8 text-base',
  lg: 'w-10 h-10 text-lg',
};

function IconButton({
  variant = 'ghost',
  size = 'md',
  disabled = false,
  children,
  className = '',
  ...props
}) {
  return (
    <button
      className={`
        inline-flex items-center justify-center rounded
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

export default IconButton;
