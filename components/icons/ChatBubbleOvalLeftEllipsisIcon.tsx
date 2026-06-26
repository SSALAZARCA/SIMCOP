
import React from 'react';

interface IconProps {
  className?: string;
}

export const ChatBubbleOvalLeftEllipsisIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-6 h-6"}>
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM8.25 8.625a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Zm2.625 1.125a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875-1.125a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Z" clipRule="evenodd" />
    <path d="M14.25 15.75a.75.75 0 0 0 .75.75h.008a.75.75 0 0 0 .75-.75V14.25H15a.75.75 0 0 0-.75.75Z" />
    <path d="M12 15.75a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75V16.5h-.008a.75.75 0 0 1-.75-.75Z" />
    <path d="M9 15.75a.75.75 0 0 0 .75.75h.008a.75.75 0 0 0 .75-.75V14.25H9.75a.75.75 0 0 0-.75.75Z" />
  </svg>
);
