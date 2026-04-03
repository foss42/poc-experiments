import { forwardRef } from 'react';

export const Select = forwardRef(({
  label,
  options = [],
  error,
  placeholder,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`
          h-9 px-3 w-full
          text-sm text-neutral-900
          bg-white border border-border rounded-md
          transition-colors duration-150
          hover:border-border-hover
          focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-0 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
});

Select.displayName = 'Select';
