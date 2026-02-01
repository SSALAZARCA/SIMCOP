
import React from 'react';

interface IconProps {
  className?: string;
}

// Updated ShareIcon to represent "Publish" or "Send"
export const ShareIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className || "w-5 h-5"}>
    <path d="M13 4.5a2.5 2.5 0 11.702 4.291 2.513 2.513 0 01-.093.303l-3.36 3.36a2.5 2.5 0 11-1.506-.885l3.36-3.36a2.513 2.513 0 01.093-.303A2.5 2.5 0 0113 4.5zM4.5 13a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM13 15.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
     {/* Adding a more distinct "publish" or "send" element like an arrow */}
    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h4.75a.75.75 0 010-1.5H4.5V3.5h11v5.75a.75.75 0 01-1.5 0V3.5A1.5 1.5 0 0014 2H4.5z" clipRule="evenodd" />
  </svg>
);