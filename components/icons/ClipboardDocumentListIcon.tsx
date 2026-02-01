
import React from 'react';

interface IconProps {
  className?: string;
}

export const ClipboardDocumentListIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-6 h-6"}>
    <path fillRule="evenodd" d="M10.5 3.75a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M10.073 2.073a1.5 1.5 0 011.854 0l3 2.25a1.5 1.5 0 01.523 1.152v.001V9A.75.75 0 0114.25 9h-1.5A.75.75 0 0112 8.25V3.75h-1.5V1.5a.75.75 0 00-.75-.75h-3A.75.75 0 006 1.5v1.5H4.5A.75.75 0 003.75 6v10.5A1.5 1.5 0 005.25 18h2.25a.75.75 0 00.75-.75v-3a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v3a.75.75 0 00.75.75h2.25A1.5 1.5 0 0018 16.5V9.975a1.5 1.5 0 01.523-1.152l3-2.25a1.5 1.5 0 01.523-1.152l-.001-.001A1.5 1.5 0 0121.927 3H10.073zm-3.323 12V16.5h3V12h-3zm4.5 0V16.5h3V12h-3z" clipRule="evenodd" />
    <path d="M1.5 6.75A.75.75 0 012.25 6h19.5a.75.75 0 01.75.75v10.5a.75.75 0 01-.75.75H2.25a.75.75 0 01-.75-.75V6.75z" />
  </svg>
);
