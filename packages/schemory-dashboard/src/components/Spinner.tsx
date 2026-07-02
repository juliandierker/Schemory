import React from 'react';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Spinner: React.FC<SpinnerProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-b-2',
    md: 'h-5 w-5 border-b-2',
    lg: 'h-6 w-6 border-b-2',
  };

  return (
    <div 
      className={`animate-spin rounded-full border-primary-600 dark:border-primary-400 ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
};

export default Spinner;
