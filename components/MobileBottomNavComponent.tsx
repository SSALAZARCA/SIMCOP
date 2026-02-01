import React from 'react';

export interface MobileNavItem {
    label: string;
    view: any;
    icon: React.FC<{ className?: string }>;
}

interface MobileBottomNavProps {
    currentView: any;
    setCurrentView: (view: any) => void;
    items: MobileNavItem[];
}

export const MobileBottomNavComponent: React.FC<MobileBottomNavProps> = ({ currentView, setCurrentView, items }) => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[100] glass-effect border-t border-white/5 pb-safe animate-in slide-in-from-bottom duration-500 md:hidden">
            <div className="flex justify-around items-center h-16 px-1">
                {items.map((item) => {
                    const isActive = currentView === item.view;
                    return (
                        <button
                            key={item.label}
                            onClick={() => setCurrentView(item.view)}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative ${isActive ? 'text-blue-400' : 'text-gray-500'
                                }`}
                        >
                            {isActive && (
                                <div className="absolute top-0 w-8 h-1 bg-blue-500 rounded-b-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                            )}
                            <item.icon className={`w-5 h-5 mb-1 ${isActive ? 'animate-pulse' : ''}`} />
                            <span className="text-[8px] font-black uppercase tracking-widest truncate w-full text-center px-1">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
