import React from 'react';

function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  showValue = true,
  suffix = '',
  className = '',
  onChange,
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && (
            <label className="text-xs font-medium text-ink-secondary">
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-xs font-mono text-ink-muted">
              {value}{suffix}
            </span>
          )}
        </div>
      )}
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        className="
          w-full h-1.5 bg-surface-sunken rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-accent-blue
          [&::-webkit-slider-thumb]:hover:bg-accent-blue/80
          [&::-webkit-slider-thumb]:transition-colors
        "
        {...props}
      />
    </div>
  );
}

export default Slider;
