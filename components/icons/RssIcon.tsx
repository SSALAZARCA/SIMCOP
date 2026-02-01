
import React from 'react';

interface IconProps {
  className?: string;
}
export const RssIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-6 h-6"}>
    <path fillRule="evenodd" d="M3.75 4.5a.75.75 0 01.75.75v13.5a.75.75 0 01-1.5 0V5.25a.75.75 0 01.75-.75zM6.75 19.5a.75.75 0 000-1.5H5.25a.75.75 0 000 1.5h1.5z" clipRule="evenodd" />
    <path d="M8.25 19.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM12.75 5.25A.75.75 0 0012 6v1.07C14.37 7.403 16.1 9.131 16.427 11.5H12.75a.75.75 0 000 1.5h3.677c-.327 2.369-2.057 4.097-4.427 4.43V18a.75.75 0 001.5 0v-1.07c2.818-.346 5.023-2.552 5.37-5.37H18a.75.75 0 000-1.5h-.08c-.347-2.818-2.552-5.023-5.37-5.37V6a.75.75 0 00-.75-.75z" />
    <path d="M10.5 11.5a2.25 2.25 0 104.5 0 2.25 2.25 0 00-4.5 0z" />
  </svg>
);