
import React, { useState } from 'react';
import { Truck } from 'lucide-react';

interface ResupplyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { days: number; resetAmmo: boolean; resetFuel: boolean }) => void;
    unitName: string;
}

export const ResupplyModal: React.FC<ResupplyModalProps> = ({ isOpen, onClose, onConfirm, unitName }) => {
    const [days, setDays] = useState(7);
    const [resetAmmo, setResetAmmo] = useState(true);
    const [resetFuel, setResetFuel] = useState(true);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-md flex items-center justify-center z-[5000] p-4">
            <div className="bg-gray-900 border border-white/10 rounded-[32px] p-8 md:p-10 w-full max-w-lg shadow-[0_0_80px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center">
                        <Truck className="w-7 h-7 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Protocolo de Reabastecimiento</h3>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{unitName}</p>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="space-y-3">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Autonomía Logística (Días)</label>
                        <input
                            type="number"
                            value={days}
                            onChange={e => setDays(parseInt(e.target.value) || 0)}
                            className="w-full bg-black/40 border border-white/10 p-6 rounded-2xl text-4xl font-black text-center text-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all shadow-inner"
                        />
                        <p className="text-[9px] text-gray-600 uppercase text-center font-bold tracking-widest">Capacidad de sostenimiento en el terreno</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setResetAmmo(!resetAmmo)}
                            className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${resetAmmo ? 'bg-orange-600/20 border-orange-500/50 text-orange-400' : 'bg-gray-800 border-white/5 text-gray-500'}`}
                        >
                            <span className="text-[10px] font-black uppercase">Munición</span>
                            <span className="text-xs font-black">{resetAmmo ? 'RESTABLECER 100%' : 'MANTENER'}</span>
                        </button>
                        <button
                            onClick={() => setResetFuel(!resetFuel)}
                            className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${resetFuel ? 'bg-yellow-600/20 border-yellow-500/50 text-yellow-400' : 'bg-gray-800 border-white/5 text-gray-500'}`}
                        >
                            <span className="text-[10px] font-black uppercase">Combustible</span>
                            <span className="text-xs font-black">{resetFuel ? 'RESTABLECER 100%' : 'MANTENER'}</span>
                        </button>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-8 py-5 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => onConfirm({ days, resetAmmo, resetFuel })}
                            className="flex-1 px-8 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-900/40 active:scale-95 transition-all"
                        >
                            Confirmar Entrega
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
