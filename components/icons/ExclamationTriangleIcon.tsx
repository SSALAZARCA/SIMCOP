
import React from 'react';

interface IconProps {
  className?: string;
}

export const ExclamationTriangleIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className || "w-5 h-5"}>
    <path fillRule="evenodd" d="M8.485 2.495c.646-1.113 2.384-1.113 3.03 0l6.28 10.875a1.75 1.75 0 01-1.515 2.625H3.72a1.75 1.75 0 01-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
  </svg>
);
