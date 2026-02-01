
import React from 'react';

interface IconProps {
  className?: string;
}
export const ShieldCheckIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-6 h-6"}>
    <path fillRule="evenodd" d="M12.001 2.25c-5.384 0-9.75 4.366-9.75 9.75s4.366 9.75 9.75 9.75 9.75-4.366 9.75-9.75S17.385 2.25 12.001 2.25zm4.128 6.387a.75.75 0 00-1.06-1.06L11.253 11.38a.75.75 0 00-.002 1.061l2.5 2.5a.75.75 0 101.06-1.06l-1.97-1.97 3.29-3.287zM8.372 8.637a.75.75 0 00-1.061 1.06l1.97 1.97-1.97 1.97a.75.75 0 101.061 1.06l2.5-2.5a.75.75 0 000-1.06l-2.5-2.5z" clipRule="evenodd" />
  </svg>
);
    