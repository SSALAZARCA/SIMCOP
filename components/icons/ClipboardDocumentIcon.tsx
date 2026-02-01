
import React from 'react';

interface IconProps {
  className?: string;
}

export const ClipboardDocumentIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className || "w-5 h-5"}>
    <path fillRule="evenodd" d="M12.5 2.75a2.25 2.25 0 00-4.5 0V4.5h4.5V2.75z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M9 2.75A3.75 3.75 0 0112.75 0h-.008A3.75 3.75 0 0116.5 2.75V4.5h2.75A2.75 2.75 0 0122 7.25v9A2.75 2.75 0 0119.25 19H4.75A2.75 2.75 0 012 16.25v-9A2.75 2.75 0 014.75 4.5H7.5V2.75A3.75 3.75 0 019 2.75H7.75A2.25 2.25 0 005.5 4.5v11.75c0 .414.336.75.75.75h12.5a.75.75 0 00.75-.75V7.25a.75.75 0 00-.75-.75H16.5V14a.75.75 0 01-1.5 0V4.5H9v11.75a.75.75 0 001.5 0V7.25a.75.75 0 00-.75-.75H9V4.5A2.25 2.25 0 0012.75 2.25h-.008A2.25 2.25 0 0010.5 4.5V6H9V4.5z" clipRule="evenodd" />
  </svg>
);
