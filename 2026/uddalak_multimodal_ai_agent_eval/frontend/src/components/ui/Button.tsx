import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', style, ...props }) => {
  const getStyles = () => {
    switch (variant) {
      case 'accent':
        return {
          backgroundColor: 'var(--accent)',
          color: 'var(--surface-dim)',
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          border: '1px solid var(--surface-container-highest)',
          color: 'var(--primary)',
        };
      default:
        return {
          backgroundColor: 'var(--primary)',
          color: 'var(--surface-dim)',
        };
    }
  };

  return (
    <button
      style={{
        padding: '10px 20px',
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        ...getStyles(),
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
};
