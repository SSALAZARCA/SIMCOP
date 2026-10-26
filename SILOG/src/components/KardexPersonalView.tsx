import React, { useState } from 'react';
import { SoldierLogisticsProfile } from '../types';

interface KardexPersonalViewProps {
  profiles: SoldierLogisticsProfile[];
  onOpenPazYSalvo: (soldierId: string) => void;
}

export const KardexPersonalView: React.FC<KardexPersonalViewProps> = ({ profiles, onOpenPazYSalvo }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filtered = profiles.filter(p => 
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.soldierId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.rank.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-amber-300 uppercase tracking-wider flex items-center gap-2 mb-1">
            <span>🪪</span> Kárdex de Dotación Individual del Combatiente (Cruce con SIGEP)
          </h2>
          <p className="text-xs text-slate-400">
            Ficha nominal de material bélico, intendencia, sanidad y comunicaciones a cargo de cada militar importado desde la base de datos de personal de SIGEP.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Buscar por cédula, nombre o grado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map(p => (
          <div key={p.soldierId} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-950/80 border border-blue-500/40 flex items-center justify-center font-black text-blue-300 text-xs">
                  {p.rank}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{p.fullName}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-mono text-cyan-300">ID: {p.soldierId}</span>
                    <span>•</span>
                    <span className="text-amber-300 font-semibold">{p.mosCode}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onOpenPazYSalvo(p.soldierId)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition flex items-center gap-1.5"
              >
                <span>📜</span> Paz y Salvo
              </button>
            </div>

            {/* Hoja de Cargo de Material */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-amber-400 font-bold block uppercase">🔫 Armamento Principal</span>
                {p.assignedWeapon ? (
                  <>
                    <p className="font-bold text-white">{p.assignedWeapon.model.replace(/_/g, ' ')}</p>
                    <p className="font-mono text-slate-400 text-[11px]">Serial: {p.assignedWeapon.serialNumber}</p>
                    <p className="text-[10px] text-emerald-400">{p.magazinesCount} Tolvas ({p.ammunitionRounds} Cartuchos)</p>
                  </>
                ) : (
                  <span className="text-slate-500 italic">Sin arma asignada</span>
                )}
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-blue-400 font-bold block uppercase">🛡️ Blindaje y Casco</span>
                {p.assignedArmor ? (
                  <>
                    <p className="font-bold text-white">Chaleco Nivel IV (Talla {p.assignedArmor.size})</p>
                    <p className="font-mono text-slate-400 text-[11px]">Placa: {p.assignedArmor.frontPlateSerial || p.assignedArmor.serialNumber}</p>
                    <p className="text-[10px] text-slate-500">Vence: {p.assignedArmor.expirationDate}</p>
                  </>
                ) : (
                  <span className="text-slate-500 italic">Sin chaleco a cargo</span>
                )}
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-purple-400 font-bold block uppercase">📡 Comunicaciones / Especial</span>
                {p.assignedCommRadio ? (
                  <>
                    <p className="font-bold text-white">{p.assignedCommRadio.model.replace(/_/g, ' ')}</p>
                    <p className="font-mono text-slate-400 text-[11px]">Serial: {p.assignedCommRadio.serialNumber}</p>
                  </>
                ) : p.assignedNightVision ? (
                  <>
                    <p className="font-bold text-white">Visor Nocturno PVS-14</p>
                    <p className="font-mono text-slate-400 text-[11px]">Serial: {p.assignedNightVision.serialNumber}</p>
                  </>
                ) : (
                  <span className="text-slate-500 italic">Equipo orgánico regular</span>
                )}
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold block uppercase">🍱 Subsistencia & Sanidad</span>
                <p className="font-bold text-white">{p.rationsOnHand} Raciones MRE ({p.rationsOnHand / 3} días)</p>
                <p className="text-slate-400 text-[11px]">💧 {p.waterPurificationTablets} Pastillas Potabilizadoras</p>
                <p className="text-[10px] text-slate-400">🩺 {p.assignedIfak ? 'IFAK con Torniquete CAT' : 'Sin botiquín'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
