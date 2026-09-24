import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Users,
  RefreshCw,
  FileText,
  Trash2,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { SIGEP_API_URL } from '../apiConfig';
import { useAuth } from '../AuthContext';
import {
  downloadBulkTemplate,
  parseBulkPersonnelFile
} from '../services/militaryReportsService';
import type { SoldierData } from './FichaDigital';

export interface CargaMasivaPersonalProps {
  unitId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function CargaMasivaPersonal({ unitId, onSuccess, onCancel }: CargaMasivaPersonalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'FILE' | 'PASTE'>('FILE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parsed candidates & errors
  const [parsedSoldiers, setParsedSoldiers] = useState<SoldierData[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [submitResult, setSubmitResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 1. Manejo de archivo seleccionado
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setParseErrors([]);
    setSubmitResult(null);

    try {
      const { validSoldiers, errors } = await parseBulkPersonnelFile(file, unitId);
      setParsedSoldiers(validSoldiers);
      setParseErrors(errors);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el archivo.';
      setParseErrors([msg]);
      setParsedSoldiers([]);
    } finally {
      setIsParsing(false);
    }
  };

  // 2. Procesamiento de texto pegado
  const handleParsePastedText = () => {
    if (!pastedText.trim()) return;
    setIsParsing(true);
    setParseErrors([]);
    setSubmitResult(null);

    const lines = pastedText.split('\n').map(l => l.trim()).filter(Boolean);
    const validSoldiers: SoldierData[] = [];
    const errors: string[] = [];

    lines.forEach((line, idx) => {
      // Ignorar cabecera si existe
      if (idx === 0 && (line.toUpperCase().includes('NOMBRE') || line.toUpperCase().includes('GRADO'))) {
        return;
      }

      // Separadores: coma, punto y coma, tabulador o barra vertical
      const parts = line.split(/[,\t;|]+/).map(p => p.trim());
      if (parts.length < 2) {
        errors.push(`Línea ${idx + 1}: Formato inválido. Se requiere al menos: Nombre y Grado.`);
        return;
      }

      // Formato esperado: [ID/Cédula], Nombre, Grado, Arma, MOS, Sanidad, Cursos
      const id = parts[0].match(/^\d+$/) ? parts[0] : `SLD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const name = parts[0].match(/^\d+$/) ? (parts[1] || 'SIN NOMBRE') : parts[0];
      const rank = (parts[0].match(/^\d+$/) ? parts[2] : parts[1]) || 'SLP';
      const branch = (parts[0].match(/^\d+$/) ? parts[3] : parts[2]) || 'INFANTERIA';
      const mosCode = (parts[0].match(/^\d+$/) ? parts[4] : parts[3]) || '11B';
      const healthStatus = (parts[0].match(/^\d+$/) ? parts[5] : parts[4]) || 'APTO';
      const cursosCombate = (parts[0].match(/^\d+$/) ? parts[6] : parts[5]) || 'NINGUNO';

      validSoldiers.push({
        id,
        name: name.toUpperCase(),
        rank: rank.toUpperCase(),
        branch: branch.toUpperCase(),
        mosCode: mosCode.toUpperCase(),
        healthStatus: healthStatus.toUpperCase(),
        cursosCombate: cursosCombate.toUpperCase(),
        timeInPosition: 0,
        unitId,
        status: 'ACTIVE'
      });
    });

    setParsedSoldiers(validSoldiers);
    setParseErrors(errors);
    setIsParsing(false);
  };

  // 3. Confirmar carga masiva en el Backend
  const handleCommitBatch = async () => {
    if (parsedSoldiers.length === 0) return;
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await axios.post(
        `${SIGEP_API_URL}/personnel/batch`,
        parsedSoldiers,
        {
          headers: { Authorization: `Bearer ${user?.token}` }
        }
      );

      const count = Array.isArray(res.data) ? res.data.length : parsedSoldiers.length;
      setSubmitResult({
        type: 'success',
        message: `¡Carga masiva completada! Se han incorporado ${count} efectivos exitosamente a la unidad ${unitId}.`
      });

      // Limpiar formulario y notificar actualización
      setParsedSoldiers([]);
      setSelectedFile(null);
      setPastedText('');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: unknown) {
      const msg = (axios.isAxiosError(err) && err.response?.data?.message) || 'Error al registrar lote de efectivos en el servidor.';
      setSubmitResult({
        type: 'error',
        message: msg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-5 sm:p-7 shadow-2xl backdrop-blur-md">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-wide text-white flex items-center gap-2.5">
            <Upload className="w-5 h-5 text-cyan-400" />
            Carga Masiva de Personal Militar
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Incorporación por lotes para la unidad operativa: <strong className="text-cyan-300">{unitId}</strong>
          </p>
        </div>

        {/* Botón Descargar Plantilla */}
        <button
          onClick={downloadBulkTemplate}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold flex items-center gap-2 border border-slate-700 hover:border-cyan-500/50 transition-all shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          Descargar Plantilla (.xlsx)
        </button>
      </div>

      {/* Selector de Método: Archivo Excel vs Pegar Texto */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-800/80 pb-3">
        <button
          onClick={() => setMode('FILE')}
          className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 ${
            mode === 'FILE'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Archivo Excel / CSV
        </button>

        <button
          onClick={() => setMode('PASTE')}
          className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 ${
            mode === 'PASTE'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          Pegado Rápido de Roster
        </button>
      </div>

      {/* Notificación de Resultado */}
      {submitResult && (
        <div
          className={`p-4 rounded-lg mb-6 border text-xs flex items-center gap-3 ${
            submitResult.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
              : 'bg-rose-950/70 border-rose-500/60 text-rose-200'
          }`}
        >
          {submitResult.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          )}
          <span>{submitResult.message}</span>
        </div>
      )}

      {/* MODO 1: Subida de Archivo */}
      {mode === 'FILE' && (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/70 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 group-hover:bg-cyan-950/50 border border-slate-700 group-hover:border-cyan-500/40 flex items-center justify-center mx-auto mb-4 text-slate-400 group-hover:text-cyan-400 transition-colors shadow-inner">
            <Upload className="w-8 h-8" />
          </div>

          <h3 className="text-sm sm:text-base font-bold text-white mb-1">
            {selectedFile ? selectedFile.name : 'Arrastra tu archivo Excel o haz clic para seleccionar'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Formatos compatibles: <strong className="text-cyan-300">.xlsx, .xls, .csv</strong>. El archivo debe contener las columnas: Cédula/ID, Nombre, Grado, Arma, MOS y Sanidad.
          </p>
        </div>
      )}

      {/* MODO 2: Pegado Rápido */}
      {mode === 'PASTE' && (
        <div className="space-y-3">
          <label className="block text-xs font-mono text-slate-300">
            Pega el listado copiado de Excel, Word o correo militar (separado por comas, tabuladores o punto y coma):
          </label>
          <textarea
            rows={6}
            placeholder="1098234561, GOMEZ RESTREPO CARLOS, CT, INFANTERIA, 11A, APTO, LANCERO&#10;1098234562, PEREZ MONTOYA ANDRES, CP, INGENIEROS, 12B, APTO, EXPLOSIVOS"
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          />
          <div className="flex justify-end">
            <button
              onClick={handleParsePastedText}
              disabled={isParsing || !pastedText.trim()}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs tracking-wider uppercase disabled:opacity-50 flex items-center gap-2"
            >
              {isParsing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Analizar Texto
            </button>
          </div>
        </div>
      )}

      {/* Errores de Validación */}
      {parseErrors.length > 0 && (
        <div className="mt-6 p-4 rounded-lg bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200">
          <div className="flex items-center gap-2 font-bold mb-2 text-amber-300">
            <AlertCircle className="w-4 h-4" />
            Observaciones detectadas ({parseErrors.length}):
          </div>
          <ul className="list-disc pl-5 space-y-1 font-mono text-[11px]">
            {parseErrors.slice(0, 5).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
            {parseErrors.length > 5 && (
              <li className="italic">Y {parseErrors.length - 5} observaciones adicionales...</li>
            )}
          </ul>
        </div>
      )}

      {/* Tabla de Previsualización de Efectivos Válidos */}
      {parsedSoldiers.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Efectivos Listos para Incorporación ({parsedSoldiers.length})
              </h4>
            </div>
            <button
              onClick={() => {
                setParsedSoldiers([]);
                setSelectedFile(null);
              }}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Descartar
            </button>
          </div>

          <div className="overflow-x-auto max-h-72 border border-slate-800 rounded-lg custom-scrollbar">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="p-2.5">ID MILITAR</th>
                  <th className="p-2.5">GRADO</th>
                  <th className="p-2.5">NOMBRES Y APELLIDOS</th>
                  <th className="p-2.5">ARMA</th>
                  <th className="p-2.5">MOS</th>
                  <th className="p-2.5">SANIDAD</th>
                  <th className="p-2.5">CURSOS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                {parsedSoldiers.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-2.5 text-cyan-300">{s.id}</td>
                    <td className="p-2.5 font-bold text-white">{s.rank}</td>
                    <td className="p-2.5 text-slate-200">{s.name}</td>
                    <td className="p-2.5 text-slate-400">{s.branch}</td>
                    <td className="p-2.5 text-cyan-400">{s.mosCode}</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                        {s.healthStatus}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-400 truncate max-w-xs">{s.cursosCombate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Botón de Confirmación Definitiva */}
          <div className="pt-4 flex justify-end gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold uppercase transition-all"
              >
                Cancelar
              </button>
            )}

            <button
              onClick={handleCommitBatch}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-emerald-950/50 flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Incorporando en Base de Datos...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  Confirmar Alta Masiva ({parsedSoldiers.length} Efectivos)
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
