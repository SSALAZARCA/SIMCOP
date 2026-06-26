
import React from 'react';

interface IconProps {
  className?: string;
}

export const ArrowTopRightOnSquareIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className || "w-5 h-5"}>
    <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 000 1.5h5.69l-8.22 8.22a.75.75 0 001.06 1.06l8.22-8.22v5.69a.75.75 0 001.5 0v-8.5a.75.75 0 00-.75-.75h-8.5a.75.75 0 00-.75.75z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M5 2.5a.75.75 0 00-.75.75v6.5c0 .414.336.75.75.75h6.5a.75.75 0 00.75-.75V9A.75.75 0 0114 9v1.25A2.25 2.25 0 0111.75 12.5h-6.5A2.25 2.25 0 013 10.25v-6.5A2.25 2.25 0 015.25 1.5H9A.75.75 0 019 3H5.25A.75.75 0 004.5 3.75V4A.75.75 0 015 3.25V2.5z" clipRule="evenodd" />
  </svg>
);
