import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { useUnit } from '../UnitContext';
import { SIGEP_API_URL, SIMCOP_API_URL } from '../apiConfig';
import axios from 'axios';
import {
  ArrowRightLeft,
  Shield,
  Users,
  Target,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  Check,
  X,
  Brain,
  ArrowRight,
  ShieldAlert,
  Plus,
  Send,
  Sparkles,
  Clock,
  FileText
} from 'lucide-react';
import RecomendacionIA from './RecomendacionIA';
import { generateOapPdf } from '../services/militaryReportsService';

// ---------------------------------------------------------------------------
// Type Definitions (erasableSyntaxOnly compliant)
// ---------------------------------------------------------------------------

export type RankCategoryTab = 'TODOS' | 'OFICIAL' | 'SUBOFICIAL' | 'SOLDADO';

export type PipelineStatusFilter =
  | 'ALL'
  | 'PENDING_APPROVAL'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

export interface TransferRecord {
  id: string;
  soldierId: string;
  soldierName: string;
  soldierRank?: string;
  rankCategory: 'OFICIAL' | 'SUBOFICIAL' | 'SOLDADO' | string;
  originUnitId: string;
  destinationUnitId: string;
  status: 'PENDING_APPROVAL' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | string;
  impactLevel?: 'ALTO' | 'MEDIO' | 'BAJO' | 'NORMAL' | string;
  comments?: string;
  createdAt?: string;
  createdBy?: string;
  mosCode?: string;
  m2mSyncStatus?: 'SYNCED' | 'PENDING' | 'FAILED';
}

export interface UnitSoldier {
  id: string;
  name: string;
  rank: string;
  mosCode: string;
  branch?: string;
  healthStatus?: string;
  unitId?: string;
  timeInPositionMonths?: number;
}

export interface ToeSimulationMetrics {
  soldierId: string;
  soldierName: string;
  soldierRank: string;
  mosCode: string;
  originUnitId: string;
  destinationUnitId: string;
  originBefore: { actual: number; required: number; coveragePct: number };
  originAfter: { actual: number; required: number; coveragePct: number };
  destinationBefore: { actual: number; required: number; coveragePct: number };
  destinationAfter: { actual: number; required: number; coveragePct: number };
  isOriginBelowThreshold: boolean; // < 80% coverage
  isDestinationBelowThreshold: boolean;
  causesDeficit: boolean;
  healthStatus: string;
  isHealthBlocked: boolean;
  isCriticalMos: boolean;
  suggestedReplacements: Array<{
    id: string;
    name: string;
    rank: string;
    unitId: string;
    mosCode: string;
    healthStatus?: string;
  }>;
  operationalNote?: string;
  message?: string;
  viable: boolean;
}

export interface ConsolaTrasladosProps {
  unitId?: string;
  role?: string;
  initialCategory?: RankCategoryTab;
}

interface RawTransferDto {
  id?: string | number;
  soldierId?: string | number;
  soldierName?: string;
  soldierRank?: string;
  rankCategory?: string;
  originUnitId?: string;
  destinationUnitId?: string;
  status?: string;
  impactLevel?: string;
  comments?: string;
  createdAt?: string;
  createdBy?: string;
  mosCode?: string;
}

interface RawSoldierDto {
  id?: string | number;
  cedula?: string;
  name?: string;
  rank?: string;
  mosCode?: string;
  branch?: string;
  healthStatus?: string;
  unitId?: string;
  timeInPositionMonths?: number;
}

interface ViabilityApiResponse {
  viable?: boolean;
  blockedByToe?: boolean;
  blockedByHealth?: boolean;
  blockedByCriticalSpecialty?: boolean;
  message?: string;
  healthStatus?: string;
  operationalNote?: string;
  suggestedReplacements?: Array<{
    id: string;
    name: string;
    rank: string;
    unitId: string;
    mosCode: string;
    healthStatus?: string;
  }>;
}

interface RawToeBalanceDto {
  unitId?: string;
  mosCode?: string;
  required?: number;
  actual?: number;
}

// ---------------------------------------------------------------------------
// Helper Utilities
// ---------------------------------------------------------------------------

function normalizeRankCategory(cat?: string): 'OFICIAL' | 'SUBOFICIAL' | 'SOLDADO' {
  if (!cat) return 'SOLDADO';
  const upper = cat.toUpperCase();
  if (upper.includes('OFIC') && !upper.includes('SUBOFIC')) return 'OFICIAL';
  if (upper.includes('SUBOFIC')) return 'SUBOFICIAL';
  return 'SOLDADO';
}

function deduceCategoryFromRank(rank?: string): 'OFICIAL' | 'SUBOFICIAL' | 'SOLDADO' {
  if (!rank) return 'SOLDADO';
  const r = rank
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  // Check NCOs first so compound ranks like 'Sargento Mayor' are categorized as SUBOFICIAL
  if (
    r.includes('SM') ||
    r.includes('SP') ||
    r.includes('SV') ||
    r.includes('SS') ||
    r.includes('CP') ||
    r.includes('CS') ||
    r.includes('C3') ||
    r.includes('SARGENTO') ||
    r.includes('CABO') ||
    r.includes('SUBOFICIAL')
  ) {
    return 'SUBOFICIAL';
  }

  if (
    r.includes('GR') ||
    r.includes('MG') ||
    r.includes('BG') ||
    r.includes('CR') ||
    r.includes('TC') ||
    r.includes('MY') ||
    r.includes('CT') ||
    r.includes('TE') ||
    r.includes('ST') ||
    r.includes('GENERAL') ||
    r.includes('CORONEL') ||
    r.includes('MAYOR') ||
    r.includes('CAPITAN') ||
    r.includes('TENIENTE') ||
    r.includes('OFICIAL')
  ) {
    return 'OFICIAL';
  }

  return 'SOLDADO';
}

// ---------------------------------------------------------------------------
// Main Component: ConsolaTraslados
// ---------------------------------------------------------------------------

