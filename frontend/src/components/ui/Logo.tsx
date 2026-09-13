import React from 'react';
import { useUIStore } from '../../state/useUIStore';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = 'h-9 w-auto object-contain' }) => {
  const { theme } = useUIStore();
  return (
    <img
      src={theme === 'neo-light' ? '/light-icon.jpg' : '/dark-icon.jpg'}
      alt="Snyprr.ai"
      className={className}
    />
  );
};
