
import React from 'react';

interface IconProps {
    className?: string;
}

export const BoltIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-5 h-5"}>
        <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.972 9.5h5.528a.75.75 0 01.592 1.21l-8.122 10.83a.75.75 0 01-1.297-.741l1.625-7.3H5.75a.75.75 0 01-.592-1.21L13.28 1.83a.75.75 0 011.335-.235z" clipRule="evenodd" />
    </svg>
);
