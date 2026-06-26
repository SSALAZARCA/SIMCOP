import React from 'react';

interface IconProps {
  className?: string;
}

export const TruckIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-6 h-6"}>
    <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25zM13.5 15v-1.5H1.5V13.5c0 1.036.84 1.875 1.875 1.875h.375a3 3 0 116 0h3a3 3 0 116 0h.375a1.875 1.875 0 001.875-1.875V11.25A2.25 2.25 0 0018.75 9h-2.25a2.25 2.25 0 00-2.25 2.25V15h-1.5z" />
    <path fillRule="evenodd" d="M3 9.75A.75.75 0 013.75 9h.75a.75.75 0 010 1.5h-.75A.75.75 0 013 9.75zm1.5 1.5A.75.75 0 015.25 10.5h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75zm1.5 1.5A.75.75 0 016.75 12h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
  </svg>
);