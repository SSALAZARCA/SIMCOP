import React from 'react';

interface IconProps {
  className?: string;
}

export const TrashIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className || "w-5 h-5"}>
    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75H4.5a.75.75 0 000 1.5h11a.75.75 0 000-1.5H14A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.536.344 2.074.926A3.014 3.014 0 0113 6.575V16.5a1.75 1.75 0 01-1.75 1.75h-2.5A1.75 1.75 0 017 16.5V6.575a3.014 3.014 0 01.926-1.65C8.464 4.344 9.16 4 10 4zM7.58 7.653a2.014 2.014 0 012.536-1.247.75.75 0 00.668-1.336 3.514 3.514 0 00-4.408 2.183.75.75 0 101.204.7z" clipRule="evenodd" />
  </svg>
);