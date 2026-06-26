
import React from 'react';

interface IconProps {
  className?: string;
}

export const TableCellsIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-6 h-6"}>
    <path fillRule="evenodd" d="M4.5 3A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5V15a.75.75 0 00-1.5 0v4.5H4.5V4.5h4.5a.75.75 0 000-1.5H4.5z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M12 3a.75.75 0 00-.75.75v4.5a.75.75 0 001.5 0V3.75A.75.75 0 0012 3zM11.25 12a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75zm.75 3.75a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5zM12 18a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5A.75.75 0 0112 18zM15 3.75a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75V9a.75.75 0 01-1.5 0V4.5h-3A.75.75 0 0115 3.75z" clipRule="evenodd" />
    <path d="M3 12.75A.75.75 0 013.75 12H9a.75.75 0 010 1.5H3.75A.75.75 0 013 12.75zm0 3.75A.75.75 0 013.75 15H9a.75.75 0 010 1.5H3.75A.75.75 0 013 16.5z" />
  </svg>
);
