
import React from 'react';

interface IconProps {
  className?: string;
}
export const ShieldCheckIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-6 h-6"}>
    <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.208 11.208 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.99 0-5.723-1.105-7.817-3.08Zm3.03 8.358a.75.75 0 1 0-1.06-1.06l-3.232 3.232-1.207-1.207a.75.75 0 0 0-1.06 1.06l1.737 1.737a.75.75 0 0 0 1.06 0l3.762-3.762Z" clipRule="evenodd" />
  </svg>
);
    