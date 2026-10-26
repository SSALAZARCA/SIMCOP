import React, { useState } from 'react';
import { MilitaryWarehouse, SilogUser, SapMaterialRow } from '../types';
import { silogService } from '../services/silogService';
import { silogAuthService } from '../services/silogAuthService';

interface SapIngresoMasivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SilogUser;
  warehouses: MilitaryWarehouse[];
  currentWarehouseId: string;
  onSuccess: (message: string) => void;
}

const DEMO_SAP_DATA: SapMaterialRow[] = [
  {
    materialCode: '10049201',
    materialDescription: 'Fusil de Asalto Galil ACE 23 Calibre 5.56x45mm',
    category: 'CLASE_V_ARMA',
    quantity: 12,
    unitOfMeasure: 'UN',
    serialNumber: 'CO-556-SAP-8901',
    sapPlant: '1601',
    sapStorageLocation: 'POLV',
    manufacturingYear: 2026
  },
  {
    materialCode: '10049205',
    materialDescription: 'Ametralladora de Apoyo M60E4 Calibre 7.62x51mm',
    category: 'CLASE_V_ARMA',
    quantity: 2,
    unitOfMeasure: 'UN',
    serialNumber: 'M60-762-SAP-101',
    sapPlant: '1601',
    sapStorageLocation: 'POLV',
    manufacturingYear: 2026
  },
  {
    materialCode: '20081044',
    materialDescription: 'Munición Indumil 5.56x45mm SS109 Eslabones Canana',
    category: 'CLASE_V_MUNICION',
    quantity: 15000,
    unitOfMeasure: 'UN',
    batchNumber: 'IND-26-MB52-441',
    sapPlant: '1601',
    sapStorageLocation: 'POLV',
    manufacturingYear: 2026
  },
  {
    materialCode: '20081078',
    materialDescription: 'Granadas 40mm HE para Lanzagranadas MGL',
    category: 'CLASE_V_MUNICION',
    quantity: 120,
    unitOfMeasure: 'UN',
    batchNumber: 'IND-26-HE-99',
    sapPlant: '1601',
    sapStorageLocation: 'POLV',
    manufacturingYear: 2026
  },
  {
    materialCode: '30019240',
    materialDescription: 'Chaleco de Protección Balística Nivel IV con Placas Cerámicas',
    category: 'CLASE_II',
    quantity: 15,
    unitOfMeasure: 'UN',
    serialNumber: 'CH-IV-SAP-5501',
    sapPlant: '1601',
    sapStorageLocation: 'BODG',
    manufacturingYear: 2026
  },
  {
    materialCode: '40055102',
    materialDescription: 'Ración de Campaña MRE Menú 07 Carne Asada con Arroz',
    category: 'CLASE_I',
    quantity: 600,
    unitOfMeasure: 'UN',
    batchNumber: 'MRE-26-LOTE-07',
    sapPlant: '1601',
    sapStorageLocation: 'SUBS',
    expirationDate: '2028-10-26'
  },
  {
    materialCode: '50091012',
    materialDescription: 'Radio Táctico Harris Falcon III AN/PRC-152 VHF/UHF/SATCOM',
    category: 'COMUNICACIONES',
    quantity: 4,
    unitOfMeasure: 'UN',
    serialNumber: 'HF-152-SAP-3301',
    sapPlant: '1601',
    sapStorageLocation: 'TCOM',
    manufacturingYear: 2026
  },
  {
    materialCode: '60012099',
    materialDescription: 'Visor Nocturno Monocular AN/PVS-14 Gen 3+ Fósforo Blanco',
    category: 'ESPECIAL',
    quantity: 6,
    unitOfMeasure: 'UN',
    serialNumber: 'NV-PVS14-SAP-77',
    sapPlant: '1601',
    sapStorageLocation: 'OPTR',
    manufacturingYear: 2026
  },
  {
    materialCode: '70034011',
    materialDescription: 'Botiquín Individual de Trauma IFAK con Torniquete CAT Gen 7',
    category: 'CLASE_VIII',
    quantity: 20,
    unitOfMeasure: 'UN',
    serialNumber: 'IFAK-SAP-2026',
    sapPlant: '1601',
    sapStorageLocation: 'SAN8',
    expirationDate: '2029-08-15'
  }
];

