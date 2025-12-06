import React from 'react';

function Panel({
  header,
  footer,
  className = '',
  children,
  ...props
}) {
  return (
    <div
      className={`
        flex flex-col bg-surface-raised border border-line rounded-lg overflow-hidden
        ${className}
      `}
      {...props}
    >
      {header && (
        <div className="px-3 py-2 border-b border-line bg-surface-highest">
          {typeof header === 'string' ? (
            <h3 className="text-sm font-medium text-ink-primary">{header}</h3>
          ) : (
            header
          )}
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
      {footer && (
        <div className="px-3 py-2 border-t border-line bg-surface-highest">
          {footer}
        </div>
      )}
    </div>
  );
}

export default Panel;
