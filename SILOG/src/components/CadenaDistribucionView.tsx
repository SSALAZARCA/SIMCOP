import React, { useState } from 'react';
import { MilitaryWarehouse, SilogUser } from '../types';
import { silogService } from '../services/silogService';
import { silogAuthService } from '../services/silogAuthService';

interface CadenaDistribucionViewProps {
  warehouses: MilitaryWarehouse[];
  currentUser: SilogUser;
  onOpenMovementModal?: (params: any) => void;
  onOpenSapModal?: () => void;
}

export const CadenaDistribucionView: React.FC<CadenaDistribucionViewProps> = ({
  warehouses,
  currentUser,
  onOpenMovementModal,
  onOpenSapModal
}) => {
  const [selectedBrigadeFilter, setSelectedBrigadeFilter] = useState<string>('ALL');

  const allWeapons = silogService.getWeapons();
  const allAmmo = silogService.getAmmoLots();
  const allArmors = silogService.getArmors();
  const allRations = silogService.getRations();
  const allComms = silogService.getComms();
  const allOptronics = silogService.getOptronics();
  const allSanity = silogService.getSanityItems();
  const auditLogs = silogService.getTransferAuditLog();

  const baspcWarehouses = warehouses.filter(w => w.type === 'BASPC_CENTRAL');
  const battalionWarehouses = warehouses.filter(w => w.type === 'BATALLON_DEPOSITO');
  const patrolBases = warehouses.filter(w => w.type === 'BASE_PATRULLA');

  // Conteo por escalones
  const baspcIds = new Set(baspcWarehouses.map(w => w.id));
  const batallonIds = new Set(battalionWarehouses.map(w => w.id));

  // Nivel 1: BASPC
  const weaponsInBaspc = allWeapons.filter(w => baspcIds.has(w.warehouseId)).length;
  const ammoInBaspc = allAmmo.filter(a => baspcIds.has(a.warehouseId)).reduce((a, c) => a + c.quantityRounds, 0);

  // Nivel 2: Depósito de Batallón (sin asignar a compañía ni soldado)
  const weaponsInBatallonBodega = allWeapons.filter(w => batallonIds.has(w.warehouseId) && !w.assignedCompanyId && !w.assignedSoldierId).length;

  // Nivel 3: Compañías
  const weaponsInCompanies = allWeapons.filter(w => w.assignedCompanyId && !w.assignedSoldierId).length;

  // Nivel 4: Soldados Individuales
  const weaponsAssignedSoldiers = allWeapons.filter(w => w.assignedSoldierId).length;

  const canDispatchBaspc = silogAuthService.canDispatchFromBaspc(currentUser);

  return (
    <div className="space-y-6 w-full animate-in fade-in">
      
      {/* Encabezado Doctrinal */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-2xl p-5 md:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase tracking-widest">
              DOCTRINA LOGÍSTICA CEDOE / JELOG • FF.MM.
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
              SISTEMA SILOGA (https://siloga.site)
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white">
            Cadena de Custodia y Distribución Escalonada de Material
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Trazabilidad integral del flujo de abastecimiento militar desde la entrada de fábrica (SAP MM) hacia el Almacén Centralizador (BASPC), los depósitos tácticos de Batallón, las Compañías orgánicas y el combatiente individual.
          </p>
        </div>

        {canDispatchBaspc && onOpenSapModal && (
          <button
            onClick={onOpenSapModal}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xl shadow-blue-950/60 transition-all flex items-center gap-2 border border-blue-400/50 active:scale-95"
          >
            <span>📑</span>
            <span>Ingreso Masivo Reporte SAP MM</span>
          </button>
        )}
      </div>

      {/* Diagrama Visual de Flujo de Abastecimiento (Pipeline Doctrinal) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
          <span>🔄</span> Tubería de Suministro Táctico y Distribución en Tiempo Real
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          
          {/* ETAPA 1: ALMACÉN CENTRALIZADOR BASPC */}
          <div className="bg-slate-950/80 border border-purple-500/40 rounded-2xl p-4 space-y-3 relative overflow-hidden group hover:border-purple-400 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                ESCALÓN 1 • BASPC
              </span>
              <span className="text-lg">⭐</span>
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Reserva Estratégica BASPC</h4>
              <p className="text-[11px] text-slate-400">Polvorines blindados y almacenes generales de Brigada</p>
            </div>

            <div className="space-y-1.5 bg-slate-900/80 p-3 rounded-xl border border-slate-800 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Armas en Reserva:</span>
                <span className="font-bold text-amber-300">{weaponsInBaspc}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Munición:</span>
                <span className="font-bold text-emerald-400">{(ammoInBaspc / 1000).toFixed(0)}k tiros</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Depósitos BASPC:</span>
                <span className="font-bold text-purple-300">{baspcWarehouses.length} Centrales</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800">
              🔑 <strong className="text-slate-300">Potestad:</strong> Almacenista Centralizador despacha hacia Batallones o Estado Mayor.
            </div>
          </div>

          {/* ETAPA 2: DEPÓSITO TÁCTICO DE BATALLÓN */}
          <div className="bg-slate-950/80 border border-blue-500/40 rounded-2xl p-4 space-y-3 relative overflow-hidden group hover:border-blue-400 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                ESCALÓN 2 • BATALLÓN
              </span>
              <span className="text-lg">📦</span>
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Bodegas de Batallón</h4>
              <p className="text-[11px] text-slate-400">Depósitos tácticos de unidades de maniobra (BI, GM, BEING)</p>
            </div>

            <div className="space-y-1.5 bg-slate-900/80 p-3 rounded-xl border border-slate-800 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">En Bodega Batallón:</span>
                <span className="font-bold text-blue-300">{weaponsInBatallonBodega} armas</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Depósitos Activos:</span>
                <span className="font-bold text-white">{battalionWarehouses.length} Batallones</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estado Custodia:</span>
                <span className="font-bold text-emerald-400">Recibido BASPC</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800">
              🔑 <strong className="text-slate-300">Potestad:</strong> Bodeguero de Batallón distribuye a las Compañías.
            </div>
          </div>

          {/* ETAPA 3: COMPAÑÍAS ORGÁNICAS */}
          <div className="bg-slate-950/80 border border-cyan-500/40 rounded-2xl p-4 space-y-3 relative overflow-hidden group hover:border-cyan-400 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                ESCALÓN 3 • COMPAÑÍA
              </span>
              <span className="text-lg">🛡️</span>
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Compañías & Armerillos</h4>
              <p className="text-[11px] text-slate-400">Cía A, B, C, ASPC y Bases de Patrulla Avanzadas</p>
            </div>

            <div className="space-y-1.5 bg-slate-900/80 p-3 rounded-xl border border-slate-800 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Armamento Asignado:</span>
                <span className="font-bold text-cyan-300">{weaponsInCompanies} armas</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bases Avanzadas:</span>
                <span className="font-bold text-white">{patrolBases.length} Puestos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Disponibilidad Cía:</span>
                <span className="font-bold text-emerald-400">100% Lista</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800">
              🔑 <strong className="text-slate-300">Potestad:</strong> Encargado de Compañía/Pelotón asigna al soldado.
            </div>
          </div>

          {/* ETAPA 4: COMBATIENTE INDIVIDUAL (KÁRDEX SIGEP) */}
          <div className="bg-slate-950/80 border border-emerald-500/40 rounded-2xl p-4 space-y-3 relative overflow-hidden group hover:border-emerald-400 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ESCALÓN 4 • COMBATIENTE
              </span>
              <span className="text-lg">🪪</span>
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Dotación Individual</h4>
              <p className="text-[11px] text-slate-400">Soldados en combate con cédula militar (SIGEP)</p>
            </div>

            <div className="space-y-1.5 bg-slate-900/80 p-3 rounded-xl border border-slate-800 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Armas a Cargo:</span>
                <span className="font-bold text-emerald-400">{weaponsAssignedSoldiers} en mano</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Efectivos Dotados:</span>
                <span className="font-bold text-white">36 Hombres</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Paz y Salvo:</span>
                <span className="font-bold text-cyan-300">Auditado SIGEP</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800">
              🔑 <strong className="text-slate-300">Potestad:</strong> Furriel o Cmdte. firma entrega de puesto y reintegro.
            </div>
          </div>

        </div>
      </div>

      {/* Historial Oficial de Actas de Transferencia y Movimientos Militares */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <span>📜</span> Libro de Remisiones y Movimientos Logísticos Registrados ({auditLogs.length} Actas)
          </h3>
          <span className="text-xs font-mono text-slate-400">Trazabilidad Inviolable SILOGA</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
              <tr>
                <th className="p-3">Acta Remisión</th>
                <th className="p-3">Fecha / Hora</th>
                <th className="p-3">Material Transferido</th>
                <th className="p-3">Origen</th>
                <th className="p-3">Destino</th>
                <th className="p-3">Autorizado Por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 font-bold text-amber-300">{log.remisionActNumber}</td>
                  <td className="p-3 text-slate-400">{log.timestamp}</td>
                  <td className="p-3 font-sans font-bold text-white">{log.itemDescription}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {log.sourceName}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {log.destinationName}
                    </span>
                  </td>
                  <td className="p-3 font-sans text-slate-300 text-xs">
                    {log.authorizedByName} ({log.authorizedByRole})
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500 font-sans">
                    No se han registrado transferencias en la sesión actual. Use el botón "Mover / Asignar" o "Importar Reporte SAP".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