export const SapIngresoMasivoModal: React.FC<SapIngresoMasivoModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  warehouses,
  currentWarehouseId,
  onSuccess
}) => {
  if (!isOpen) return null;

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(currentWarehouseId);
  const [sapDocInput, setSapDocInput] = useState<string>(`DOC-SAP-5000${Math.floor(100000 + Math.random() * 900000)}`);
  const [rawText, setRawText] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<SapMaterialRow[]>(DEMO_SAP_DATA);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canIngest = silogAuthService.canIngestMaterial(currentUser);

  const handleLoadDemo = () => {
    setParsedRows(DEMO_SAP_DATA);
    setRawText(`Material\tTexto breve de material\tCantidad\tUMB\tLote\tCentro\tAlmacén
10049201\tFusil de Asalto Galil ACE 23 5.56mm\t12\tUN\tCO-556-SAP-8901\t1601\tPOLV
20081044\tMunición Indumil 5.56x45mm SS109\t15000\tUN\tIND-26-MB52-441\t1601\tPOLV
30019240\tChaleco Balístico Nivel IV\t15\tUN\tCH-IV-SAP-5501\t1601\tBODG
40055102\tRación de Campaña MRE Menú 07\t600\tUN\tMRE-26-LOTE-07\t1601\tSUBS
50091012\tRadio Harris Falcon III PRC-152\t4\tUN\tHF-152-SAP-3301\t1601\tTCOM
60012099\tVisor Nocturno AN/PVS-14 Gen 3+\t6\tUN\tNV-PVS14-SAP-77\t1601\tOPTR
70034011\tBotiquín Individual IFAK CAT G7\t20\tUN\tIFAK-SAP-2026\t1601\tSAN8`);
  };

  const handleParseRawText = (text: string) => {
    setRawText(text);
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = text.trim().split('\n');
    const rows: SapMaterialRow[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('Material') || line.startsWith('Centro') || line.startsWith('---')) continue;

      // Delimitadores comunes de SAP: Tabulador, Pipe |, o Coma
      const parts = line.includes('\t') ? line.split('\t') :
                    line.includes('|') ? line.split('|').map(s => s.trim()).filter(s => s) :
                    line.split(',');

      if (parts.length >= 3) {
        const code = parts[0]?.trim() || `SAP-${i}`;
        const desc = parts[1]?.trim() || 'Material militar SAP';
        const qty = parseInt(parts[2]?.trim().replace(/\./g, '').replace(/,/g, '')) || 1;
        const umb = (parts[3]?.trim() as any) || 'UN';
        const lot = parts[4]?.trim() || '';
        const plant = parts[5]?.trim() || '1601';
        const sloc = parts[6]?.trim() || 'BASP';

        // Inferir categoría doctrinal
        let cat: any = 'CLASE_V_ARMA';
        const d = desc.toUpperCase();
        if (d.includes('MUNICION') || d.includes('CARTUCHO') || d.includes('GRANADA') || d.includes('BOMBA')) {
          cat = 'CLASE_V_MUNICION';
        } else if (d.includes('CHALECO') || d.includes('CASCO') || d.includes('PLACA') || d.includes('INTENDENCIA')) {
          cat = 'CLASE_II';
        } else if (d.includes('RACION') || d.includes('MRE') || d.includes('VIVERES') || d.includes('AGUA')) {
          cat = 'CLASE_I';
        } else if (d.includes('RADIO') || d.includes('HARRIS') || d.includes('MOTOROLA') || d.includes('COMUNICACION')) {
          cat = 'COMUNICACIONES';
        } else if (d.includes('VISOR') || d.includes('PVS') || d.includes('DRON') || d.includes('TERMICA') || d.includes('VALLON')) {
          cat = 'ESPECIAL';
        } else if (d.includes('IFAK') || d.includes('SANIDAD') || d.includes('TORNIQUETE') || d.includes('BOTIQUIN')) {
          cat = 'CLASE_VIII';
        }

        rows.push({
          materialCode: code,
          materialDescription: desc,
          category: cat,
          quantity: qty,
          unitOfMeasure: umb,
          batchNumber: lot,
          serialNumber: lot,
          sapPlant: plant,
          sapStorageLocation: sloc,
          manufacturingYear: 2026
        });
      }
    }

    if (rows.length > 0) {
      setParsedRows(rows);
    }
  };

  const handleExecuteImport = () => {
    if (!canIngest) {
      setErrorMsg('ACCIÓN DENEGADA: El ingreso masivo SAP es potestad exclusiva de los Almacenistas Centralizadores del BASPC.');
      return;
    }

    if (parsedRows.length === 0) {
      setErrorMsg('No hay filas válidas del reporte SAP para contabilizar.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    setTimeout(() => {
      const res = silogService.importSapRows(
        parsedRows,
        selectedWarehouseId,
        currentUser.militaryId,
        currentUser.fullName,
        currentUser.roleTitle,
        sapDocInput.trim()
      );

      setLoading(false);
      if (res.success) {
        onSuccess(res.message);
        onClose();
      } else {
        setErrorMsg(res.message);
      }
    }, 500);
  };

  const totalItemsCount = parsedRows.reduce((a, c) => a + c.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col justify-between">
        
        {/* Cabecera */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-950 border border-blue-400/50 flex items-center justify-center text-2xl shadow-lg">
              📑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Ingreso Masivo mediante Reporte SAP (SAP MM / MB52)</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                  SAP S/4HANA MDN
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Almacén Centralizador BASPC • Contabilización de entradas masivas desde Fábrica Indumil y almacenes generales.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg p-1">
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-950/60 border border-red-500/50 p-3 rounded-xl text-xs text-red-200">
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          {/* Parámetros de la Contabilización SAP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block uppercase mb-1">
                Almacén BASPC Receptor (Centro SAP 1601/2301):
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold text-xs focus:outline-none"
              >
                {warehouses.filter(w => w.type === 'BASPC_CENTRAL').map(w => (
                  <option key={w.id} value={w.id}>
                    ⭐ {w.name} ({w.municipality})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block uppercase mb-1">
                Número de Documento de Material SAP:
              </label>
              <input
                type="text"
                value={sapDocInput}
                onChange={(e) => setSapDocInput(e.target.value)}
                placeholder="DOC-SAP-5000189201"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-amber-300 font-mono font-bold text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Área de Entrada de Datos SAP */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>📋</span> Pegar contenido de reporte SAP (MB52 / MB51 / TXT / CSV):
              </label>
              <button
                type="button"
                onClick={handleLoadDemo}
                className="px-3 py-1 bg-blue-950/70 hover:bg-blue-900 border border-blue-500/40 text-blue-300 text-[11px] font-bold rounded-lg transition"
              >
                Cargar Ejemplo Real SAP MB52
              </button>
            </div>

            <textarea
              rows={4}
              value={rawText}
              onChange={(e) => handleParseRawText(e.target.value)}
              placeholder="Copie y pegue las celdas desde SAP GUI (Transacción MB52 o reporte exportado)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Previsualización de Registros Parseados */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Previsualización de Materiales a Contabilizar ({parsedRows.length} partidas | {totalItemsCount.toLocaleString()} unidades)
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Verificados para ingreso automático
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60">
              <table className="w-full text-left text-xs text-slate-300 font-sans">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono sticky top-0">
                  <tr>
                    <th className="p-2.5">Código SAP</th>
                    <th className="p-2.5">Descripción de Material</th>
                    <th className="p-2.5">Clase SILOGA</th>
                    <th className="p-2.5">Cantidad</th>
                    <th className="p-2.5">Lote / Serial</th>
                    <th className="p-2.5">Centro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {parsedRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="p-2.5 text-blue-300 font-bold">{r.materialCode}</td>
                      <td className="p-2.5 font-sans font-medium text-white">{r.materialDescription}</td>
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {r.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-2.5 text-emerald-400 font-bold">{r.quantity.toLocaleString()} {r.unitOfMeasure}</td>
                      <td className="p-2.5 text-cyan-300">{r.batchNumber || r.serialNumber || 'SIN LOTE'}</td>
                      <td className="p-2.5 text-slate-400">{r.sapPlant} / {r.sapStorageLocation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Botonera Inferior */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
          >
            Cancelar
          </button>

          <button
            onClick={handleExecuteImport}
            disabled={loading || parsedRows.length === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xl shadow-blue-950/60 transition-all flex items-center gap-2 border border-blue-400/50 disabled:opacity-50"
          >
            <span>📥</span>
            <span>{loading ? 'Contabilizando en SAP/SILOGA...' : `Contabilizar Entrada Masiva SAP (${parsedRows.length} Partidas)`}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
