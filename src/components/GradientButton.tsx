import { type ReactNode } from 'react';

interface GradientButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'solid' | 'outline' | 'default';
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  disabled?: boolean;
}

export default function GradientButton({
  children,
  onClick,
  variant = 'solid',
  type = 'button',
  className = '',
  disabled = false,
}: GradientButtonProps) {
  if (variant === 'outline') {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`px-6 py-3 border border-white text-white text-sm font-semibold tracking-wide rounded transition-all duration-300 hover:bg-white hover:text-[#131415] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`gradient-btn px-5 py-2 text-white text-sm font-semibold tracking-wide rounded ${className}`}
    >
      {children}
    </button>
  );
}
