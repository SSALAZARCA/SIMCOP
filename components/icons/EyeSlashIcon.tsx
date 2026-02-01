
import React from 'react';

interface IconProps {
  className?: string;
}
export const EyeSlashIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-6 h-6"}>
    <path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.31l-3.099-3.099a5.25 5.25 0 00-6.71-6.71L7.759 4.577a11.217 11.217 0 014.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113z" />
    <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c.662 0 1.313.061 1.952.176l-1.72 1.72a3.751 3.751 0 00-4.409 4.409l-1.72 1.72A9.732 9.732 0 001.322 11.447z" clipRule="evenodd" />
    <path d="M15.75 12c0 .099.008.196.023.29L11.48 8.012A5.239 5.239 0 0115.75 12z" />
  </svg>
);
