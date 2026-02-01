import React from 'react';

interface IconProps {
  className?: string;
}

export const TankIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className || "w-5 h-5"}>
    <path d="M2 5.5A2.5 2.5 0 014.5 3h11A2.5 2.5 0 0118 5.5v2.563a.75.75 0 00.497.713l1.903.951a.75.75 0 010 1.274l-1.903.952a.75.75 0 00-.497.713V14.5A2.5 2.5 0 0115.5 17h-11A2.5 2.5 0 012 14.5V5.5zM5 6.75V9h1V6.75H5zm3.75 0V9h1V6.75h-1zm2.5 0V9h1V6.75h-1zm3.75 0V9h1V6.75h-1z" />
    <path fillRule="evenodd" d="M8.75 3.5A.75.75 0 019.5 2.75h1A.75.75 0 0111.25 3.5v4.563a.75.75 0 000 .374V10.25A.75.75 0 0010.5 11h-1A.75.75 0 008.75 10.25V8.437a.75.75 0 000-.374V3.5z" clipRule="evenodd" />
  </svg>
);