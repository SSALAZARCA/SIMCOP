import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Check } from 'lucide-react';
import { specialtyService } from '../services/specialtyService';
import type { SpecialtyCatalogEntry } from '../types';

interface SpecialtySelectorProps {
    category: 'officers' | 'ncos' | 'professionalSoldiers' | 'regularSoldiers' | 'civilians';
    onSelect: (specialty: SpecialtyCatalogEntry) => void;
    placeholder?: string;
    className?: string;
}

export const SpecialtySelector: React.FC<SpecialtySelectorProps> = ({
    category,
    onSelect,
    placeholder = "Seleccionar especialidad...",
    className = ""
}) => {
    const [specialties, setSpecialties] = useState<SpecialtyCatalogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchSpecialties = async () => {
            try {
                setLoading(true);
                const data = await specialtyService.getByCategory(category);
                setSpecialties(data);
            } catch (error) {
                console.error(`Error loading specialties for ${category}:`, error);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen && specialties.length === 0) {
            fetchSpecialties();
        }
    }, [category, isOpen, specialties.length]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const filteredSpecialties = specialties.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div
                className="relative cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="w-full bg-gray-900 border border-white/5 rounded-xl px-4 py-3 text-white flex items-center justify-between hover:border-teal-500/50 transition-all shadow-inner backdrop-blur-sm">
                    <span className={`text-sm font-bold ${searchTerm ? 'text-white' : 'text-gray-500'}`}>
                        {searchTerm || placeholder}
                    </span>
                    <Search className="w-4 h-4 text-teal-500/50" />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-2 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl max-h-80 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                    <div className="p-3 sticky top-0 bg-gray-900 border-b border-white/5 z-10">
                        <input
                            type="text"
                            className="w-full bg-gray-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500/50 placeholder-gray-600"
                            placeholder="Buscar especialidad o código..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-400 flex flex-col justify-center items-center gap-3">
                            <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                            <span className="text-xs font-black uppercase tracking-[0.2em]">Sincronizando...</span>
                        </div>
                    ) : filteredSpecialties.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-xs font-bold uppercase tracking-widest">
                            Sin coincidencias tácticas
                        </div>
                    ) : (
                        <ul className="py-2">
                            {filteredSpecialties.map((specialty) => (
                                <li
                                    key={specialty.id}
                                    className="px-4 py-3 hover:bg-teal-500/10 cursor-pointer flex items-center justify-between group transition-colors border-b border-white/5 last:border-0"
                                    onClick={() => {
                                        onSelect(specialty);
                                        setSearchTerm(`${specialty.code} - ${specialty.name}`);
                                        setIsOpen(false);
                                    }}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-mono text-teal-400 text-xs font-black tracking-tighter mb-0.5">{specialty.code}</span>
                                        <span className="text-sm font-bold text-gray-200 group-hover:text-white">{specialty.name}</span>
                                    </div>
                                    <Check className="w-4 h-4 text-teal-400 opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-110" />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};
