
import React from 'react';

interface IconProps {
  className?: string;
}

export const UsersIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-6 h-6"}>
    <path d="M11.03 3.97a.75.75 0 010 1.06l-6.22 6.22a.75.75 0 01-1.06-1.06l6.22-6.22a.75.75 0 011.06 0zM1.5 12a1.5 1.5 0 011.5-1.5h18a1.5 1.5 0 010 3H3A1.5 1.5 0 011.5 12zm11.47 8.03a.75.75 0 011.06 0l6.22-6.22a.75.75 0 111.06 1.06l-6.22 6.22a.75.75 0 01-1.06-1.06z" />
    <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM19.5 11.25a.75.75 0 01.75.75v2.25a3 3 0 01-3 3h-3.75a.75.75 0 010-1.5h3.75a1.5 1.5 0 001.5-1.5V12a.75.75 0 01.75-.75zm-15-2.25A.75.75 0 015.25 9v2.25a1.5 1.5 0 001.5 1.5h3.75a.75.75 0 010 1.5H6.75a3 3 0 01-3-3V9.75a.75.75 0 01.75-.75z" />
  </svg>
);