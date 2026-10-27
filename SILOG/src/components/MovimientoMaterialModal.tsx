import React, { useState } from 'react';
import { SilogUser, MilitaryWarehouse } from '../types';
import { silogService } from '../services/silogService';
import { silogAuthService } from '../services/silogAuthService';

interface MovimientoMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SilogUser;
  itemCategory: string;
  itemId: string;
  itemDescription: string;
  currentWarehouseId: string;
  currentCompanyId?: string;
  currentSoldierId?: string;
  onSuccess: (message: string) => void;
}

export const MovimientoMaterialModal: React.FC<MovimientoMaterialModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  itemCategory,
  itemId,
  itemDescription,
  currentWarehouseId,
  currentCompanyId,
  currentSoldierId,
  onSuccess
}) => {
  if (!isOpen) return null;

  const warehouses = silogService.getWarehouses();
  const soldiers = silogService.getAllKardexProfiles();

  const canDispatchBaspc = silogAuthService.canDispatchFromBaspc(currentUser);
  const canAssignCompany = silogAuthService.canAssignToCompany(currentUser);
  const canAssignSoldier = silogAuthService.canAssignToSoldier(currentUser);

  // Estados de formulario
  // Destino BASPC -> Batallón
  const otherWarehouses = warehouses.filter(w => w.id !== currentWarehouseId);
  const [selectedDestinationWarehouse, setSelectedDestinationWarehouse] = useState<string>(
    otherWarehouses[0]?.id || ''
  );

  // Destino Batallón -> Compañía
  const battalionCompanies = [
    { id: 'CIA-A', name: 'Compañía A "Vencedores"' },
    { id: 'CIA-B', name: 'Compañía B "Cazadores"' },
    { id: 'CIA-C', name: 'Compañía C "Bravos"' },
    { id: 'CIA-ASPC', name: 'Compañía de Apoyo y Servicios (ASPC)' },
    { id: 'BASE-AVANZADA', name: 'Base de Patrulla / Puesto Avanzado' }
  ];
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(battalionCompanies[0].id);

  // Destino Compañía -> Soldado
  const [selectedSoldierId, setSelectedSoldierId] = useState<string>(
    soldiers[0]?.soldierId || ''
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [digitalSignatureCode, setDigitalSignatureCode] = useState<string>('');

  // Verificación de Firma Digital con Google Authenticator (No-repudio Militar)
  const verifySignature = async (actionDescription: string) => {
    if (!digitalSignatureCode.trim()) {
      setErrorMsg('Debe ingresar el código de 6 dígitos de Google Authenticator para firmar digitalmente la operación militar.');
      return null;
    }
    const res = await silogAuthService.verifyDigitalSignature(digitalSignatureCode, actionDescription);
    if (!res.success) {
      setErrorMsg(res.message || 'Código de firma digital inválido o expirado. Verifique su aplicación Google Authenticator.');
      return null;
    }
    return res;
  };

  // 1. Ejecutar Despacho BASPC
  const handleDispatchFromBaspc = async () => {
    setErrorMsg(null);
    setLoading(true);

    const sig = await verifySignature('DESPACHO_BASPC_BATALLON');
    if (!sig) {
      setLoading(false);
      return;
    }

    const res = silogService.transferBaspcToBattalion(
      itemCategory,
      itemId,
      selectedDestinationWarehouse,
      currentUser.militaryId,
      currentUser.fullName,
      currentUser.roleTitle
    );
    setLoading(false);
    if (res.success) {
      onSuccess(`${res.message} [✓ Firmado Digitalmente: ${sig.certificate}]`);
      onClose();
    } else {
      setErrorMsg(res.message);
    }
  };

  // 2. Ejecutar Asignación Batallón a Compañía
  const handleAssignToCompany = async () => {
    setErrorMsg(null);
    setLoading(true);

    const sig = await verifySignature('DISTRIBUCION_BATALLON_COMPANIA');
    if (!sig) {
      setLoading(false);
      return;
    }

    const targetComp = battalionCompanies.find(c => c.id === selectedCompanyId);
    const res = silogService.assignBattalionToCompany(
      itemCategory,
      itemId,
      selectedCompanyId,
      targetComp?.name || selectedCompanyId,
      currentUser.militaryId,
      currentUser.fullName,
      currentUser.roleTitle
    );
    setLoading(false);
    if (res.success) {
      onSuccess(`${res.message} [✓ Firmado Digitalmente: ${sig.certificate}]`);
      onClose();
    } else {
      setErrorMsg(res.message);
    }
  };

  // 3. Ejecutar Asignación Individual a Soldado
  const handleAssignToSoldier = async () => {
    setErrorMsg(null);
    setLoading(true);

    const sig = await verifySignature('ASIGNACION_INDIVIDUAL_KARDEX');
    if (!sig) {
      setLoading(false);
      return;
    }

    const res = silogService.assignCompanyToSoldier(
      itemCategory,
      itemId,
      selectedSoldierId,
      currentUser.militaryId,
      currentUser.fullName,
      currentUser.roleTitle
    );
    setLoading(false);
    if (res.success) {
      onSuccess(`${res.message} [✓ Firmado Digitalmente: ${sig.certificate}]`);
      onClose();
    } else {
      setErrorMsg(res.message);
    }
  };

  // 4. Reintegrar de soldado
  const handleUnassignSoldier = async () => {
    setErrorMsg(null);
    setLoading(true);

    const sig = await verifySignature('REINTEGRO_ARMERILLO');
    if (!sig) {
      setLoading(false);
      return;
    }

    const res = silogService.unassignFromSoldier(
      itemCategory,
      itemId,
      currentUser.militaryId,
      currentUser.fullName,
      currentUser.roleTitle
    );
    setLoading(false);
    if (res.success) {
      onSuccess(`${res.message} [✓ Firmado Digitalmente: ${sig.certificate}]`);
      onClose();
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl">
              🚚
            </div>
            <div>
              <h3 className="text-base font-black text-white">Cadena de Asignación y Traslado Militar</h3>
              <p className="text-xs text-amber-300 font-mono">
                {currentUser.roleTitle} | {currentUser.rank} {currentUser.fullName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* Ficha del Elemento */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold">ELEMENTO:</span>
            <span className="text-amber-400 font-bold text-sm">{itemDescription}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">ID / Serial:</span>
            <span className="text-cyan-300">{itemId}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Almacén Actual:</span>
            <span className="text-slate-300">{warehouses.find(w => w.id === currentWarehouseId)?.name || currentWarehouseId}</span>
          </div>
          {currentCompanyId && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Compañía Asignada:</span>
              <span className="text-blue-300 font-bold">{currentCompanyId}</span>
            </div>
          )}
          {currentSoldierId && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Combatiente a Cargo:</span>
              <span className="text-emerald-400 font-bold">{currentSoldierId}</span>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="bg-red-950/60 border border-red-500/50 p-3 rounded-xl text-xs text-red-200">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* ================================================================= */}
        {/* REQUISITO OBLIGATORIO: FIRMA DIGITAL MILITAR (GOOGLE AUTHENTICATOR) */}
        {/* ================================================================= */}
        {(canDispatchBaspc || canAssignCompany || canAssignSoldier) && (
          <div className="bg-slate-950/90 border border-amber-500/40 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-sm">🔏</span>
                <span className="text-[11px] font-black uppercase text-amber-300 tracking-wider">
                  Firma Digital Operacional (No-Repudio Militar)
                </span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                RFC-6238 TOTP
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Para autorizar este movimiento de material militar, ingrese el código de 6 dígitos generado en su aplicación <strong>Google Authenticator</strong> o <strong>Microsoft Authenticator</strong>. Se estampará un certificado criptográfico SHA-256 en el acta del Kárdex.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digitalSignatureCode}
                onChange={(e) => setDigitalSignatureCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-36 bg-slate-900 border border-amber-500/60 rounded-lg px-3 py-2 text-center text-sm font-mono tracking-[0.3em] font-black text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <span className="text-[10px] text-slate-400 font-mono">
                {digitalSignatureCode.length === 6 ? '✓ Código listo para firmar' : 'Requerido: 6 dígitos activos del Authenticator'}
              </span>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* CASO 1: ALMACENISTA CENTRALIZADOR BASPC                            */}
        {/* ================================================================= */}
        {canDispatchBaspc && (
          <div className="space-y-4 bg-purple-950/20 border border-purple-500/30 p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-base">🏛️</span>
              <h4 className="text-xs font-black text-purple-300 uppercase tracking-wider">
                Despacho Centralizador desde BASPC hacia Batallón o Estado Mayor
              </h4>
            </div>
            <p className="text-[11px] text-slate-300">
              Como <strong>Almacenista Centralizador de BASPC</strong>, usted transfiere este material desde la reserva estratégica hacia los depósitos de los Batallones de maniobra o hacia unidades de Estado Mayor (Brigada/División).
            </p>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block uppercase">
                Batallón o Unidad de Destino (Estructura de Fuerza SIMCOP):
              </label>
              <select
                value={selectedDestinationWarehouse}
                onChange={(e) => setSelectedDestinationWarehouse(e.target.value)}
                className="w-full bg-slate-950 border border-purple-500/40 rounded-xl p-2.5 text-xs text-white focus:outline-none"
              >
                {otherWarehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.type === 'BASPC_CENTRAL' ? '⭐' : '📦'} {w.name} ({w.unitName} - {w.municipality})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleDispatchFromBaspc}
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-purple-950/50 disabled:opacity-50"
            >
              {loading ? 'Procesando Acta Militar...' : 'Emitir Acta y Despachar a Batallón'}
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* CASO 2: BODEGUERO DE BATALLÓN                                     */}
        {/* ================================================================= */}
        {canAssignCompany && (
          <div className="space-y-4 bg-blue-950/20 border border-blue-500/30 p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-base">📦</span>
              <h4 className="text-xs font-black text-blue-300 uppercase tracking-wider">
                Distribución Interna hacia Compañías del Batallón
              </h4>
            </div>
            <p className="text-[11px] text-slate-300">
              Como <strong>Bodeguero del Batallón</strong>, usted asigna o mueve este material del depósito general hacia las diferentes <strong>Compañías subordinadas</strong> del batallón.
            </p>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block uppercase">
                Compañía Orgánica Receptora:
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full bg-slate-950 border border-blue-500/40 rounded-xl p-2.5 text-xs text-white focus:outline-none"
              >
                {battalionCompanies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleAssignToCompany}
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-blue-950/50 disabled:opacity-50"
            >
              {loading ? 'Procesando Distribución...' : 'Asignar Material a la Compañía'}
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* CASO 3: ENCARGADO DE COMPAÑÍA / FURRIEL DE PELOTÓN                */}
        {/* ================================================================= */}
        {canAssignSoldier && (
          <div className="space-y-4 bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-base">🪪</span>
              <h4 className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                Asignación Individual al Combatiente (Kárdex SIGEP)
              </h4>
            </div>
            <p className="text-[11px] text-slate-300">
              Como <strong>Encargado de Compañía / Furriel</strong>, usted asigna este material de forma nominal e individual a cada soldado, registrando el serial en su Kárdex personal sincronizado con SIGEP.
            </p>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block uppercase">
                Soldado / Combatiente Asignado:
              </label>
              <select
                value={selectedSoldierId}
                onChange={(e) => setSelectedSoldierId(e.target.value)}
                className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl p-2.5 text-xs text-white focus:outline-none font-mono"
              >
                {soldiers.map(s => (
                  <option key={s.soldierId} value={s.soldierId}>
                    {s.rank} {s.fullName} ({s.soldierId} - {s.mosCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleAssignToSoldier}
                disabled={loading}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-950/50 disabled:opacity-50"
              >
                {loading ? 'Firmando Cargo...' : 'Firmar Hoja de Cargo Individual'}
              </button>

              {currentSoldierId && (
                <button
                  onClick={handleUnassignSoldier}
                  disabled={loading}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs uppercase rounded-xl transition"
                >
                  Reintegrar a Armerillo
                </button>
              )}
            </div>
          </div>
        )}

        {/* CASO 4: OFICIAL S-4 (AUDITORÍA EXCLUSIVA) */}
        {!canDispatchBaspc && !canAssignCompany && !canAssignSoldier && (
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl text-xs space-y-2 text-slate-400">
            <span className="font-bold text-amber-400 block uppercase">
              👁️ Rol de Auditoría y Estado Mayor (S-4 / Comandante)
            </span>
            <p>
              Usted tiene perfil de supervisión de Estado Mayor. Según la doctrina logística:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>El <strong>Almacenista Centralizador BASPC</strong> despacha a los Batallones.</li>
              <li>El <strong>Bodeguero del Batallón</strong> distribuye internamente a las Compañías.</li>
              <li>El <strong>Encargado de Compañía / Pelotón</strong> asigna individualmente a los soldados.</li>
            </ul>
            <p className="text-slate-500 text-[11px] pt-1">
              Para realizar movimientos de inventario, inicie sesión con el rol de Bodega correspondiente.
            </p>
          </div>
        )}

        {/* Pie del Modal */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
