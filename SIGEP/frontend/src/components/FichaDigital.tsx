import React, { useState, useMemo } from 'react';
import {
  Activity,
  Clock,
  Award,
  Shield,
  Building,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  Download,
  Calendar,
  Crosshair,
  AlertCircle,
  Compass,
  Radio,
  Wrench,
  Flame,
  Plus,
  Zap,
  Tag,
  MapPin,
  FileCheck,
  Plane
} from 'lucide-react';
import { generateDossierPdf } from '../services/militaryReportsService';
import { getRankSubcategory } from '../services/militaryRankService';

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export interface SoldierData {
  id: string;
  cedula?: string;
  name: string;
  rank: string;
  branch?: string;
  mosCode?: string;
  status?: string;
  healthStatus?: string;
  physicalAptitude?: string;
  psychologicalAptitude?: string;
  timeInPosition?: number;
  cursosCombate?: string;
  assignmentDate?: string;
  joinDate?: string;
  unitId?: string;
  platoon?: string;
  company?: string;
  role?: string;
  [key: string]: unknown;
}

export interface NovedadItem {
  id?: string | number;
  tipo: string;
  descripcion: string;
  fecha: string;
  resolucion?: string;
  reportadoPor?: string;
  registradoPor?: string;
  categoria?: 'OPERACIONAL' | 'MEDICA' | 'DISCIPLINARIA' | 'ADMINISTRATIVA' | string;
}

export interface DossierData {
  soldier: SoldierData;
  history?: NovedadItem[];
  unitHistory?: string[];
}

export interface FichaDigitalProps {
  dossier: DossierData | null;
  userToken?: string;
  onClose?: () => void;
  onRegisterNovedad?: (soldier: SoldierData) => void;
}

// ---------------------------------------------------------------------------
// Colombian Military Branch Heraldry Definitions
// ---------------------------------------------------------------------------

interface BranchHeraldry {
  name: string;
  displayName: string;
  motto: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  iconBg: string;
  iconBorder: string;
}

const BRANCH_HERALDRY: Record<string, BranchHeraldry> = {
  INFANTERIA: {
    name: 'INFANTERIA',
    displayName: 'Infantería',
    motto: 'Paso de Vencedores',
    badgeBg: 'bg-red-950/40',
    badgeBorder: 'border-red-500/50',
    badgeText: 'text-red-400',
    iconBg: 'bg-red-950/70',
    iconBorder: 'border-red-500/60'
  },
  CABALLERIA: {
    name: 'CABALLERIA',
    displayName: 'Caballería Blindada',
    motto: 'Salve Usted la Patria',
    badgeBg: 'bg-amber-950/40',
    badgeBorder: 'border-amber-500/50',
    badgeText: 'text-amber-400',
    iconBg: 'bg-amber-950/70',
    iconBorder: 'border-amber-500/60'
  },
  ARTILLERIA: {
    name: 'ARTILLERIA',
    displayName: 'Artillería',
    motto: 'Deber Antes que Vida',
    badgeBg: 'bg-rose-950/40',
    badgeBorder: 'border-rose-500/50',
    badgeText: 'text-rose-400',
    iconBg: 'bg-rose-950/70',
    iconBorder: 'border-rose-500/60'
  },
  INGENIEROS: {
    name: 'INGENIEROS',
    displayName: 'Ingenieros Militares',
    motto: 'Vencer o Morir',
    badgeBg: 'bg-purple-950/40',
    badgeBorder: 'border-purple-500/50',
    badgeText: 'text-purple-400',
    iconBg: 'bg-purple-950/70',
    iconBorder: 'border-purple-500/60'
  },
  COMUNICACIONES: {
    name: 'COMUNICACIONES',
    displayName: 'Comunicaciones',
    motto: 'Ciencia y Valor',
    badgeBg: 'bg-orange-950/40',
    badgeBorder: 'border-orange-500/50',
    badgeText: 'text-orange-400',
    iconBg: 'bg-orange-950/70',
    iconBorder: 'border-orange-500/60'
  },
  INTELIGENCIA: {
    name: 'INTELIGENCIA',
    displayName: 'Inteligencia Militar',
    motto: 'El Poder del Conocimiento',
    badgeBg: 'bg-sky-950/40',
    badgeBorder: 'border-sky-500/50',
    badgeText: 'text-sky-400',
    iconBg: 'bg-sky-950/70',
    iconBorder: 'border-sky-500/60'
  },
  LOGISTICA: {
    name: 'LOGISTICA',
    displayName: 'Logística y Abastecimiento',
    motto: 'Sostener la Fuerza',
    badgeBg: 'bg-slate-900',
    badgeBorder: 'border-slate-600',
    badgeText: 'text-slate-300',
    iconBg: 'bg-slate-950',
    iconBorder: 'border-slate-500/60'
  },
  SANIDAD: {
    name: 'SANIDAD',
    displayName: 'Sanidad Militar',
    motto: 'Salus Populi Suprema Lex',
    badgeBg: 'bg-emerald-950/40',
    badgeBorder: 'border-emerald-500/50',
    badgeText: 'text-emerald-400',
    iconBg: 'bg-emerald-950/70',
    iconBorder: 'border-emerald-500/60'
  },
  AVIACION: {
    name: 'AVIACION',
    displayName: 'Aviación del Ejército',
    motto: 'Gloria Sobre el Horizonte',
    badgeBg: 'bg-cyan-950/40',
    badgeBorder: 'border-cyan-500/50',
    badgeText: 'text-cyan-400',
    iconBg: 'bg-cyan-950/70',
    iconBorder: 'border-cyan-500/60'
  }
};

