
import React from 'react';

interface IconProps {
  className?: string;
}

// Placeholder Icon - replace with actual SVG if available
export const ShieldExclamationIcon: React.FC<IconProps> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className || "w-6 h-6"}
    aria-label="Shield Exclamation Icon"
  >
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.72a.75.75 0 011.06 0L12 9.69l.66-1.72a.75.75 0 111.416.54l-1.5 3.75a.75.75 0 01-1.114.46L9.22 10.28a.75.75 0 010-1.06zM12 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    {/* Simplified shield + exclamation based on common patterns, replace if you have a specific design */}
    <path d="M12 1.5a10.5 10.5 0 00-7.98 16.48L12 22.5l7.98-4.52A10.5 10.5 0 0012 1.5zm0 2.25a8.25 8.25 0 016.32 12.95L12 20.25l-6.32-3.55A8.25 8.25 0 0112 3.75z"/>
    <path fillRule="evenodd" d="M11.25 7.5V12h1.5V7.5h-1.5zm0 5.25v1.5h1.5v-1.5h-1.5z" clipRule="evenodd" />

  </svg>
);
