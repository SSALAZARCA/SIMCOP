
import React from 'react';

interface IconProps {
  className?: string;
}
export const ArchiveBoxIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-6 h-6"}>
    <path fillRule="evenodd" d="M2.25 2.25a.75.75 0 0 0-.75.75v11.25c0 .414.336.75.75.75h2.25V18a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 .75.75v2.25H21.75a.75.75 0 0 0 .75-.75V6.75A.75.75 0 0 0 21.75 6H15V3a.75.75 0 0 0-.75-.75H2.25Zm1.5 1.5v3.75H12V3.75H3.75Zm0 5.25V15H12V9H3.75Zm13.5-1.5a.75.75 0 0 0-.75-.75H15v5.25h2.25a.75.75 0 0 0 .75-.75V7.5Z" clipRule="evenodd" />
    <path d="M2.25 18a.75.75 0 0 0-.75.75V21a.75.75 0 0 0 .75.75h19.5a.75.75 0 0 0 .75-.75v-2.25a.75.75 0 0 0-.75-.75H2.25Z" />
  </svg>
);