function getBranchInfo(branchRaw?: string): BranchHeraldry {
  if (!branchRaw) return BRANCH_HERALDRY.INFANTERIA;
  const b = branchRaw.toUpperCase();
  if (b.includes('INF')) return BRANCH_HERALDRY.INFANTERIA;
  if (b.includes('CAB')) return BRANCH_HERALDRY.CABALLERIA;
  if (b.includes('ART')) return BRANCH_HERALDRY.ARTILLERIA;
  if (b.includes('ING')) return BRANCH_HERALDRY.INGENIEROS;
  if (b.includes('COM')) return BRANCH_HERALDRY.COMUNICACIONES;
  if (b.includes('INT')) return BRANCH_HERALDRY.INTELIGENCIA;
  if (b.includes('LOG') || b.includes('ADM') || b.includes('SER') || b.includes('ABASTEC')) return BRANCH_HERALDRY.LOGISTICA;
  if (b.includes('SAN') || b.includes('MED')) return BRANCH_HERALDRY.SANIDAD;
  if (b.includes('AV') || b.includes('AER')) return BRANCH_HERALDRY.AVIACION;
  return BRANCH_HERALDRY.INFANTERIA;
}

// ---------------------------------------------------------------------------
// Colombian Military Combat Courses Definitions
// ---------------------------------------------------------------------------

interface CombatCourseInfo {
  code: string;
  name: string;
  motto: string;
  description: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  iconType: 'dagger' | 'wings' | 'target' | 'flame' | 'shield' | 'compass' | 'crosshair';
}

const COMBAT_COURSES_CATALOG: CombatCourseInfo[] = [
  {
    code: 'LANCERO',
    name: 'Lancero de Colombia',
    motto: 'Lealtad, Valor, Sacrificio',
    description: 'Curso insignia de combate irregular y operaciones de contraguerrilla en selva y montaña.',
    badgeBg: 'bg-amber-950/50',
    badgeBorder: 'border-amber-500/60',
    badgeText: 'text-amber-300',
    iconType: 'flame'
  },
  {
    code: 'PARACAIDISTA',
    name: 'Paracaidista Militar',
    motto: 'Desde las nubes, victoria',
    description: 'Calificación operacional en inserción aerotransportada y salto militar táctico.',
    badgeBg: 'bg-sky-950/50',
    badgeBorder: 'border-sky-500/60',
    badgeText: 'text-sky-300',
    iconType: 'wings'
  },
  {
    code: 'FUERZAS ESPECIALES',
    name: 'Fuerzas Especiales / Comandos',
    motto: 'Unión, Fuerza, Victoria',
    description: 'Especialista en operaciones encubiertas de asalto directo, rescate de rehenes y acción decisiva.',
    badgeBg: 'bg-purple-950/50',
    badgeBorder: 'border-purple-500/60',
    badgeText: 'text-purple-300',
    iconType: 'dagger'
  },
  {
    code: 'COMANDO',
    name: 'Comando Urbano y Rural',
    motto: 'Victoria en el Silencio',
    description: 'Doctrina de asalto de precisión táctico y neutralización de objetivos de alto valor.',
    badgeBg: 'bg-purple-950/50',
    badgeBorder: 'border-purple-500/60',
    badgeText: 'text-purple-300',
    iconType: 'dagger'
  },
  {
    code: 'CONTRAGUERRILLA',
    name: 'Contraguerrilla / Jungla',
    motto: 'Por la patria, con honor',
    description: 'Operaciones prolongadas de interdicción en áreas boscosas y hostiles.',
    badgeBg: 'bg-emerald-950/50',
    badgeBorder: 'border-emerald-500/60',
    badgeText: 'text-emerald-300',
    iconType: 'shield'
  },
  {
    code: 'ASALTO AEREO',
    name: 'Asalto Aéreo Militar',
    motto: 'En cualquier momento, en cualquier lugar',
    description: 'Tácticas de descenso por cuerda rápida (Fast Rope) y helitransporte de asalto.',
    badgeBg: 'bg-cyan-950/50',
    badgeBorder: 'border-cyan-500/60',
    badgeText: 'text-cyan-300',
    iconType: 'wings'
  },
  {
    code: 'EXPLORADOR',
    name: 'Explorador y Guía Táctico',
    motto: 'Ojos y oídos del mando',
    description: 'Navegación terrestre de precisión, supervivencia y reconocimiento avanzado de blancos.',
    badgeBg: 'bg-amber-950/50',
    badgeBorder: 'border-amber-500/60',
    badgeText: 'text-amber-300',
    iconType: 'compass'
  },
  {
    code: 'GUIA CANINO',
    name: 'Guía Canino de Combate',
    motto: 'Fiel hasta la muerte',
    description: 'Conducción de binomios caninos para detección de explosivos y rastreo perimetral.',
    badgeBg: 'bg-slate-900',
    badgeBorder: 'border-slate-600',
    badgeText: 'text-slate-300',
    iconType: 'shield'
  },
  {
    code: 'EOD',
    name: 'Técnico Antibombas / EOD',
    motto: 'El primer error es el último',
    description: 'Neutralización, desactivación y análisis técnico de artefactos explosivos improvisados.',
    badgeBg: 'bg-rose-950/50',
    badgeBorder: 'border-rose-500/60',
    badgeText: 'text-rose-300',
    iconType: 'flame'
  },
  {
    code: 'TIRADOR ESCOGIDO',
    name: 'Tirador Escogido de Plataforma',
    motto: 'Un disparo, una misión',
    description: 'Tiro de alta precisión a distancias extremas y neutralización selectiva.',
    badgeBg: 'bg-emerald-950/50',
    badgeBorder: 'border-emerald-500/60',
    badgeText: 'text-emerald-300',
    iconType: 'crosshair'
  }
];

