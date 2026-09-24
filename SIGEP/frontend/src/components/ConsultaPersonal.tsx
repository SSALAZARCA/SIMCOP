import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  FileText,
  Users,
  BookOpen,
  UserCheck,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  X,
  Shield,
  MapPin
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useUnit } from '../UnitContext';
import axios from 'axios';
import { SIGEP_API_URL } from '../apiConfig';
import FichaDigital from './FichaDigital';
import type { DossierData, SoldierData } from './FichaDigital';
import { getRankCategory, getRankBadgeClasses } from '../services/militaryRankService';
import LibroNovedades from './LibroNovedades';
import CargaMasivaPersonal from './CargaMasivaPersonal';

export type RankCategory = 'TODOS' | 'OFICIAL' | 'SUBOFICIAL' | 'SOLDADO';

export interface ConsultaPersonalProps {
  role: string;
  unitId?: string;
}

export default function ConsultaPersonal({ unitId: propUnitId }: ConsultaPersonalProps) {
  const { user } = useAuth();
  const userToken = user?.token;
  const { selectedUnitId, selectedUnit, accessibleUnits, setSelectedUnitId, m2mStatus } = useUnit();

  // Active effective unit from global context, prop override, or auth fallback
  const effectiveUnitId = propUnitId || selectedUnitId || user?.unitId || 'NATIONAL';

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'EXPEDIENTES' | 'NOVEDADES' | 'ALTA' | 'CARGA_MASIVA'>('EXPEDIENTES');

  // Search & rank filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RankCategory>('TODOS');

  // Soldiers & dossier
  const [soldiers, setSoldiers] = useState<SoldierData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSoldier, setSelectedSoldier] = useState<SoldierData | null>(null);
  const [dossier, setDossier] = useState<DossierData | null>(null);
  const [isDossierLoading, setIsDossierLoading] = useState(false);

  // Alta form state
  const [altaForm, setAltaForm] = useState({
    name: '',
    cedula: '',
    rank: 'CT',
    mosCode: '11A',
    branch: 'INFANTERIA',
    healthStatus: 'APTO',
    cursosCombate: 'LANCERO'
  });
  const [altaStatus, setAltaStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: ''
  });
  const [isSubmittingAlta, setIsSubmittingAlta] = useState(false);

  // Fetch soldiers when effective unit changes
  const fetchSoldiers = useCallback(async () => {
    if (!effectiveUnitId) return;
    setIsLoading(true);
    try {
      const res = await axios.get<SoldierData[]>(`${SIGEP_API_URL}/personnel/unit/${effectiveUnitId}`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setSoldiers(data);
      setSelectedSoldier(null);
      setDossier(null);
    } catch (e) {
      console.error('Error al obtener efectivos de la unidad:', e);
      setSoldiers([]);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUnitId, userToken]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (!effectiveUnitId) return;
      setIsLoading(true);
      try {
        const res = await axios.get<SoldierData[]>(`${SIGEP_API_URL}/personnel/unit/${effectiveUnitId}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        if (isMounted) {
          const data = Array.isArray(res.data) ? res.data : [];
          setSoldiers(data);
          setSelectedSoldier(null);
          setDossier(null);
        }
      } catch (e) {
        console.error('Error al obtener efectivos de la unidad:', e);
        if (isMounted) setSoldiers([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [effectiveUnitId, userToken]);

  // Load military dossier with robust fallback
  const loadDossier = async (soldier: SoldierData) => {
    setIsDossierLoading(true);
    try {
      const res = await axios.get<DossierData>(`${SIGEP_API_URL}/personnel/${soldier.id}/dossier`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      if (res.data && res.data.soldier) {
        setDossier(res.data);
      } else {
        setDossier({
          soldier,
          history: [],
          unitHistory: [soldier.unitId || effectiveUnitId]
        });
      }
    } catch (e) {
      console.error('Error al descargar expediente militar:', e);
      setDossier({
        soldier,
        history: [],
        unitHistory: [soldier.unitId || effectiveUnitId]
      });
    } finally {
      setIsDossierLoading(false);
    }
  };

  const handleSelectSoldier = (soldier: SoldierData) => {
    setSelectedSoldier(soldier);
    setDossier(null);
    loadDossier(soldier);
  };

  // Instant in-memory search and category filter
  const filteredSoldiers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return soldiers.filter(s => {
      // 1. In-memory Search Bar matching: Name, Cédula / ID, MOS code, Rank, Branch
      if (query) {
        const nameMatch = (s.name || '').toLowerCase().includes(query);
        const idMatch = (s.id || '').toLowerCase().includes(query);
        const cedulaMatch = s.cedula ? String(s.cedula).toLowerCase().includes(query) : false;
        const mosMatch = (s.mosCode || '').toLowerCase().includes(query);
        const rankMatch = (s.rank || '').toLowerCase().includes(query);
        const branchMatch = (s.branch || '').toLowerCase().includes(query);

        if (!nameMatch && !idMatch && !cedulaMatch && !mosMatch && !rankMatch && !branchMatch) {
          return false;
        }
      }

      // 2. Exact Rank Category filter
      if (selectedCategory === 'TODOS') return true;
      return getRankCategory(s.rank) === selectedCategory;
    });
  }, [soldiers, searchQuery, selectedCategory]);

  // Handle Alta Submission
  const handleAlta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveUnitId) {
      setAltaStatus({ type: 'error', message: 'Seleccione una unidad válida en el selector superior.' });
      return;
    }

    setIsSubmittingAlta(true);
    setAltaStatus({ type: null, message: '' });

    try {
      await axios.post(
        `${SIGEP_API_URL}/personnel`,
        {
          ...altaForm,
          unitId: effectiveUnitId,
          status: 'ACTIVE',
          timeInPosition: 0
        },
        {
          headers: { Authorization: `Bearer ${user?.token}` }
        }
      );

      setAltaStatus({
        type: 'success',
        message: `Efectivo '${altaForm.name}' incorporado exitosamente a la dotación de la unidad ${effectiveUnitId}.`
      });

      setAltaForm({
        name: '',
        cedula: '',
        rank: 'CT',
        mosCode: '11A',
        branch: 'INFANTERIA',
        healthStatus: 'APTO',
        cursosCombate: 'LANCERO'
      });

      fetchSoldiers();
    } catch (err: unknown) {
      const errMessage = (axios.isAxiosError(err) && err.response?.data?.message) || 'Error al tramitar alta de personal en SIGEP.';
      setAltaStatus({
        type: 'error',
        message: errMessage
      });
    } finally {
      setIsSubmittingAlta(false);
    }
  };



  return (
    <div className="space-y-6">

      {/* ------------------------------------------------------------------ */}
      {/* 1. Header Táctico y Barra de Pestañas Principales                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl backdrop-blur-md">
        
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-inner">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-wide text-white flex items-center gap-2">
                Expediente Digital Militar 360°
              </h1>
              
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  Unidad Orgánica:
                </span>

                {/* Local unit selector synchronized with useUnit() */}
                {accessibleUnits && accessibleUnits.length > 1 ? (
                  <select
                    value={effectiveUnitId}
                    onChange={e => setSelectedUnitId(e.target.value)}
                    className="bg-slate-950 text-cyan-300 font-bold border border-slate-700 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-cyan-400"
                  >
                    {accessibleUnits.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.id} - {u.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-cyan-300 font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                    {selectedUnit ? `${selectedUnit.id} - ${selectedUnit.name}` : effectiveUnitId}
                  </span>
                )}

                <span className="text-slate-600">•</span>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  m2mStatus === 'CONNECTED' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                }`}>
                  M2M {m2mStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Tabs: EXPEDIENTES, NOVEDADES, ALTA, CARGA_MASIVA */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-800 w-full md:w-auto overflow-x-auto">
          
          <button
            onClick={() => setActiveTab('EXPEDIENTES')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-md text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'EXPEDIENTES'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>EXPEDIENTES</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-cyan-400">
              {soldiers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('NOVEDADES')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-md text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'NOVEDADES'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>NOVEDADES</span>
          </button>

          <button
            onClick={() => setActiveTab('ALTA')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-md text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'ALTA'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ALTA</span>
          </button>

          <button
            onClick={() => setActiveTab('CARGA_MASIVA')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-md text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'CARGA_MASIVA'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>IMPORTACIÓN</span>
          </button>

        </div>

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Pestaña Principal: Expedientes y Ficha Digital Militar 360°      */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'EXPEDIENTES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Columna Izquierda: Tactical Sidebar Roster */}
          <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col h-[780px] shadow-xl backdrop-blur-sm">
            
            {/* Roster Header with Active Headcount Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Nómina Orgánica
                </h3>
              </div>

              {/* Active Headcount Badge */}
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 shadow-sm">
                  {filteredSoldiers.length} Efectivos
                </span>
              </div>
            </div>

            {/* Instant In-Memory Search Bar */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por nombre, cédula, MOS, rango..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tactical Rank Category Chips */}
            <div className="grid grid-cols-4 gap-1 mb-3">
              {(['TODOS', 'OFICIAL', 'SUBOFICIAL', 'SOLDADO'] as RankCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`py-1.5 text-[10px] font-mono font-bold tracking-wider rounded border text-center transition-all ${
                    selectedCategory === cat
                      ? 'bg-cyan-950/90 border-cyan-500/60 text-cyan-300 shadow-sm'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {cat === 'TODOS' ? 'TODOS' : cat === 'OFICIAL' ? 'OFIC' : cat === 'SUBOFICIAL' ? 'SUBOF' : 'SLD'}
                </button>
              ))}
            </div>

            {/* Soldiers List Counter Meta */}
            <div className="text-[11px] font-mono text-slate-400 mb-2 flex justify-between px-1">
              <span>Filtrados: <strong className="text-cyan-400">{filteredSoldiers.length}</strong></span>
              <span>Total Unidad: <strong className="text-slate-300">{soldiers.length}</strong></span>
            </div>

            {/* Scrollable Tactical Personnel List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                  <span className="text-xs font-mono">Cargando nómina física...</span>
                </div>
              ) : filteredSoldiers.length === 0 ? (
                <div className="text-center py-16 px-4 text-slate-500">
                  <Users className="w-10 h-10 mx-auto opacity-30 mb-2 text-cyan-400" />
                  <p className="text-xs font-mono">No se encontraron efectivos que coincidan con la búsqueda.</p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-3 px-3 py-1 text-xs font-mono text-cyan-400 border border-cyan-500/30 rounded bg-cyan-950/40 hover:bg-cyan-950/80"
                    >
                      Limpiar Filtro
                    </button>
                  )}
                </div>
              ) : (
                filteredSoldiers.map(s => {
                  const isSelected = selectedSoldier?.id === s.id;
                  const healthUpper = (s.healthStatus || 'APTO').toUpperCase();
                  const isApto = healthUpper === 'APTO';
                  const isNoApto = healthUpper.includes('NO APTO');
                  const isExcusado = healthUpper.includes('EXCUSA');
                  const isLicencia = healthUpper.includes('LICENCIA');

                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSoldier(s)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all duration-150 relative overflow-hidden ${
                        isSelected
                          ? 'border-cyan-500/80 bg-cyan-950/30 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-500/40'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                      }`}
                    >
                      {/* Left glowing accent bar */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                          isSelected
                            ? 'bg-cyan-400'
                            : isApto
                            ? 'bg-emerald-500'
                            : isNoApto
                            ? 'bg-rose-500'
                            : 'bg-amber-500'
                        }`}
                      />

                      <div className="pl-2">
                        {/* Top row: Rank badge, Name, Status chip */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            {/* Rank badge */}
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${getRankBadgeClasses(s.rank)}`}>
                              {s.rank}
                            </span>
                            <span className="font-bold text-white text-xs truncate">
                              {s.name}
                            </span>
                          </div>

                          {/* Operational Health Status Chip */}
                          <div className="flex-shrink-0">
                            {isApto && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                                APTO
                              </span>
                            )}
                            {isNoApto && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-950/80 border border-rose-500/40 text-rose-300">
                                NO APTO
                              </span>
                            )}
                            {isExcusado && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950/80 border border-amber-500/40 text-amber-300">
                                EXCUSA
                              </span>
                            )}
                            {isLicencia && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-950/80 border border-blue-500/40 text-blue-300">
                                LICENCIA
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom row: Document/ID, Branch, MOS */}
                        <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-slate-400">
                          <span>
                            ID: <strong className="text-slate-300">{s.cedula || String(s.id).substring(0, 10)}</strong>
                          </span>
                          <div className="flex items-center gap-2">
                            <span>Arma: <strong className="text-slate-300">{s.branch || 'INF'}</strong></span>
                            <span>MOS: <strong className="text-cyan-300">{s.mosCode || '11B'}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Columna Derecha: Visor de Expediente Digital (FichaDigital) */}
          <div className="lg:col-span-8 h-[780px]">
            {!selectedSoldier ? (
              <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-xl p-12 text-center h-full flex flex-col items-center justify-center text-slate-500">
                <FileText className="w-16 h-16 opacity-20 mb-3 text-cyan-400" />
                <h3 className="text-lg font-bold text-slate-300 mb-1">Ningún Expediente Seleccionado</h3>
                <p className="text-xs max-w-sm text-slate-500 font-mono">
                  Seleccione un oficial, suboficial o soldado de la lista lateral para visualizar su expediente militar digital en 360°.
                </p>
              </div>
            ) : isDossierLoading ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center h-full flex flex-col items-center justify-center text-cyan-400 gap-3">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <p className="text-sm font-mono tracking-wider">Descargando expediente clasificado...</p>
              </div>
            ) : (
              <FichaDigital
                dossier={dossier}
                userToken={user?.token}
                onRegisterNovedad={() => setActiveTab('NOVEDADES')}
              />
            )}
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. Pestaña: Libro de Novedades Diario                              */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'NOVEDADES' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-md">
          <LibroNovedades
            unitId={effectiveUnitId}
            userToken={user?.token || ''}
            soldiers={soldiers}
            onUpdate={fetchSoldiers}
          />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. Pestaña: Alta Individual de Personal                            */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'ALTA' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 sm:p-8 max-w-3xl mx-auto shadow-2xl backdrop-blur-md">
          <div className="border-b border-slate-800 pb-4 mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-cyan-400" />
              Alta Reglamentaria de Personal Físico
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Incorpore un nuevo efectivo a la dotación orgánica de la unidad <strong className="text-cyan-300">{effectiveUnitId}</strong>.
            </p>
          </div>

          {altaStatus.type && (
            <div
              className={`p-4 rounded-lg mb-6 border text-xs flex items-center gap-2.5 ${
                altaStatus.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
              }`}
            >
              {altaStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{altaStatus.message}</span>
            </div>
          )}

          <form onSubmit={handleAlta} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">
                  Nombre Completo y Apellidos
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Gomez Restrepo Carlos"
                  value={altaForm.name}
                  onChange={e => setAltaForm({ ...altaForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">
                  Cédula / Documento de Identidad
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: 1098234561"
                  value={altaForm.cedula}
                  onChange={e => setAltaForm({ ...altaForm, cedula: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">
                  Grado / Rango Militar
                </label>
                <select
                  required
                  value={altaForm.rank}
                  onChange={e => setAltaForm({ ...altaForm, rank: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <optgroup label="Oficiales">
                    <option value="GR">General (GR)</option>
                    <option value="MG">Mayor General (MG)</option>
                    <option value="BG">Brigadier General (BG)</option>
                    <option value="CR">Coronel (CR)</option>
                    <option value="TC">Teniente Coronel (TC)</option>
                    <option value="MY">Mayor (MY)</option>
                    <option value="CT">Capitán (CT)</option>
                    <option value="TE">Teniente (TE)</option>
                    <option value="ST">Subteniente (ST)</option>
                  </optgroup>
                  <optgroup label="Suboficiales">
                    <option value="SMCC">Sargento Mayor Comando Conjunto (SMCC)</option>
                    <option value="SMC">Sargento Mayor Comando (SMC)</option>
                    <option value="SM">Sargento Mayor (SM)</option>
                    <option value="SP">Sargento Primero (SP)</option>
                    <option value="SV">Sargento Viceprimero (SV)</option>
                    <option value="SS">Sargento Segundo (SS)</option>
                    <option value="CP">Cabo Primero (CP)</option>
                    <option value="CS">Cabo Segundo (CS)</option>
                    <option value="C3">Cabo Tercero (C3)</option>
                  </optgroup>
                  <optgroup label="Soldados">
                    <option value="SLP">Soldado Profesional (SLP)</option>
                    <option value="SL18">Soldado (SL18)</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">
                  Arma Militar
                </label>
                <input
                  required
                  type="text"
                  placeholder="INFANTERIA, CABALLERIA, INGENIEROS..."
                  value={altaForm.branch}
                  onChange={e => setAltaForm({ ...altaForm, branch: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">
                  Especialidad MOS
                </label>
                <input
                  required
                  type="text"
                  placeholder="11A, 11B, 19D, 12B, 25B..."
                  value={altaForm.mosCode}
                  onChange={e => setAltaForm({ ...altaForm, mosCode: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">
                  Condición Psicofísica
                </label>
                <select
                  required
                  value={altaForm.healthStatus}
                  onChange={e => setAltaForm({ ...altaForm, healthStatus: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="APTO">APTO (Apto para el servicio)</option>
                  <option value="NO APTO">NO APTO (Baja médica)</option>
                  <option value="EXCUSA MEDICA">EXCUSA MÉDICA (Tratamiento)</option>
                  <option value="LICENCIA">LICENCIA</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">
                  Cursos de Combate (Separados por coma)
                </label>
                <input
                  type="text"
                  placeholder="LANCERO, PARACAIDISTA, FUERZAS ESPECIALES..."
                  value={altaForm.cursosCombate}
                  onChange={e => setAltaForm({ ...altaForm, cursosCombate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingAlta}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-md shadow-cyan-900/30 flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmittingAlta ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Procesando Alta...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    Incorporar a SIGEP
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 5. Pestaña: Carga Masiva (Excel / CSV)                             */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'CARGA_MASIVA' && (
        <CargaMasivaPersonal
          unitId={effectiveUnitId}
          onSuccess={() => {
            fetchSoldiers();
            setActiveTab('EXPEDIENTES');
          }}
          onCancel={() => setActiveTab('EXPEDIENTES')}
        />
      )}

    </div>
  );
}
