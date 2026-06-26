import React from 'react';

interface IconProps {
  className?: string;
}
export const BinocularsIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-6 h-6"}>
    <path d="M11.25 6.375a2.625 2.625 0 115.25 0 2.625 2.625 0 01-5.25 0z" />
    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25c0 1.284.45 2.464 1.205 3.393a2.996 2.996 0 01-1.116 1.41 4.483 4.483 0 00-5.013 4.312 7.49 7.49 0 002.278 5.038 7.5 7.5 0 009.722 0 7.49 7.49 0 002.278-5.038 4.483 4.483 0 00-5.013-4.312 2.996 2.996 0 01-1.116-1.41A5.23 5.23 0 0017.25 6.75 5.25 5.25 0 0012 1.5zm-2.625 5.25a2.625 2.625 0 115.25 0 2.625 2.625 0 01-5.25 0z" clipRule="evenodd" />
  </svg>
);