function matchCombatCourse(rawName: string): CombatCourseInfo {
  const clean = rawName.trim().toUpperCase();
  const matched = COMBAT_COURSES_CATALOG.find(c => clean.includes(c.code));
  if (matched) return matched;
  return {
    code: clean,
    name: clean,
    motto: 'Al Servicio de la Patria',
    description: 'Especialización militar certificada según registros oficiales de la jefatura de instrucción.',
    badgeBg: 'bg-slate-950/60',
    badgeBorder: 'border-cyan-500/40',
    badgeText: 'text-cyan-300',
    iconType: 'shield'
  };
}

// ---------------------------------------------------------------------------
// Heraldic Vector Badge Component: Colombian Army Rank Insignia
// ---------------------------------------------------------------------------

function RankInsignia({ rank }: { rank: string }) {
  const r = (rank || '').toUpperCase().trim();
  const subcategory = getRankSubcategory(r);

  let badgeClasses = 'border-blue-500/70 bg-gradient-to-b from-blue-950/40 to-slate-950 text-blue-300 shadow-blue-950/40';
  let badgeRing = 'ring-blue-500/20';

  if (subcategory === 'OFICIAL GENERAL') {
    badgeClasses = 'border-amber-400/80 bg-gradient-to-b from-amber-950/50 to-slate-950 text-amber-300 shadow-amber-950/50';
    badgeRing = 'ring-amber-500/30';
  } else if (subcategory === 'OFICIAL SUPERIOR') {
    badgeClasses = 'border-slate-300/80 bg-gradient-to-b from-slate-800/60 to-slate-950 text-slate-100 shadow-slate-900/50';
    badgeRing = 'ring-slate-400/20';
  } else if (subcategory === 'OFICIAL SUBALTERNO') {
    badgeClasses = 'border-cyan-400/80 bg-gradient-to-b from-cyan-950/50 to-slate-950 text-cyan-300 shadow-cyan-950/50';
    badgeRing = 'ring-cyan-500/30';
  } else if (subcategory === 'SUBOFICIAL') {
    badgeClasses = 'border-emerald-400/80 bg-gradient-to-b from-emerald-950/50 to-slate-950 text-emerald-300 shadow-emerald-950/50';
    badgeRing = 'ring-emerald-500/30';
  }

  // Generales: 4, 3, 2 estrellas
  const isGeneral4 = r === 'GR' || (r.includes('GENERAL') && !r.includes('MAYOR') && !r.includes('BRIGADIER'));
  const isGeneral3 = r === 'MG' || r.includes('MAYOR');
  
  // Superiores: 3, 2, 1 rombos
  const isCoronel = r === 'CR' || (r.includes('CORONEL') && !r.includes('TENIENTE'));
  const isTCoronel = r === 'TC' || r.includes('TENIENTE');
  
  // Subalternos: 3, 2, 1 barras
  const isCapitan = r === 'CT' || r.includes('CAPITAN') || r.includes('CAPITÁN');
  const isTeniente = r === 'TE' || (r.includes('TENIENTE') && !r.includes('SUBTENIENTE'));

  // Suboficiales: chevrons count
  const isHighNco = ['SMCC', 'SMC', 'SM', 'SP'].includes(r) || r.includes('MAYOR') || r.includes('PRIMERO');
  const isMidNco = ['SV', 'SS', 'CP'].includes(r) || r.includes('VICEPRIMERO') || r.includes('SEGUNDO');

  return (
    <div className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 shadow-lg ring-1 ${badgeClasses} ${badgeRing} w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 transition-transform duration-200`}>
      {/* SVG Heraldic Insignia */}
      <div className="w-10 h-7 flex items-center justify-center">
        {subcategory === 'OFICIAL GENERAL' ? (
          <div className="flex gap-0.5 items-center justify-center">
            {isGeneral4 ? (
              [0, 1, 2, 3].map(i => (
                <span key={i} className="text-amber-400 text-xs">★</span>
              ))
            ) : isGeneral3 ? (
              [0, 1, 2].map(i => (
                <span key={i} className="text-amber-400 text-xs">★</span>
              ))
            ) : (
              [0, 1].map(i => (
                <span key={i} className="text-amber-400 text-sm">★</span>
              ))
            )}
          </div>
        ) : subcategory === 'OFICIAL SUPERIOR' ? (
          <div className="flex gap-1 items-center justify-center">
            {isCoronel ? (
              <div className="flex gap-1">
                <span className="text-slate-200 text-xs">◆</span>
                <span className="text-slate-200 text-xs">◆</span>
                <span className="text-slate-200 text-xs">◆</span>
              </div>
            ) : isTCoronel ? (
              <div className="flex gap-1">
                <span className="text-slate-200 text-xs">◆</span>
                <span className="text-slate-200 text-xs">◆</span>
              </div>
            ) : (
              <span className="text-slate-200 text-sm">◆</span>
            )}
          </div>
        ) : subcategory === 'OFICIAL SUBALTERNO' ? (
          <div className="flex gap-1 items-center justify-center h-5">
            {isCapitan ? (
              <>
                <div className="w-1 h-4 bg-cyan-400 rounded-sm"></div>
                <div className="w-1 h-4 bg-cyan-400 rounded-sm"></div>
                <div className="w-1 h-4 bg-cyan-400 rounded-sm"></div>
              </>
            ) : isTeniente ? (
              <>
                <div className="w-1 h-4 bg-cyan-400 rounded-sm"></div>
                <div className="w-1 h-4 bg-cyan-400 rounded-sm"></div>
              </>
            ) : (
              <div className="w-1.5 h-4 bg-cyan-400 rounded-sm"></div>
            )}
          </div>
        ) : subcategory === 'SUBOFICIAL' ? (
          <div className="flex flex-col items-center justify-center -space-y-1">
            {isHighNco ? (
              <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 10L12 3L20 10" />
                <path d="M4 15L12 8L20 15" />
                <path d="M4 20L12 13L20 20" />
              </svg>
            ) : isMidNco ? (
              <svg className="w-6 h-5 text-emerald-400" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 13L12 5L20 13" />
                <path d="M4 18L12 10L20 18" />
              </svg>
            ) : (
              <svg className="w-6 h-4 text-emerald-400" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 14L12 6L20 14" />
              </svg>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
        )}
      </div>

      {/* Rank text */}
      <span className="font-mono font-extrabold text-sm sm:text-base tracking-wider text-white mt-0.5">
        {r}
      </span>
      <span className="text-[8px] font-mono tracking-tighter opacity-80 uppercase truncate max-w-[70px]">
        {subcategory}
      </span>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Branch Emblem Icon Component
// ---------------------------------------------------------------------------

function BranchIcon({ branch }: { branch?: string }) {
  const info = getBranchInfo(branch);

  const renderIcon = () => {
    switch (info.name) {
      case 'INFANTERIA':
        return <Crosshair className="w-4 h-4 text-red-400" />;
      case 'CABALLERIA':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'ARTILLERIA':
        return <Flame className="w-4 h-4 text-rose-400" />;
      case 'INGENIEROS':
        return <Building className="w-4 h-4 text-purple-400" />;
      case 'COMUNICACIONES':
        return <Radio className="w-4 h-4 text-orange-400" />;
      case 'INTELIGENCIA':
        return <Compass className="w-4 h-4 text-sky-400" />;
      case 'LOGISTICA':
        return <Wrench className="w-4 h-4 text-slate-300" />;
      case 'SANIDAD':
        return <Stethoscope className="w-4 h-4 text-emerald-400" />;
      case 'AVIACION':
        return <Plane className="w-4 h-4 text-cyan-400" />;
      default:
        return <Shield className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className={`p-2 rounded-lg border ${info.iconBg} ${info.iconBorder} flex items-center justify-center flex-shrink-0 shadow-sm`} title={info.displayName}>
      {renderIcon()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main FichaDigital Component
// ---------------------------------------------------------------------------

export default function FichaDigital({ dossier, onRegisterNovedad }: FichaDigitalProps) {
  const soldier = dossier?.soldier;
  const history = useMemo(() => dossier?.history || [], [dossier?.history]);
  const unitHistory = useMemo(() => dossier?.unitHistory || [], [dossier?.unitHistory]);

  // Active Internal Dossier Tab
  const [activeDossierTab, setActiveDossierTab] = useState<'ORGANICO' | 'CURSOS' | 'NOVEDADES'>('ORGANICO');

  // Timeline Filter Category
  const [timelineCategory, setTimelineCategory] = useState<'TODAS' | 'OPERACIONALES' | 'MEDICAS' | 'DISCIPLINARIAS' | 'ADMINISTRATIVAS'>('TODAS');

  // Tenure in current unit calculation
  const tenureMonths = useMemo(() => {
    if (!soldier) return 0;
    if (typeof soldier.timeInPosition === 'number') {
      return soldier.timeInPosition;
    }
    const rawDate = soldier.assignmentDate || soldier.joinDate;
    if (!rawDate) return 0;
    const dateObj = new Date(rawDate);
    if (isNaN(dateObj.getTime())) return 0;
    const today = new Date();
    return Math.max(0, (today.getFullYear() - dateObj.getFullYear()) * 12 + today.getMonth() - dateObj.getMonth());
  }, [soldier]);

  // Total service years & months formatted
  const totalServiceFormatted = useMemo(() => {
    if (!soldier) return '0 meses';
    const rawDate = soldier.joinDate || soldier.assignmentDate;
    if (!rawDate) {
      // Derive based on tenure or rank seniority
      const months = tenureMonths > 0 ? tenureMonths : 12;
      const yrs = Math.floor(months / 12);
      const m = months % 12;
      return yrs > 0 ? `${yrs}a ${m}m` : `${m} meses`;
    }
    const dateObj = new Date(rawDate);
    if (isNaN(dateObj.getTime())) return `${tenureMonths} meses`;
    const today = new Date();
    const diffMonths = Math.max(0, (today.getFullYear() - dateObj.getFullYear()) * 12 + today.getMonth() - dateObj.getMonth());
    const yrs = Math.floor(diffMonths / 12);
    const m = diffMonths % 12;
    return yrs > 0 ? `${yrs} Años, ${m} Meses` : `${m} Meses`;
  }, [soldier, tenureMonths]);

  // Parse combat courses
  const parsedCourses = useMemo(() => {
    if (!soldier || !soldier.cursosCombate || soldier.cursosCombate.trim() === '' || soldier.cursosCombate.toUpperCase() === 'NINGUNO') {
      return [];
    }
    return soldier.cursosCombate
      .split(',')
      .map(c => c.trim())
      .filter(Boolean)
      .map(matchCombatCourse);
  }, [soldier]);

  // Filtered timeline events
  const filteredHistory = useMemo(() => {
    if (!history || history.length === 0) return [];
    if (timelineCategory === 'TODAS') return history;

    return history.filter(nov => {
      const t = (nov.tipo || '').toUpperCase();
      const desc = (nov.descripcion || '').toUpperCase();

      if (timelineCategory === 'OPERACIONALES') {
        return t.includes('ALTA') || t.includes('BAJA') || t.includes('TRASLADO') || t.includes('COMISION') || t.includes('ASCENSO') || desc.includes('OPERACIONAL') || desc.includes('DESTINO');
      }
      if (timelineCategory === 'MEDICAS') {
        return t.includes('MEDIC') || t.includes('EXCUSA') || t.includes('LICENCIA_MED') || t.includes('INCAPACIDAD') || t.includes('SANIDAD') || desc.includes('HOSPITAL') || desc.includes('TRATAMIENTO');
      }
      if (timelineCategory === 'DISCIPLINARIAS') {
        return t.includes('SANCION') || t.includes('DISCIPLIN') || t.includes('FELICITA') || t.includes('CONDECORA') || t.includes('LLAMADO') || desc.includes('INVESTIGACION');
      }
      if (timelineCategory === 'ADMINISTRATIVAS') {
        return t.includes('PERMISO') || t.includes('VACACION') || t.includes('ADMIN') || t.includes('CURSO') || (!t.includes('MEDIC') && !t.includes('SANCION') && !t.includes('ALTA') && !t.includes('TRASLADO'));
      }
      return true;
    });
  }, [history, timelineCategory]);

  if (!dossier || !soldier) return null;

  const branchInfo = getBranchInfo(soldier.branch);
  const healthRaw = (soldier.healthStatus || 'APTO').toUpperCase();
  const isApto = healthRaw === 'APTO';
  const isNoApto = healthRaw.includes('NO APTO') || healthRaw.includes('BAJA');
  const isExcusado = healthRaw.includes('EXCUSA');
  const isLicencia = healthRaw.includes('LICENCIA');

  const requiresRotationAlert = tenureMonths > 24;

  return (
    <div className="bg-slate-900/95 border border-slate-700/60 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md transition-all duration-200 flex flex-col h-full">

      {/* ------------------------------------------------------------------ */}
      {/* 1. High-Density Mil-Spec Tactical Header                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 border-b border-slate-700/60">
        
        <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between">
          
          {/* Rank Insignia & Identification */}
          <div className="flex items-center gap-4">
            
            {/* Heraldic Rank Insignia */}
            <RankInsignia rank={soldier.rank} />

            {/* Soldier Names & Military Meta */}
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                  {soldier.rank}
                </span>

                <span className="text-xs font-mono text-slate-400">
                  CÉDULA / ID: <span className="text-white font-bold">{soldier.cedula || soldier.id}</span>
                </span>

                {soldier.unitId && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-cyan-400" />
                    {soldier.unitId}
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-wide text-white">
                <span className="text-cyan-400 mr-2">{soldier.rank}</span>
                {soldier.name}
              </h2>

              {/* Branch, MOS & Specialty with Heraldic Badge */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <div className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold border flex items-center gap-1.5 ${branchInfo.badgeBg} ${branchInfo.badgeBorder} ${branchInfo.badgeText}`}>
                  <BranchIcon branch={soldier.branch} />
                  <span>{branchInfo.displayName}</span>
                  <span className="text-slate-500">•</span>
                  <span className="italic text-[11px] opacity-80">"{branchInfo.motto}"</span>
                </div>

                <div className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-slate-950/80 border border-slate-700 text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-3 h-3 text-cyan-400" />
                  <span>MOS: <strong className="text-cyan-300">{soldier.mosCode || '11B'}</strong></span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Badges & Operational Export Action */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 items-start lg:items-end w-full lg:w-auto">
            
            {/* Status & Psychophysical Fitness Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              
              {/* Fitness Badge */}
              {isApto && (
                <span className="px-3 py-1 rounded-md text-xs font-bold font-mono tracking-wider uppercase border flex items-center gap-1.5 bg-emerald-950/60 border-emerald-500/50 text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  APTO (Cat. A)
                </span>
              )}
              {isNoApto && (
                <span className="px-3 py-1 rounded-md text-xs font-bold font-mono tracking-wider uppercase border flex items-center gap-1.5 bg-rose-950/60 border-rose-500/50 text-rose-300">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  NO APTO (Cat. C)
                </span>
              )}
              {isExcusado && (
                <span className="px-3 py-1 rounded-md text-xs font-bold font-mono tracking-wider uppercase border flex items-center gap-1.5 bg-amber-950/60 border-amber-500/50 text-amber-300">
                  <Stethoscope className="w-3.5 h-3.5 text-amber-400" />
                  EXCUSADO PARCIAL
                </span>
              )}
              {isLicencia && (
                <span className="px-3 py-1 rounded-md text-xs font-bold font-mono tracking-wider uppercase border flex items-center gap-1.5 bg-blue-950/60 border-blue-500/50 text-blue-300">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  EN LICENCIA
                </span>
              )}

              {/* Deployment Status */}
              <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold tracking-wider uppercase border ${
                isApto
                  ? 'bg-cyan-950/50 border-cyan-500/40 text-cyan-300'
                  : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
              }`}>
                {isApto ? 'Despliegue Inmediato' : 'Restricción Médica'}
              </span>
            </div>

            {/* Longevity & Critical Rotation Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              
              {/* Alert Badge if >24 months in unit */}
              {requiresRotationAlert ? (
                <div className="px-3 py-1 rounded-md text-xs font-mono font-bold tracking-wider uppercase bg-amber-950/80 border border-amber-500 text-amber-300 flex items-center gap-1.5 shadow-md shadow-amber-950/40 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Rotación Requerida (&gt;24m)</span>
                </div>
              ) : (
                <div className="px-2.5 py-1 rounded-md text-xs font-mono bg-slate-950/70 border border-slate-700 text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>En Unidad: <strong className="text-cyan-300">{tenureMonths} meses</strong></span>
                </div>
              )}

              {/* Total Service */}
              <div className="px-2.5 py-1 rounded-md text-xs font-mono bg-slate-950/70 border border-slate-700 text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Servicio: <strong className="text-emerald-300">{totalServiceFormatted}</strong></span>
              </div>

            </div>

            {/* Export Official PDF Document */}
            <button
              onClick={() => generateDossierPdf(dossier)}
              className="mt-1 px-4 py-2 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/50 text-xs font-mono font-semibold flex items-center gap-2 transition-all shadow-md shadow-cyan-950/50 active:scale-95"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Exportar Expediente Digital (PDF)</span>
            </button>

          </div>

        </div>

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Top Navigation Tabs: 3 Internal Dossier Sections               */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800 bg-slate-950/40 overflow-x-auto">
        <button
          onClick={() => setActiveDossierTab('ORGANICO')}
          className={`pb-3 px-4 text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-2 border-b-2 transition-colors ${
            activeDossierTab === 'ORGANICO'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>1. Perfil Orgánico</span>
        </button>

        <button
          onClick={() => setActiveDossierTab('CURSOS')}
          className={`pb-3 px-4 text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-2 border-b-2 transition-colors ${
            activeDossierTab === 'CURSOS'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>2. Cursos de Combate ({parsedCourses.length})</span>
        </button>

        <button
          onClick={() => setActiveDossierTab('NOVEDADES')}
          className={`pb-3 px-4 text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-2 border-b-2 transition-colors ${
            activeDossierTab === 'NOVEDADES'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>3. Línea de Tiempo de Novedades ({history.length})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Tab Canvas Content                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-5 sm:p-6 overflow-y-auto flex-1">

        {/* ============================================================== */}
        {/* TAB 1: PERFIL ORGÁNICO & ASIGNACIONES                          */}
        {/* ============================================================== */}
        {activeDossierTab === 'ORGANICO' && (
          <div className="space-y-6">

            {/* Grid de Datos Biográficos & Militares */}
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                Matriz de Asignación Orgánica y Escalafón
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Cédula de Ciudadanía</span>
                  <span className="text-sm font-bold font-mono text-white">{soldier.cedula || soldier.id}</span>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">ID Militar del Sistema</span>
                  <span className="text-sm font-bold font-mono text-cyan-300">{soldier.id}</span>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Unidad Orgánica Física</span>
                  <span className="text-sm font-bold font-mono text-amber-300">{soldier.unitId || 'SIN ASIGNAR'}</span>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Especialidad Militar (MOS)</span>
                  <span className="text-sm font-bold font-mono text-cyan-300">{soldier.mosCode || '11A'} - {branchInfo.displayName}</span>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Arma Doctrinal</span>
                  <span className="text-sm font-bold font-mono text-white">{branchInfo.displayName}</span>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Compañía / Pelotón</span>
                  <span className="text-sm font-bold font-mono text-slate-200">
                    {soldier.company || 'Compañía A'} / {soldier.platoon || 'Pelotón 1'}
                  </span>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Cargo Orgánico TOE</span>
                  <span className="text-sm font-bold font-mono text-slate-200">{soldier.role || 'Comandante de Pelotón'}</span>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Estado de Servicio</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">{soldier.status || 'ACTIVO'}</span>
                </div>

              </div>
            </div>

            {/* Historial Cronológico de Unidades Previas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Circuito Cronológico de Destinos Militares
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {unitHistory.length} Asignaciones Previas
                </span>
              </div>

              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-5">
                {unitHistory.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Building className="w-10 h-10 mx-auto opacity-20 mb-2 text-cyan-400" />
                    <p className="text-xs font-mono">Primera asignación registrada en hoja de vida física.</p>
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700/60">
                    {unitHistory.map((unitName, index) => {
                      const isCurrent = index === unitHistory.length - 1;
                      return (
                        <div key={index} className="relative flex items-start gap-4">
                          {/* Dot indicator */}
                          <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 ${
                            isCurrent
                              ? 'bg-cyan-400 border-cyan-300 ring-4 ring-cyan-950'
                              : 'bg-slate-800 border-slate-500'
                          }`} />

                          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 w-full flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                                  DESTINO #{index + 1}
                                </span>
                                {isCurrent && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                                    UNIDAD ACTUAL
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-bold text-white font-mono mt-1">
                                {unitName}
                              </h4>
                            </div>

                            <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Permanencia Cumplida</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: CURSOS DE COMBATE Y CALIFICACIONES MILITARES            */}
        {/* ============================================================== */}
        {activeDossierTab === 'CURSOS' && (
          <div className="space-y-6">

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Calificaciones Tácticas y Cursos Militares de Combate
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Distintivos de excelencia operacional reconocidos por el Ejército Nacional de Colombia.
                </p>
              </div>

              <span className="px-3 py-1 rounded-md text-xs font-mono font-bold bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                {parsedCourses.length} Registros Oficiales
              </span>
            </div>

            {parsedCourses.length === 0 ? (
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                <Award className="w-12 h-12 mx-auto opacity-20 mb-2 text-cyan-400" />
                <p className="text-sm font-mono font-semibold text-slate-300">Sin cursos de combate registrados</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Este efectivo no registra cursos especiales de lancero, paracaidista o fuerzas especiales en su ficha individual.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parsedCourses.map((curso, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border ${curso.badgeBg} ${curso.badgeBorder} shadow-lg backdrop-blur-sm relative overflow-hidden flex flex-col justify-between`}
                  >
                    {/* Top row */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-700/80 text-cyan-400">
                            {curso.iconType === 'flame' && <Flame className="w-5 h-5 text-amber-400" />}
                            {curso.iconType === 'wings' && <Zap className="w-5 h-5 text-sky-400" />}
                            {curso.iconType === 'dagger' && <Crosshair className="w-5 h-5 text-purple-400" />}
                            {curso.iconType === 'shield' && <Shield className="w-5 h-5 text-emerald-400" />}
                            {curso.iconType === 'compass' && <Compass className="w-5 h-5 text-amber-400" />}
                            {curso.iconType === 'target' && <Crosshair className="w-5 h-5 text-red-400" />}
                            {curso.iconType === 'crosshair' && <Crosshair className="w-5 h-5 text-emerald-400" />}
                          </div>

                          <div>
                            <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-slate-400 block">
                              DISTINTIVO OPERACIONAL #{idx + 1}
                            </span>
                            <h4 className="text-base font-bold text-white font-mono">
                              {curso.name}
                            </h4>
                          </div>
                        </div>

                        {/* Status Chip */}
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                          VIGENTE
                        </span>
                      </div>

                      {/* Official Military Motto */}
                      <div className="bg-slate-950/60 rounded-lg p-2.5 my-2 border border-slate-800/80">
                        <span className="text-[11px] italic font-serif text-amber-300 block">
                          "{curso.motto}"
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-300 font-sans leading-relaxed">
                        {curso.description}
                      </p>
                    </div>

                    {/* Footer with verification metadata */}
                    <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Certificación: JEFATURA DE INSTRUCCIÓN</span>
                      <span className="text-cyan-400 font-semibold">SIGEP-VERIFIED</span>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: LÍNEA DE TIEMPO INTERACTIVA DE NOVEDADES                */}
        {/* ============================================================== */}
        {activeDossierTab === 'NOVEDADES' && (
          <div className="space-y-6">

            {/* Filter Bar by Category */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-mono text-slate-400 mr-2 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-cyan-400" />
                  Filtro:
                </span>

                {(['TODAS', 'OPERACIONALES', 'MEDICAS', 'DISCIPLINARIAS', 'ADMINISTRATIVAS'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setTimelineCategory(cat)}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all ${
                      timelineCategory === cat
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {onRegisterNovedad && (
                <button
                  onClick={() => onRegisterNovedad(soldier)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/50 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Registrar Novedad
                </button>
              )}

            </div>

            {/* Timeline Stream */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-5 sm:p-6">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Activity className="w-12 h-12 mx-auto opacity-20 mb-2 text-cyan-400" />
                  <p className="text-sm font-mono font-semibold text-slate-300">Sin novedades en esta categoría</p>
                  <p className="text-xs text-slate-500 mt-1">
                    No se han registrado eventos para la categoría '{timelineCategory}'.
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700/60">
                  {filteredHistory.map((nov, index) => {
                    const tipoUpper = (nov.tipo || '').toUpperCase();
                    const isMedical = tipoUpper.includes('MEDIC') || tipoUpper.includes('EXCUSA');
                    const isOperational = tipoUpper.includes('ALTA') || tipoUpper.includes('TRASLADO') || tipoUpper.includes('BAJA');
                    const isDisciplinary = tipoUpper.includes('SANCION') || tipoUpper.includes('FELICITA');

                    return (
                      <div key={index} className="relative flex items-start gap-4">
                        
                        {/* Status Node */}
                        <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 ${
                          isMedical
                            ? 'bg-amber-400 border-amber-300 ring-4 ring-amber-950'
                            : isOperational
                            ? 'bg-cyan-400 border-cyan-300 ring-4 ring-cyan-950'
                            : isDisciplinary
                            ? 'bg-rose-400 border-rose-300 ring-4 ring-rose-950'
                            : 'bg-emerald-400 border-emerald-300 ring-4 ring-emerald-950'
                        }`} />

                        {/* Event Card */}
                        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 w-full transition-all shadow-md">
                          
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold tracking-wider uppercase border ${
                                isMedical
                                  ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                                  : isOperational
                                  ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                                  : isDisciplinary
                                  ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                                  : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                              }`}>
                                {nov.tipo}
                              </span>

                              <span className="text-xs font-mono font-semibold text-slate-400">
                                {nov.fecha ? new Date(nov.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Sin fecha'}
                              </span>
                            </div>

                            {nov.reportadoPor && (
                              <span className="text-[11px] font-mono text-slate-400">
                                Registrado por: <strong className="text-slate-200">{nov.reportadoPor}</strong>
                              </span>
                            )}
                          </div>

                          <p className="text-xs sm:text-sm text-slate-200 font-sans leading-relaxed">
                            {nov.descripcion}
                          </p>

                          {nov.resolucion && (
                            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                              <span>Resolución Oficial:</span>
                              <span className="text-cyan-300 font-bold">{nov.resolucion}</span>
                            </div>
                          )}

                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
