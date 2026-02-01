
import React from 'react';

interface IconProps {
  className?: string;
}

export const RulerIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className || "w-5 h-5"}>
    <path fillRule="evenodd" d="M5.003 3.003a.75.75 0 01.94-.526l10.56 2.816a.75.75 0 01.526.94L14.213 16.8a.75.75 0 01-.94.526L2.713 14.51a.75.75 0 01-.526-.94L4.997 3.003H5zm1.504 1.384L5.59 7.08l3.04-1.14V4.387zm2.25 1.5v1.36L7.09 8.387l3.04-1.14V5.887zm2.25 1.5v1.36L9.34 9.887l3.04-1.14V7.387zm2.25 1.5v1.36l-1.667.625L14.66 11.387l-1.16-.435V8.887zM6.84 9.32l3.04-1.14v1.58l-3.04 1.14V9.32zm2.25 1.58l3.04-1.14v1.58l-3.04 1.14v-1.58zm2.25 1.58l3.04-1.14v1.58l-3.04 1.14v-1.58zM5.953 8.22l-1.08 2.97 2.97-1.08.027-.075L5.953 8.22z" clipRule="evenodd" />
  </svg>
);