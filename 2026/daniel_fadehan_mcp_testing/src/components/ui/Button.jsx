import { forwardRef } from 'react';

const variants = {
  default: 'bg-neutral-900 text-white hover:bg-neutral-800',
  secondary: 'bg-muted text-neutral-900 hover:bg-neutral-200',
  ghost: 'hover:bg-muted text-neutral-600 hover:text-neutral-900',
  outline: 'border border-border hover:bg-muted text-neutral-900',
};

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-5 text-sm',
  icon: 'h-8 w-8',
};

export const Button = forwardRef(({
  className = '',
  variant = 'default',
  size = 'md',
  children,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      className={`
        inline-flex items-center justify-center
        font-medium rounded-md
        transition-colors duration-150
        focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';
