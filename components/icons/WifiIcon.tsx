import type { SVGProps } from 'react';

export function WifiIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 10.5h.008v.008H8.25V10.5Zm3.75 0h.008v.008H12V10.5Zm3.75 0h.008v.008h-.008V10.5ZM8.25 15h.008v.008H8.25V15Zm3.75 0h.008v.008H12V15Zm3.75 0h.008v.008h-.008V15ZM2.25 12h19.5v5.25c0 .621-.504 1.125-1.125 1.125H3.375c-.621 0-1.125-.504-1.125-1.125V12Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 8.25-2.25 2.25m4.5-2.25-2.25 2.25m4.5-2.25L12 10.5m-2.25-2.25v6M9 9l.375 7.5a.75.75 0 0 0 .75.712h3.75a.75.75 0 0 0 .75-.712L15 9" />
        </svg>
    );
}
// Using a generic wifi shape for now as placeholder for more complex icon if needed
