
import React from 'react';

interface IconProps {
  className?: string;
}

export const AdjustmentsHorizontalIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className || "w-5 h-5"}>
    <path d="M3 4.25A2.25 2.25 0 015.25 2h9.5A2.25 2.25 0 0117 4.25v2.5A2.25 2.25 0 0114.75 9h-9.5A2.25 2.25 0 013 6.75v-2.5zM3 13.25A2.25 2.25 0 015.25 11h9.5A2.25 2.25 0 0117 13.25v2.5A2.25 2.25 0 0114.75 18h-9.5A2.25 2.25 0 013 15.75v-2.5zM5.25 4h9.5V2.75a.75.75 0 00-.75-.75h-8a.75.75 0 00-.75.75V4zM5.25 13h9.5V11.75a.75.75 0 00-.75-.75h-8a.75.75 0 00-.75.75V13z" />
  </svg>
);