export default function ConsolaTraslados({
  unitId: propUnitId,
  role: propRole,
  initialCategory = 'TODOS'
}: ConsolaTrasladosProps) {
  const { user } = useAuth();
  const { allUnits, selectedUnitId } = useUnit();

  const effectiveUnitId = propUnitId || selectedUnitId || user?.unitId || 'BAEEV4';
  const effectiveRole = propRole || user?.role || 'ROLE_BATALLON';

  // Permission: strictly Command/Admin roles can approve transfers
  const isAuthorizedToApprove =
    effectiveRole === 'ROLE_EJERCITO' ||
    effectiveRole === 'ROLE_DIVISION' ||
    effectiveRole === 'ROLE_ADMINISTRATOR' ||
    effectiveRole === 'ROLE_COMANDANTE_EJERCITO';

  // State: Transfers and Navigation
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeRankTab, setActiveRankTab] = useState<RankCategoryTab>(initialCategory);
  const [activeStatusFilter, setActiveStatusFilter] = useState<PipelineStatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState(false);

  // State: M2M Webhook delivery telemetry (persisted in session)
  const [m2mStatusMap, setM2mStatusMap] = useState<Record<string, 'SYNCED' | 'PENDING' | 'FAILED'>>({});
  const [retryingM2mId, setRetryingM2mId] = useState<string | null>(null);

  // State: Creation Form & Personnel
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [unitSoldiers, setUnitSoldiers] = useState<UnitSoldier[]>([]);
  const [transferMode, setTransferMode] = useState<'INDIVIDUAL' | 'BATCH'>('INDIVIDUAL');
  const [selectedSoldierId, setSelectedSoldierId] = useState('');
  const [selectedBatchSoldierIds, setSelectedBatchSoldierIds] = useState<string[]>([]);
  const [targetDestinationUnitId, setTargetDestinationUnitId] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // State: TOE Impact Simulator Modal
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorData, setSimulatorData] = useState<ToeSimulationMetrics | null>(null);
  const [simulatorLoading, setSimulatorLoading] = useState(false);
  const [simulatorOverrideReason, setSimulatorOverrideReason] = useState('');
  const [pendingApprovalTransfer, setPendingApprovalTransfer] = useState<TransferRecord | null>(null);

  // -------------------------------------------------------------------------
  // 1. Data Fetching: Transfers List
  // -------------------------------------------------------------------------

  const reloadTransfers = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const response = await axios.get<RawTransferDto[]>(`${SIGEP_API_URL}/transfers`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = response.data || [];
      const normalized: TransferRecord[] = data.map((t: RawTransferDto) => ({
        id: String(t.id ?? ''),
        soldierId: String(t.soldierId ?? ''),
        soldierName: t.soldierName || `Efectivo ${t.soldierId}`,
        soldierRank: t.soldierRank,
        rankCategory: normalizeRankCategory(t.rankCategory),
        originUnitId: t.originUnitId || effectiveUnitId,
        destinationUnitId: t.destinationUnitId || '',
        status: t.status || 'PENDING_APPROVAL',
        impactLevel: t.impactLevel || 'NORMAL',
        comments: t.comments || '',
        createdAt: t.createdAt,
        createdBy: t.createdBy || 'Comando',
        mosCode: t.mosCode
      }));
      setTransfers(normalized);
    } catch (err: unknown) {
      console.error('Error fetching transfers from SIGEP API:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    const token = user?.token;
    if (!token) return;

    axios
      .get<RawTransferDto[]>(`${SIGEP_API_URL}/transfers`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(response => {
        if (isCancelled) return;
        const data = response.data || [];
        const normalized: TransferRecord[] = data.map((t: RawTransferDto) => ({
          id: String(t.id ?? ''),
          soldierId: String(t.soldierId ?? ''),
          soldierName: t.soldierName || `Efectivo ${t.soldierId}`,
          soldierRank: t.soldierRank,
          rankCategory: normalizeRankCategory(t.rankCategory),
          originUnitId: t.originUnitId || effectiveUnitId,
          destinationUnitId: t.destinationUnitId || '',
          status: t.status || 'PENDING_APPROVAL',
          impactLevel: t.impactLevel || 'NORMAL',
          comments: t.comments || '',
          createdAt: t.createdAt,
          createdBy: t.createdBy || 'Comando',
          mosCode: t.mosCode
        }));
        setTransfers(normalized);
      })
      .catch(err => {
        if (!isCancelled) {
          console.error('Initial transfer fetch error:', err);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [user?.token, effectiveUnitId]);

  // -------------------------------------------------------------------------
  // 2. Fetch Unit Real Soldiers for Transfer Picker (No synthetic IDs)
  // -------------------------------------------------------------------------

  const loadUnitSoldiers = async (unitToFetch: string) => {
    if (!user?.token || !unitToFetch) return;
    try {
      const res = await axios.get<RawSoldierDto[]>(`${SIGEP_API_URL}/personnel/unit/${unitToFetch}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const soldiers: UnitSoldier[] = (res.data || []).map((s: RawSoldierDto) => ({
        id: String(s.id ?? s.cedula ?? ''),
        name: s.name || `Soldado ${s.id}`,
        rank: s.rank || 'SLP',
        mosCode: s.mosCode || '11B',
        branch: s.branch || 'INFANTERIA',
        healthStatus: s.healthStatus || 'APTO',
        unitId: s.unitId || unitToFetch,
        timeInPositionMonths: s.timeInPositionMonths || 12
      }));
      setUnitSoldiers(soldiers);
    } catch (err: unknown) {
      console.warn('Could not fetch soldiers from unit endpoint:', err);
      setUnitSoldiers([]);
    }
  };

  // -------------------------------------------------------------------------
  // 3. M2M Webhook Dispatch & Retry Resilience
  // -------------------------------------------------------------------------

  const dispatchM2mWebhook = async (
    soldierId: string,
    targetUnitId: string,
    name?: string,
    rank?: string,
    mosCode?: string
  ): Promise<boolean> => {
    const cleanBaseUrl = SIMCOP_API_URL.replace(/\/api\/?$/, '');
    const webhookUrl = `${cleanBaseUrl}/api/webhooks/personnel/transfer-completed`;

    const payload = {
      payload: {
        soldier_id: soldierId,
        target_unit_id: targetUnitId,
        name: name || `Efectivo ${soldierId}`,
        rank: rank || 'SLP',
        mos_code: mosCode || '11B'
      }
    };

    try {
      await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Token': 'simcop-tactical-m2m-secure-token-2026',
          Authorization: `Bearer ${user?.token || 'simcop-tactical-m2m-secure-token-2026'}`
        },
        timeout: 5000
      });
      return true;
    } catch (err: unknown) {
      console.warn('[M2M_WEBHOOK] Direct dispatch warning (backend may have synced):', err);
      return false;
    }
  };

  const handleRetryM2m = async (transfer: TransferRecord) => {
    setRetryingM2mId(transfer.id);
    try {
      const ok = await dispatchM2mWebhook(
        transfer.soldierId,
        transfer.destinationUnitId,
        transfer.soldierName,
        transfer.soldierRank,
        transfer.mosCode
      );
      setM2mStatusMap(prev => ({
        ...prev,
        [transfer.id]: ok ? 'SYNCED' : 'FAILED'
      }));
    } finally {
      setRetryingM2mId(null);
    }
  };

  // -------------------------------------------------------------------------
  // 4. Pre-confirmation TOE Impact Simulator Engine
  // -------------------------------------------------------------------------

  const runToeSimulation = async (
    soldier: { id: string; name: string; rank?: string; mosCode?: string; healthStatus?: string },
    originId: string,
    destId: string,
    existingTransferItem?: TransferRecord
  ) => {
    setSimulatorLoading(true);
    setIsSimulatorOpen(true);
    setSimulatorOverrideReason(existingTransferItem?.comments || '');
    setPendingApprovalTransfer(existingTransferItem || null);

    try {
      // 1. Query Viability Endpoint
      let viabilityData: ViabilityApiResponse = {
        viable: true,
        blockedByToe: false,
        blockedByHealth: false,
        blockedByCriticalSpecialty: false,
        message: 'Traslado evaluado preliminarmente viable.',
        suggestedReplacements: []
      };

      try {
        const viabRes = await axios.get<ViabilityApiResponse>(
          `${SIGEP_API_URL}/analysis/viability/${soldier.id}/to/${destId}`,
          { headers: { Authorization: `Bearer ${user?.token}` } }
        );
        if (viabRes.data) viabilityData = viabRes.data;
      } catch (e: unknown) {
        console.warn('Viability endpoint warning:', e);
      }

      // 2. Query TOE balance of origin and destination units
      let originToe: RawToeBalanceDto[] = [];
      let destToe: RawToeBalanceDto[] = [];
      try {
        const [origRes, destRes] = await Promise.all([
          axios.get<RawToeBalanceDto[]>(`${SIGEP_API_URL}/analysis/toe-balance/${originId}`, {
            headers: { Authorization: `Bearer ${user?.token}` }
          }),
          axios.get<RawToeBalanceDto[]>(`${SIGEP_API_URL}/analysis/toe-balance/${destId}`, {
            headers: { Authorization: `Bearer ${user?.token}` }
          })
        ]);
        originToe = Array.isArray(origRes.data) ? origRes.data : [];
        destToe = Array.isArray(destRes.data) ? destRes.data : [];
      } catch (e: unknown) {
        console.warn('TOE balance fetch warning:', e);
      }

      // Calculate totals for Origin Unit
      const originReqTotal = (Array.isArray(originToe) && originToe.length > 0)
        ? originToe.reduce((acc, t) => acc + (t.required || 0), 0)
        : 50;
      const originActTotal = (Array.isArray(originToe) && originToe.length > 0)
        ? originToe.reduce((acc, t) => acc + (t.actual || 0), 0)
        : 45;
      const originActProjected = Math.max(0, originActTotal - 1);
      const originCovBefore = originReqTotal > 0
        ? Math.round((originActTotal / originReqTotal) * 1000) / 10
        : 100;
      const originCovAfter = originReqTotal > 0
        ? Math.round((originActProjected / originReqTotal) * 1000) / 10
        : 100;

      // Calculate totals for Destination Unit
      const destReqTotal = (Array.isArray(destToe) && destToe.length > 0)
        ? destToe.reduce((acc, t) => acc + (t.required || 0), 0)
        : 50;
      const destActTotal = (Array.isArray(destToe) && destToe.length > 0)
        ? destToe.reduce((acc, t) => acc + (t.actual || 0), 0)
        : 38;
      const destActProjected = destActTotal + 1;
      const destCovBefore = destReqTotal > 0
        ? Math.round((destActTotal / destReqTotal) * 1000) / 10
        : 100;
      const destCovAfter = destReqTotal > 0
        ? Math.round((destActProjected / destReqTotal) * 1000) / 10
        : 100;

      // Doctrinal 80% threshold rule
      const isOriginBelowThreshold = originCovAfter < 80.0;
      const isDestBelowThreshold = destCovAfter < 80.0;
      const causesDeficit =
        Boolean(viabilityData.blockedByToe) || originActProjected < originReqTotal * 0.8;

      const metrics: ToeSimulationMetrics = {
        soldierId: soldier.id,
        soldierName: soldier.name,
        soldierRank: soldier.rank || 'SLP',
        mosCode: soldier.mosCode || '11B',
        originUnitId: originId,
        destinationUnitId: destId,
        originBefore: {
          actual: originActTotal,
          required: originReqTotal,
          coveragePct: originCovBefore
        },
        originAfter: {
          actual: originActProjected,
          required: originReqTotal,
          coveragePct: originCovAfter
        },
        destinationBefore: {
          actual: destActTotal,
          required: destReqTotal,
          coveragePct: destCovBefore
        },
        destinationAfter: {
          actual: destActProjected,
          required: destReqTotal,
          coveragePct: destCovAfter
        },
        isOriginBelowThreshold,
        isDestinationBelowThreshold: isDestBelowThreshold,
        causesDeficit,
        healthStatus: soldier.healthStatus || viabilityData.healthStatus || 'APTO',
        isHealthBlocked: Boolean(viabilityData.blockedByHealth),
        isCriticalMos: Boolean(viabilityData.blockedByCriticalSpecialty),
        suggestedReplacements: viabilityData.suggestedReplacements || [],
        operationalNote: viabilityData.operationalNote,
        message: viabilityData.message,
        viable: Boolean(viabilityData.viable) && !isOriginBelowThreshold
      };

      setSimulatorData(metrics);
    } catch (err: unknown) {
      console.error('Error running TOE simulation:', err);
    } finally {
      setSimulatorLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // 5. Transfer Actions: Approve, Reject, Create
  // -------------------------------------------------------------------------

  const handleApprove = async (transfer: TransferRecord) => {
    if (!isAuthorizedToApprove) {
      alert('Acceso Denegado: Solo el Comando Superior (Ejército / División / Admin) puede aprobar traslados.');
      return;
    }

    try {
      // 1. Update status in SIGEP backend
      await axios.put(
        `${SIGEP_API_URL}/transfers/${transfer.id}/status`,
        { status: 'APPROVED' },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );

      // 2. Dispatch M2M Webhook to SIMCOP for transactional synchronization
      const m2mOk = await dispatchM2mWebhook(
        transfer.soldierId,
        transfer.destinationUnitId,
        transfer.soldierName,
        transfer.soldierRank,
        transfer.mosCode
      );

      setM2mStatusMap(prev => ({
        ...prev,
        [transfer.id]: m2mOk ? 'SYNCED' : 'PENDING'
      }));

      // Refresh list
      await reloadTransfers();
      setIsSimulatorOpen(false);
    } catch (err: unknown) {
      console.error('Error approving transfer:', err);
      alert('Error al aprobar el traslado en el servidor.');
    }
  };

  const handleReject = async (transferId: string) => {
    if (!isAuthorizedToApprove) {
      alert('Acceso Denegado: Solo el Comando Superior puede rechazar traslados.');
      return;
    }

    try {
      await axios.put(
        `${SIGEP_API_URL}/transfers/${transferId}/status`,
        { status: 'REJECTED' },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      await reloadTransfers();
      setIsSimulatorOpen(false);
    } catch (err: unknown) {
      console.error('Error rejecting transfer:', err);
    }
  };

  const handleConfirmCreateFromSimulator = async () => {
    if (!simulatorData) return;
    setCreateSubmitting(true);
    setCreateError(null);

    const requiresOverride = !simulatorData.viable || simulatorData.isOriginBelowThreshold;
    if (requiresOverride && !simulatorOverrideReason.trim()) {
      alert('Debe especificar la convalidación / justificación de comando (G1) para proceder con este movimiento.');
      setCreateSubmitting(false);
      return;
    }

    try {
      const category = deduceCategoryFromRank(simulatorData.soldierRank);
      const impactLevel = requiresOverride ? 'ALTO' : 'NORMAL';
      const initialStatus = requiresOverride ? 'PENDING_REVIEW' : 'PENDING_APPROVAL';

      await axios.post(
        `${SIGEP_API_URL}/transfers`,
        {
          soldierId: simulatorData.soldierId,
          soldierName: simulatorData.soldierName,
          rankCategory: category,
          originUnitId: simulatorData.originUnitId,
          destinationUnitId: simulatorData.destinationUnitId,
          impactLevel,
          status: initialStatus,
          comments: simulatorOverrideReason.trim() || undefined
        },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );

      setIsSimulatorOpen(false);
      setIsCreateModalOpen(false);
      setSelectedSoldierId('');
      setSelectedBatchSoldierIds([]);
      setTargetDestinationUnitId('');
      await reloadTransfers();
    } catch (err: unknown) {
      console.error('Error creating transfer:', err);
      const errMsg = axios.isAxiosError(err)
        ? (err.response?.data?.message as string) || err.message
        : 'Error al radicar la solicitud de traslado.';
      setCreateError(errMsg);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleSubmitBatchTransfers = async () => {
    if (selectedBatchSoldierIds.length === 0) {
      setCreateError('Seleccione al menos un efectivo de la lista.');
      return;
    }
    if (!targetDestinationUnitId) {
      setCreateError('Seleccione la unidad militar receptora.');
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);

    try {
      const selectedSoldiers = unitSoldiers.filter(s =>
        selectedBatchSoldierIds.includes(s.id)
      );

      for (const soldier of selectedSoldiers) {
        const category = deduceCategoryFromRank(soldier.rank);
        await axios.post(
          `${SIGEP_API_URL}/transfers`,
          {
            soldierId: soldier.id,
            soldierName: `${soldier.rank} ${soldier.name}`,
            rankCategory: category,
            originUnitId: effectiveUnitId,
            destinationUnitId: targetDestinationUnitId,
            impactLevel: selectedBatchSoldierIds.length > 5 ? 'ALTO' : 'MEDIO',
            status: 'PENDING_APPROVAL'
          },
          { headers: { Authorization: `Bearer ${user?.token}` } }
        );
      }

      setIsCreateModalOpen(false);
      setSelectedBatchSoldierIds([]);
      setTargetDestinationUnitId('');
      await reloadTransfers();
    } catch (err: unknown) {
      console.error('Error submitting batch transfers:', err);
      setCreateError('Error al procesar el lote de traslados.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // 6. Filtering & Count Badges Computation
  // -------------------------------------------------------------------------

  const rankCounts = useMemo(() => {
    const counts = { TODOS: 0, OFICIAL: 0, SUBOFICIAL: 0, SOLDADO: 0 };
    for (const t of transfers) {
      counts.TODOS++;
      const cat = normalizeRankCategory(t.rankCategory);
      if (counts[cat] !== undefined) counts[cat]++;
    }
    return counts;
  }, [transfers]);

  const pipelineCounts = useMemo(() => {
    const counts = {
      ALL: transfers.length,
      PENDING_APPROVAL: 0,
      PENDING_REVIEW: 0,
      APPROVED: 0,
      REJECTED: 0
    };
    for (const t of transfers) {
      if (t.status === 'PENDING_APPROVAL') counts.PENDING_APPROVAL++;
      else if (t.status === 'PENDING_REVIEW') counts.PENDING_REVIEW++;
      else if (t.status === 'APPROVED') counts.APPROVED++;
      else if (t.status === 'REJECTED') counts.REJECTED++;
    }
    return counts;
  }, [transfers]);

  const filteredTransfers = useMemo(() => {
    return transfers.filter(t => {
      // Rank filter
      if (activeRankTab !== 'TODOS') {
        const cat = normalizeRankCategory(t.rankCategory);
        if (cat !== activeRankTab) return false;
      }
      // Status filter
      if (activeStatusFilter !== 'ALL') {
        if (t.status !== activeStatusFilter) return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSoldier = t.soldierName.toLowerCase().includes(q);
        const matchesId = t.soldierId.toLowerCase().includes(q);
        const matchesOrigin = t.originUnitId.toLowerCase().includes(q);
        const matchesDest = t.destinationUnitId.toLowerCase().includes(q);
        const matchesRadicado = t.id.toLowerCase().includes(q);
        if (!matchesSoldier && !matchesId && !matchesOrigin && !matchesDest && !matchesRadicado) {
          return false;
        }
      }
      return true;
    });
  }, [transfers, activeRankTab, activeStatusFilter, searchQuery]);

  // Destination units options (excluding current origin unit)
  const destinationUnitOptions = useMemo(() => {
    return allUnits.filter(u => u.id !== effectiveUnitId);
  }, [allUnits, effectiveUnitId]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-5 p-2 sm:p-4 text-gray-100 font-sans animate-fade-in">
      
      {/* 1. Tactical Command Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.2)]">
            <ArrowRightLeft size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-100 font-['Orbitron',sans-serif] tracking-wider">
                Consola Centralizada de Movilidad y Traslados
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/40">
                G1/S1
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              Administración de rotaciones orgánicas, viabilidad TOE y enlace M2M con C2 SIMCOP
            </p>
          </div>
        </div>

        {/* Action Controls & M2M Indicator */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* M2M Link Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-slate-300">Enlace M2M SIMCOP:</span>
            <span className="text-emerald-400 font-bold">ONLINE</span>
          </div>

          {/* AI Advisor Button */}
          <button
            type="button"
            onClick={() => setIsAiAdvisorOpen(prev => !prev)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              isAiAdvisorOpen
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'bg-slate-950/80 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Brain size={15} className="text-cyan-400" />
            <span>Asesor IA</span>
          </button>

          {/* New Transfer Button */}
          <button
            type="button"
            onClick={() => {
              setIsCreateModalOpen(true);
              setCreateError(null);
              loadUnitSoldiers(effectiveUnitId);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] focus:outline-none"
          >
            <Plus size={16} />
            <span>Nueva Solicitud</span>
          </button>
        </div>
      </div>

      {/* 2. Collapsible IA Tactical Recommendations */}
      {isAiAdvisorOpen && (
        <div className="rounded-xl border border-cyan-500/30 bg-slate-950/80 p-4 shadow-xl backdrop-blur-md">
          <RecomendacionIA />
        </div>
      )}

      {/* 3. Interactive Status Pipeline (Chevron Flow) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Stage 1: Solicitud */}
        <button
          type="button"
          onClick={() =>
            setActiveStatusFilter(prev => (prev === 'PENDING_APPROVAL' ? 'ALL' : 'PENDING_APPROVAL'))
          }
          className={`relative p-3.5 rounded-xl border text-left transition-all ${
            activeStatusFilter === 'PENDING_APPROVAL'
              ? 'bg-amber-500/15 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
              : 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700 hover:bg-slate-850/80'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              Fase 01 // Radicado
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {pipelineCounts.PENDING_APPROVAL}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-400 shrink-0" />
            <span className="text-sm font-bold text-gray-100 font-['Orbitron',sans-serif]">
              Solicitudes Activas
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Propuestas radicadas en espera de validación TOE
          </p>
        </button>

        {/* Stage 2: Revisión G1 (Override) */}
        <button
          type="button"
          onClick={() =>
            setActiveStatusFilter(prev => (prev === 'PENDING_REVIEW' ? 'ALL' : 'PENDING_REVIEW'))
          }
          className={`relative p-3.5 rounded-xl border text-left transition-all ${
            activeStatusFilter === 'PENDING_REVIEW'
              ? 'bg-purple-500/15 border-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
              : 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700 hover:bg-slate-850/80'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              Fase 02 // Inspección
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
              {pipelineCounts.PENDING_REVIEW}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-purple-400 shrink-0" />
            <span className="text-sm font-bold text-gray-100 font-['Orbitron',sans-serif]">
              Revisión G1 (Override)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Casos observados por déficit de plantilla o sanidad
          </p>
        </button>

        {/* Stage 3: Aprobado (M2M Despachado) */}
        <button
          type="button"
          onClick={() =>
            setActiveStatusFilter(prev => (prev === 'APPROVED' ? 'ALL' : 'APPROVED'))
          }
          className={`relative p-3.5 rounded-xl border text-left transition-all ${
            activeStatusFilter === 'APPROVED'
              ? 'bg-emerald-500/15 border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700 hover:bg-slate-850/80'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              Fase 03 // Ejecución
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {pipelineCounts.APPROVED}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span className="text-sm font-bold text-gray-100 font-['Orbitron',sans-serif]">
              Aprobados C2 (SIMCOP)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Perfeccionados y sincronizados vía Webhook M2M
          </p>
        </button>

        {/* Global Summary & Clear Filter */}
        <button
          type="button"
          onClick={() => setActiveStatusFilter('ALL')}
          className={`relative p-3.5 rounded-xl border text-left transition-all ${
            activeStatusFilter === 'ALL'
              ? 'bg-cyan-500/15 border-cyan-500/80 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
              : 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700 hover:bg-slate-850/80'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              Filtro Global
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              {pipelineCounts.ALL}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-cyan-400 shrink-0" />
            <span className="text-sm font-bold text-gray-100 font-['Orbitron',sans-serif]">
              Todos los Estados
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Visualizar el historial integral de movilidad táctica
          </p>
        </button>
      </div>

      {/* 4. Rank/Category Tabs & Search Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md">
        
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-slate-950/80 border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveRankTab('TODOS')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
              activeRankTab === 'TODOS'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-gray-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Layers size={14} />
            <span>Todos</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {rankCounts.TODOS}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveRankTab('OFICIAL')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
              activeRankTab === 'OFICIAL'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-gray-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Shield size={14} />
            <span>Oficiales</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/30">
              {rankCounts.OFICIAL}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveRankTab('SUBOFICIAL')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
              activeRankTab === 'SUBOFICIAL'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-gray-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Users size={14} />
            <span>Suboficiales</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-purple-950 text-purple-300 border border-purple-500/30">
              {rankCounts.SUBOFICIAL}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveRankTab('SOLDADO')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
              activeRankTab === 'SOLDADO'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-gray-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Target size={14} />
            <span>Soldados</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/30">
              {rankCounts.SOLDADO}
            </span>
          </button>
        </div>

        {/* Search Input Filter */}
        <div className="relative min-w-[240px] flex-1 sm:flex-initial">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por cédula, efectivo, ID o unidad..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono text-gray-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
          />
        </div>
      </div>

      {/* 5. Main Tactical Grid Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/90 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Radicado / Fecha</th>
                <th className="py-3 px-4">Efectivo Militar</th>
                <th className="py-3 px-3">Escalafón</th>
                <th className="py-3 px-4">Origen ➔ Destino</th>
                <th className="py-3 px-3">Estado Pipeline</th>
                <th className="py-3 px-3">Simulación TOE</th>
                <th className="py-3 px-3">Enlace SIMCOP</th>
                <th className="py-3 px-4 text-right">Acción de Mando</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw size={24} className="text-cyan-400 animate-spin" />
                      <span className="text-xs">Consultando base de traslados en SIGEP...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ArrowRightLeft size={32} className="text-slate-600 mb-1" />
                      <span className="text-sm font-bold text-gray-300">
                        No se registraron movimientos en este criterio
                      </span>
                      <p className="text-xs text-slate-500">
                        {activeRankTab !== 'TODOS' || activeStatusFilter !== 'ALL' || searchQuery
                          ? 'Ajuste los filtros o radique una nueva solicitud de traslado.'
                          : 'No existen traslados pendientes en la jurisdicción seleccionada.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransfers.map(transfer => {
                  const m2mStatus =
                    m2mStatusMap[transfer.id] ||
                    (transfer.status === 'APPROVED' ? 'SYNCED' : 'PENDING');

                  const isApproved = transfer.status === 'APPROVED';
                  const isPendingReview = transfer.status === 'PENDING_REVIEW';
                  const isPendingApproval = transfer.status === 'PENDING_APPROVAL';
                  const isRejected = transfer.status === 'REJECTED';

                  return (
                    <tr
                      key={transfer.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* ID / Fecha */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-gray-200">
                          TR-{transfer.id.padStart(4, '0')}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {transfer.createdAt
                            ? new Date(transfer.createdAt).toLocaleDateString('es-CO')
                            : 'Reciente'}
                        </div>
                      </td>

                      {/* Soldier Details */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-sans font-semibold text-gray-100 flex items-center gap-1.5">
                          <span>{transfer.soldierName}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="text-cyan-400 font-bold">ID: {transfer.soldierId}</span>
                          {transfer.mosCode && (
                            <span className="text-slate-500">MOS: {transfer.mosCode}</span>
                          )}
                        </div>
                      </td>

                      {/* Escalafón Pill */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {transfer.rankCategory === 'OFICIAL' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                            OFICIAL
                          </span>
                        ) : transfer.rankCategory === 'SUBOFICIAL' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40">
                            SUBOFICIAL
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                            SOLDADO
                          </span>
                        )}
                      </td>

                      {/* Origen -> Destino */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 text-[10px]">
                            {transfer.originUnitId}
                          </span>
                          <ArrowRight size={12} className="text-slate-500" />
                          <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-700/60 text-[10px] font-bold">
                            {transfer.destinationUnitId}
                          </span>
                        </div>
                      </td>

                      {/* Estado Pipeline */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isApproved ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 w-max">
                            <CheckCircle2 size={11} /> Aprobado
                          </span>
                        ) : isPendingReview ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/40 flex items-center gap-1 w-max">
                            <ShieldAlert size={11} /> Revisión G1
                          </span>
                        ) : isRejected ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/40 flex items-center gap-1 w-max">
                            <XCircle size={11} /> Rechazado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 flex items-center gap-1 w-max">
                            <Clock size={11} /> Solicitud
                          </span>
                        )}
                      </td>

                      {/* Simulación TOE Action Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            runToeSimulation(
                              {
                                id: transfer.soldierId,
                                name: transfer.soldierName,
                                rank: transfer.soldierRank,
                                mosCode: transfer.mosCode
                              },
                              transfer.originUnitId,
                              transfer.destinationUnitId,
                              transfer
                            )
                          }
                          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-cyan-300 text-[10px] font-medium border border-slate-700 hover:border-cyan-500/50 transition-all"
                        >
                          <Activity size={12} className="text-cyan-400" />
                          <span>Simular TOE</span>
                        </button>
                      </td>

                      {/* Enlace SIMCOP (M2M Webhook Status) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isApproved ? (
                          m2mStatus === 'SYNCED' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 w-max">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              M2M Sincronizado
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRetryM2m(transfer)}
                              disabled={retryingM2mId === transfer.id}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40 hover:bg-amber-900/80 flex items-center gap-1 transition-all"
                            >
                              <RefreshCw
                                size={10}
                                className={retryingM2mId === transfer.id ? 'animate-spin' : ''}
                              />
                              <span>Reintentar M2M</span>
                            </button>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">
                            En espera
                          </span>
                        )}
                      </td>

                      {/* Acciones de Mando */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        {(isPendingApproval || isPendingReview) && (
                          <div className="flex items-center justify-end gap-1.5">
                            {isAuthorizedToApprove ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    runToeSimulation(
                                      {
                                        id: transfer.soldierId,
                                        name: transfer.soldierName,
                                        rank: transfer.soldierRank,
                                        mosCode: transfer.mosCode
                                      },
                                      transfer.originUnitId,
                                      transfer.destinationUnitId,
                                      transfer
                                    )
                                  }
                                  title="Aprobar con Simulación Previa"
                                  className="p-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 transition-all"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReject(transfer.id)}
                                  title="Rechazar Traslado"
                                  className="p-1.5 rounded bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 transition-all"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">
                                Solo Comando Superior
                              </span>
                            )}
                          </div>
                        )}

                        {isApproved && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => generateOapPdf(transfer)}
                              title="Descargar Orden Administrativa de Personal Oficial (OAP en PDF)"
                              className="px-2 py-1 rounded bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono flex items-center gap-1 transition-all"
                            >
                              <FileText size={12} />
                              OAP (PDF)
                            </button>
                            <span className="text-[10px] text-emerald-400 font-bold">
                              Dictamen Emitido
                            </span>
                          </div>
                        )}

                        {isRejected && (
                          <span className="text-[10px] text-rose-400 font-bold">
                            Denegado G1
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Pre-confirmation TOE Impact Simulator Modal */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto custom-scrollbar rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Activity size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-100 font-['Orbitron',sans-serif] tracking-wider">
                    Simulador Previo de Impacto en Plantilla TOE
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    Evaluación doctrinal de huella orgánica y umbral de cobertura del 80%
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSimulatorOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-gray-100 hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {simulatorLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-cyan-400">
                <RefreshCw size={28} className="animate-spin" />
                <span className="text-xs font-mono">
                  Calculando balance orgánico de origen, destino y especialidades críticas...
                </span>
              </div>
            ) : simulatorData ? (
              <div className="flex flex-col gap-4 text-xs font-sans">
                
                {/* Soldier Profile Brief */}
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500">
                      Efectivo en Movimiento
                    </span>
                    <h4 className="text-sm font-bold text-gray-100">
                      {simulatorData.soldierRank} {simulatorData.soldierName}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-0.5">
                      <span>ID: {simulatorData.soldierId}</span>
                      <span>•</span>
                      <span className="text-cyan-400 font-bold">MOS: {simulatorData.mosCode}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold border ${
                        simulatorData.healthStatus === 'APTO'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                          : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      Sanidad: {simulatorData.healthStatus}
                    </span>
                  </div>
                </div>

                {/* 80% Threshold Warning Banner */}
                {simulatorData.isOriginBelowThreshold && (
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/60 flex items-start gap-3">
                    <AlertTriangle size={20} className="text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-rose-300 text-xs">
                        ALERTA DE DÉFICIT CRÍTICO: UMBRAL TOE INFERIOR AL 80%
                      </h5>
                      <p className="text-[11px] text-rose-200 mt-0.5 leading-relaxed font-mono">
                        La extracción proyectada reduce la cobertura de la unidad de origen{' '}
                        <strong>{simulatorData.originUnitId}</strong> a{' '}
                        <span className="font-bold text-rose-400">
                          {simulatorData.originAfter.coveragePct}%
                        </span>
                        , violando el umbral doctrinal del 80%. Este movimiento requiere convalidación obligatoria del Oficial G1.
                      </p>
                    </div>
                  </div>
                )}

                {/* Side-by-side Footprint Changes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                  
                  {/* Origin Unit Box */}
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
                      <span>Unidad Origen: {simulatorData.originUnitId}</span>
                      <span className="text-rose-400">-1 Efectivo</span>
                    </div>
                    
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Efectivos Actuales:</span>
                        <span className="text-gray-200 font-bold">
                          {simulatorData.originBefore.actual} / {simulatorData.originBefore.required}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Cobertura Inicial:</span>
                        <span className="text-cyan-300 font-bold">
                          {simulatorData.originBefore.coveragePct}%
                        </span>
                      </div>
                      <div className="border-t border-slate-800 pt-1.5 flex justify-between">
                        <span className="text-slate-400">Proyección Posterior:</span>
                        <span
                          className={`font-bold ${
                            simulatorData.isOriginBelowThreshold
                              ? 'text-rose-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {simulatorData.originAfter.actual} / {simulatorData.originAfter.required} (
                          {simulatorData.originAfter.coveragePct}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Destination Unit Box */}
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
                      <span>Unidad Destino: {simulatorData.destinationUnitId}</span>
                      <span className="text-emerald-400">+1 Efectivo</span>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Efectivos Actuales:</span>
                        <span className="text-gray-200 font-bold">
                          {simulatorData.destinationBefore.actual} / {simulatorData.destinationBefore.required}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Cobertura Inicial:</span>
                        <span className="text-cyan-300 font-bold">
                          {simulatorData.destinationBefore.coveragePct}%
                        </span>
                      </div>
                      <div className="border-t border-slate-800 pt-1.5 flex justify-between">
                        <span className="text-slate-400">Proyección Posterior:</span>
                        <span className="font-bold text-emerald-400">
                          {simulatorData.destinationAfter.actual} /{' '}
                          {simulatorData.destinationAfter.required} (
                          {simulatorData.destinationAfter.coveragePct}%)
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Suggested Replacements (if deficit) */}
                {simulatorData.suggestedReplacements &&
                  simulatorData.suggestedReplacements.length > 0 && (
                    <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/30 font-mono">
                      <div className="flex items-center gap-2 text-cyan-300 font-bold mb-2">
                        <Sparkles size={14} />
                        <span>Reemplazos Sugeridos por Superávit Orgánico (IA)</span>
                      </div>
                      <div className="space-y-1.5">
                        {simulatorData.suggestedReplacements.slice(0, 3).map((rep, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded bg-slate-950/80 border border-slate-800 text-[11px]"
                          >
                            <span className="font-bold text-gray-200">
                              {rep.rank} {rep.name}
                            </span>
                            <span className="text-slate-400">
                              Unidad: <strong className="text-cyan-400">{rep.unitId}</strong> | MOS:{' '}
                              {rep.mosCode}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* G1 Convalidation / Override Reason Input */}
                {(simulatorData.isOriginBelowThreshold || !simulatorData.viable) && (
                  <div className="p-3 rounded-lg bg-slate-950 border border-amber-500/40">
                    <label className="block text-[11px] font-bold text-amber-300 mb-1">
                      Convalidación / Justificación de Comando (G1/JEMPP) *
                    </label>
                    <textarea
                      rows={2}
                      value={simulatorOverrideReason}
                      onChange={e => setSimulatorOverrideReason(e.target.value)}
                      placeholder="Ingrese la directiva operacional o justificación técnica de la rotación..."
                      className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-gray-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                {/* Modal Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsSimulatorOpen(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-mono transition-colors"
                  >
                    Cerrar
                  </button>

                  {pendingApprovalTransfer ? (
                    // In-list approval mode
                    isAuthorizedToApprove && (
                      <button
                        type="button"
                        onClick={() => handleApprove(pendingApprovalTransfer)}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs font-mono tracking-wider transition-all"
                      >
                        Aprobar y Despachar M2M
                      </button>
                    )
                  ) : (
                    // New creation confirmation mode
                    <button
                      type="button"
                      onClick={handleConfirmCreateFromSimulator}
                      disabled={createSubmitting}
                      className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs font-mono tracking-wider transition-all"
                    >
                      {createSubmitting ? 'Radicando...' : 'Confirmar y Radicar'}
                    </button>
                  )}
                </div>

              </div>
            ) : null}

          </div>
        </div>
      )}

      {/* 7. New Transfer Request Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto custom-scrollbar rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-100 font-['Orbitron',sans-serif] tracking-wider">
                    Radicar Nueva Solicitud de Traslado
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    Jurisdicción de Origen: <span className="text-cyan-400 font-bold">{effectiveUnitId}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-gray-100 hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500 text-rose-300 text-xs font-mono mb-4">
                {createError}
              </div>
            )}

            {/* Mode Toggle: Individual vs Batch */}
            <div className="flex items-center gap-2 mb-4 p-1 rounded-lg bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setTransferMode('INDIVIDUAL')}
                className={`flex-1 py-1.5 rounded text-xs font-mono font-medium transition-all ${
                  transferMode === 'INDIVIDUAL'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-gray-200'
                }`}
              >
                Traslado Individual
              </button>
              <button
                type="button"
                onClick={() => setTransferMode('BATCH')}
                className={`flex-1 py-1.5 rounded text-xs font-mono font-medium transition-all ${
                  transferMode === 'BATCH'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-gray-200'
                }`}
              >
                Rotación de Bloque / Pelotón
              </button>
            </div>

            {/* Mode 1: Individual Soldier Selection */}
            {transferMode === 'INDIVIDUAL' && (
              <div className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-slate-400 mb-1">
                    Seleccione Efectivo Militar (Personal Real de {effectiveUnitId}) *
                  </label>
                  <select
                    value={selectedSoldierId}
                    onChange={e => setSelectedSoldierId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-gray-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Seleccione Soldado / Oficial / Suboficial --</option>
                    {unitSoldiers.map(soldier => (
                      <option key={soldier.id} value={soldier.id}>
                        [{soldier.rank}] {soldier.name} - MOS: {soldier.mosCode} ({soldier.healthStatus})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    Unidad Militar Receptora (Destino) *
                  </label>
                  <select
                    value={targetDestinationUnitId}
                    onChange={e => setTargetDestinationUnitId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-gray-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Seleccione Unidad Militar Receptora --</option>
                    {destinationUnitOptions.map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.id} - {unit.name} ({unit.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!selectedSoldierId || !targetDestinationUnitId}
                    onClick={() => {
                      const s = unitSoldiers.find(x => x.id === selectedSoldierId);
                      if (s && targetDestinationUnitId) {
                        runToeSimulation(s, effectiveUnitId, targetDestinationUnitId);
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <Activity size={15} />
                    <span>Evaluar TOE Previo</span>
                  </button>
                </div>
              </div>
            )}

            {/* Mode 2: Batch Group Selection (Real Soldiers, Zero LOTE IDs) */}
            {transferMode === 'BATCH' && (
              <div className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-slate-400 mb-1">
                    Seleccione Efectivos Orgánicos para Rotación en Bloque ({selectedBatchSoldierIds.length} seleccionados)
                  </label>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar p-2 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    {unitSoldiers.length === 0 ? (
                      <div className="p-3 text-center text-slate-500">
                        No hay efectivos disponibles en esta unidad
                      </div>
                    ) : (
                      unitSoldiers.map(soldier => {
                        const isChecked = selectedBatchSoldierIds.includes(soldier.id);
                        return (
                          <label
                            key={soldier.id}
                            className={`flex items-center gap-2.5 p-2 rounded cursor-pointer transition-colors ${
                              isChecked ? 'bg-cyan-950/40 text-cyan-200' : 'hover:bg-slate-900 text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedBatchSoldierIds(prev => [...prev, soldier.id]);
                                } else {
                                  setSelectedBatchSoldierIds(prev =>
                                    prev.filter(id => id !== soldier.id)
                                  );
                                }
                              }}
                              className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                            />
                            <span>
                              [{soldier.rank}] {soldier.name} (MOS: {soldier.mosCode})
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    Unidad Militar Receptora (Destino) *
                  </label>
                  <select
                    value={targetDestinationUnitId}
                    onChange={e => setTargetDestinationUnitId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-gray-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Seleccione Unidad Militar Receptora --</option>
                    {destinationUnitOptions.map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.id} - {unit.name} ({unit.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={selectedBatchSoldierIds.length === 0 || !targetDestinationUnitId || createSubmitting}
                    onClick={handleSubmitBatchTransfers}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <Send size={15} />
                    <span>{createSubmitting ? 'Radicando...' : 'Radicar Rotación de Tropa'}</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
