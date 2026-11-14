import React from 'react';
import { KahootShapeType } from '../data/chests';

interface KahootShapeProps {
  shape: KahootShapeType;
  className?: string;
}

export const KahootShape: React.FC<KahootShapeProps> = ({
  shape,
  className = 'w-5 h-5',
}) => {
  if (shape === 'triangle') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M12 3L22 20H2L12 3Z" />
      </svg>
    );
  }
  if (shape === 'diamond') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M12 2L22 12L12 22L2 12L12 2Z" />
      </svg>
    );
  }
  if (shape === 'circle') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
    </svg>
  );
};
