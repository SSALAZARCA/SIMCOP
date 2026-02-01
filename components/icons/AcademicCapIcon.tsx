
import React from 'react';

interface IconProps {
  className?: string;
}
export const AcademicCapIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-6 h-6"}>
    <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v1.125c0 .612.248 1.188.684 1.624l3.376 3.375-3.376 3.375a2.25 2.25 0 00-.684 1.624V19.5A2.25 2.25 0 003.375 21.75h17.25A2.25 2.25 0 0022.5 19.5v-1.125c0-.612-.248-1.188-.684-1.624l-3.375-3.375 3.375-3.375a2.25 2.25 0 00.684-1.624V4.875A2.25 2.25 0 0020.625 3H3.375zM6 9.375l6-6 6 6-6 6-6-6z" />
  </svg>
);
