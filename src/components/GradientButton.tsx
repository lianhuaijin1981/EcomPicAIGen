import { type ReactNode } from 'react';

interface GradientButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'solid' | 'outline';
  className?: string;
}

export default function GradientButton({ children, onClick, variant = 'solid', className = '' }: GradientButtonProps) {
  if (variant === 'outline') {
    return (
      <button
        onClick={onClick}
        className={`px-6 py-3 border border-white text-white text-sm font-semibold tracking-wide rounded transition-all duration-300 hover:bg-white hover:text-[#131415] ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`gradient-btn px-5 py-2 text-white text-sm font-semibold tracking-wide rounded ${className}`}
    >
      {children}
    </button>
  );
}
