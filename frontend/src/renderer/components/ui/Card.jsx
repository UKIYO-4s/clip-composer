import React from 'react';

function Card({
  padding = 'md',
  elevated = false,
  outlined = true,
  className = '',
  children,
  ...props
}) {
  const paddings = {
    none: '',
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };

  return (
    <div
      className={`
        rounded-md bg-surface-raised
        ${outlined ? 'border border-line' : ''}
        ${elevated ? 'shadow' : ''}
        ${paddings[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
