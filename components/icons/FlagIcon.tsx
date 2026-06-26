import React from 'react';

interface IconProps {
  className?: string;
}

export const FlagIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className || "w-5 h-5"}>
    <path d="M3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0v-4.392A4.502 4.502 0 016.5 9.5h4.736a2.25 2.25 0 012.121 1.59L15.5 15.75H17a.75.75 0 000-1.5h-1.32a.75.75 0 00-.703-.487l-1.369-4.109A3.75 3.75 0 009.902 8H6.5a3.002 3.002 0 00-3-2.848V2.75z" />
  </svg>
);