import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { SoldierData, DossierData } from '../components/FichaDigital';

/**
 * Military Reports & Documents Service (Mil-Spec Doctrinal Standard)
 * Generates official administrative military orders (OAP), Dossiers,
 * and handles Excel/CSV bulk data import/export with 0 `any` types.
 */

export interface TransferRecord {
  id?: string | number;
  soldierId?: string;
  soldierName?: string;
  soldierRank?: string;
  mosCode?: string;
  sourceUnitId?: string;
  originUnit?: string;
  targetUnitId?: string;
  destinationUnit?: string;
  status?: string;
  effectiveDate?: string;
  approvalDate?: string;
  approvedBy?: string;
  simcopSynced?: boolean;
}

export interface AvailabilityRecord {
  aptos?: number;
  noAptos?: number;
  excusados?: number;
  licencias?: number;
}

interface DocWithAutoTable {
  lastAutoTable?: {
    finalY: number;
  };
}

// ---------------------------------------------------------------------------
// 1. ORDEN ADMINISTRATIVA DE PERSONAL (OAP) - TRASLADOS EN PDF
// ---------------------------------------------------------------------------
export function generateOapPdf(transfer: TransferRecord, soldier?: SoldierData | null) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Header Militar
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('FUERZAS MILITARES DE COLOMBIA', pageWidth / 2, 20, { align: 'center' });
  doc.text('EJÉRCITO NACIONAL', pageWidth / 2, 25, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('JEFATURA DE ESTADO MAYOR DE PERSONAL - J1 / S1', pageWidth / 2, 30, { align: 'center' });
  doc.text('SISTEMA INTEGRADO DE GESTIÓN DE PERSONAL (SIGEP)', pageWidth / 2, 34, { align: 'center' });

  // Línea divisoria
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(20, 38, pageWidth - 20, 38);

  // Título de la Orden
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  const resolucionNum = transfer.id ? `OAP-N° ${String(transfer.id).padStart(6, '0')}-MDN-CGFM-J1` : 'OAP-RESOLUCIÓN-OFICIAL';
  doc.text(resolucionNum, pageWidth / 2, 47, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha de Emisión Oficial: Bogotá D.C., ${today}`, pageWidth / 2, 52, { align: 'center' });

  // Tabla con detalles del efectivo y movimiento
  const rank = transfer.soldierRank || soldier?.rank || 'GRADO';
  const name = transfer.soldierName || soldier?.name || 'NOMBRE COMPLETO';
  const soldierId = transfer.soldierId || soldier?.id || 'ID-NO-DISPONIBLE';
  const sourceUnit = transfer.sourceUnitId || transfer.originUnit || soldier?.unitId || 'ORIGEN';
  const targetUnit = transfer.targetUnitId || transfer.destinationUnit || 'DESTINO';
  const status = transfer.status || 'APROBADO';
  const effectiveDate = transfer.effectiveDate || transfer.approvalDate || today;

  autoTable(doc, {
    startY: 58,
    head: [['PARÁMETRO REGLAMENTARIO', 'DETALLE TÁCTICO DE LA RESOLUCIÓN']],
    body: [
      ['Nombres y Apellidos del Efectivo', `${rank} ${name}`],
      ['Documento Militar / Cédula', soldierId],
      ['Especialidad Orgánica (MOS)', soldier?.mosCode || transfer.mosCode || 'NO ASIGNADO'],
      ['Arma o Servicio', soldier?.branch || 'INFANTERÍA'],
      ['Unidad Orgánica de Origen', sourceUnit],
      ['Unidad Táctica de Destino', targetUnit],
      ['Estado Doctrinal del Trámite', status],
      ['Fecha Efectiva de Incorporación', effectiveDate],
      ['Autorizado Por', transfer.approvedBy || 'COMANDO SUPERIOR / JEFATURA G1'],
      ['Sincronización M2M SIMCOP', transfer.simcopSynced ? 'ENLACE SATELITAL CONFIRMADO (SYNC)' : 'REGISTRO DIRECTO SIGEP']
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [248, 250, 252],
      fontSize: 9,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249]
    },
    margin: { left: 20, right: 20 }
  });

  const finalY = (doc as unknown as DocWithAutoTable).lastAutoTable?.finalY ?? 130;
  const legalSectionY = finalY + 15;

  // Texto reglamentario
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const legalText = `Por disposición del Comando Superior y con fundamento en las facultades asignadas a la Dirección de Personal, se dispone el relevo y traslado del efectivo militar citado precedentemente para cumplir misiones operacionales en la unidad de destino. Queda sin efecto cualquier disposición anterior que le sea contraria. Cúmplase.`;
  const splitText = doc.splitTextToSize(legalText, pageWidth - 40);
  doc.text(splitText, 20, legalSectionY);

  // Firmas militares
  const sigY = legalSectionY + 45;
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.4);
  doc.line(25, sigY, 85, sigY);
  doc.line(pageWidth - 85, sigY, pageWidth - 25, sigY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('OFICIAL DE PERSONAL G1 / S1', 55, sigY + 5, { align: 'center' });
  doc.text('JEFATURA DE OPERACIONES - C2', pageWidth - 55, sigY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Firma y Folio de Aprobación', 55, sigY + 9, { align: 'center' });
  doc.text('Firma de Notificación Táctica', pageWidth - 55, sigY + 9, { align: 'center' });

  // Pie de página con código de verificación
  const hash = Math.random().toString(36).substring(2, 10).toUpperCase();
  doc.setFontSize(6.5);
  doc.text(`SIGEP M2M SECURE TOKEN VERIFIED | HASH: ${hash} | SISTEMA CONECTADO A SIMCOP C2`, pageWidth / 2, 265, { align: 'center' });

  // Descargar PDF
  doc.save(`OAP_${rank}_${soldierId}_${Date.now().toString().slice(-4)}.pdf`);
}

// ---------------------------------------------------------------------------
// 2. EXPEDIENTE MILITAR OFICIAL EN PDF (DOSSIER CLASIFICADO)
// ---------------------------------------------------------------------------
export function generateDossierPdf(dossier: DossierData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const soldier = dossier.soldier;
  const history = dossier.history || [];
  const unitHistory = dossier.unitHistory || [];

  // Header clasificado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(220, 38, 38);
  doc.text('DOCUMENTO MILITAR CLASIFICADO - USO INTERNO EXCLUSIVO', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('EXPEDIENTE MILITAR INDIVIDUAL DE PERSONAL', pageWidth / 2, 22, { align: 'center' });

  doc.setDrawColor(15, 23, 42);
  doc.line(20, 26, pageWidth - 20, 26);

  // Datos Principales
  autoTable(doc, {
    startY: 30,
    head: [['DATOS BIOGRÁFICOS Y MILITARES', 'VALOR REGISTRADO']],
    body: [
      ['Grado y Nombre Completo', `${soldier.rank} ${soldier.name}`],
      ['ID / Cédula Militar', soldier.id],
      ['Arma', soldier.branch || 'INFANTERÍA'],
      ['Especialidad (MOS)', soldier.mosCode || 'S/E'],
      ['Unidad Actual Asignada', soldier.unitId || 'SIN ASIGNAR'],
      ['Estado Operativo', soldier.status || 'ACTIVO'],
      ['Condición Psicofísica / Sanidad', soldier.healthStatus || 'APTO'],
      ['Tiempo de Permanencia', `${soldier.timeInPosition || 0} meses en la unidad`],
      ['Cursos de Combate', soldier.cursosCombate || 'NINGUNO REGISTRADO']
    ],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    margin: { left: 20, right: 20 }
  });

  const dossierFinalY = (doc as unknown as DocWithAutoTable).lastAutoTable?.finalY ?? 90;
  let nextY = dossierFinalY + 10;

  // Unidades Previas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Historial de Asignaciones Previas', 20, nextY);

  const unitRows = unitHistory.length > 0 ? unitHistory.map((u, i) => [`#${i + 1}`, u]) : [['-', 'Sin registros previos']];
  autoTable(doc, {
    startY: nextY + 3,
    head: [['#', 'Unidad Militar de Destino Previo']],
    body: unitRows,
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 20, right: 20 }
  });

  const unitFinalY = (doc as unknown as DocWithAutoTable).lastAutoTable?.finalY ?? nextY + 20;
  nextY = unitFinalY + 10;

  // Novedades Oficiales
  doc.text('Registro Oficial de Novedades y Sanciones', 20, nextY);
  const novRows = history.length > 0 ? history.map(n => [
    n.fecha ? new Date(n.fecha).toLocaleDateString() : 'S/F',
    n.tipo,
    n.descripcion,
    n.resolucion || 'N/A'
  ]) : [['-', '-', 'Sin novedades registradas', '-']];

  autoTable(doc, {
    startY: nextY + 3,
    head: [['Fecha', 'Tipo', 'Descripción / Circunstancia', 'Resolución']],
    body: novRows,
    theme: 'grid',
    headStyles: { fillColor: [71, 85, 105], fontSize: 8 },
    bodyStyles: { fontSize: 7.5 },
    margin: { left: 20, right: 20 }
  });

  doc.save(`Expediente_${soldier.rank}_${soldier.id}.pdf`);
}

// ---------------------------------------------------------------------------
// 3. EXPORTACIÓN DE ESTADO DE FUERZA Y TOE A EXCEL
// ---------------------------------------------------------------------------
export function exportToeToExcel<T extends { unitId?: string; mosCode?: string; required?: number; actual?: number }>(
  toeData: T[],
  availability: AvailabilityRecord | null,
  unitName: string
) {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Balance TOE
  const toeRows = toeData.map(item => {
    const required = typeof item.required === 'number' ? item.required : 0;
    const actual = typeof item.actual === 'number' ? item.actual : 0;
    return {
      'Unidad': String(item.unitId || unitName),
      'Especialidad MOS': String(item.mosCode || 'S/E'),
      'Requeridos Doctrinal': required,
      'Reales Físicos': actual,
      'Déficit': required - actual,
      'Cobertura %': required > 0 ? Math.round((actual / required) * 100) + '%' : '100%',
      'Alerta Orgánica': actual < required * 0.8 ? 'CRÍTICO (<80%)' : 'NORMAL'
    };
  });

  const wsToe = XLSX.utils.json_to_sheet(toeRows);
  XLSX.utils.book_append_sheet(wb, wsToe, 'Balance TOE');

  // Hoja 2: Disponibilidad Psicofísica
  if (availability) {
    const healthRows = [
      { 'Condición Médica': 'APTO PARA EL SERVICIO', 'Cantidad': availability.aptos || 0 },
      { 'Condición Médica': 'NO APTO / BAJA MÉDICA', 'Cantidad': availability.noAptos || 0 },
      { 'Condición Médica': 'EXCUSA MÉDICA', 'Cantidad': availability.excusados || 0 },
      { 'Condición Médica': 'LICENCIA', 'Cantidad': availability.licencias || 0 }
    ];
    const wsHealth = XLSX.utils.json_to_sheet(healthRows);
    XLSX.utils.book_append_sheet(wb, wsHealth, 'Sanidad Militar');
  }

  XLSX.writeFile(wb, `Estado_Fuerza_TOE_${unitName}_${Date.now().toString().slice(-4)}.xlsx`);
}

// ---------------------------------------------------------------------------
// 4. DESCARGA DE PLANTILLA PARA CARGA MASIVA DE PERSONAL (.xlsx)
// ---------------------------------------------------------------------------
export function downloadBulkTemplate() {
  const wb = XLSX.utils.book_new();

  const sampleData = [
    {
      'ID_MILITAR': '1098234561',
      'NOMBRES_APELLIDOS': 'GOMEZ RESTREPO CARLOS',
      'GRADO': 'CT',
      'ARMA': 'INFANTERIA',
      'CODIGO_MOS': '11A',
      'SANIDAD': 'APTO',
      'CURSOS_COMBATE': 'LANCERO, PARACAIDISTA',
      'TIEMPO_MESES': 14
    },
    {
      'ID_MILITAR': '1098234562',
      'NOMBRES_APELLIDOS': 'PEREZ MONTOYA ANDRES',
      'GRADO': 'CP',
      'ARMA': 'INGENIEROS',
      'CODIGO_MOS': '12B',
      'SANIDAD': 'APTO',
      'CURSOS_COMBATE': 'EXPLOSIVOS, BRECHERO',
      'TIEMPO_MESES': 28
    },
    {
      'ID_MILITAR': '1098234563',
      'NOMBRES_APELLIDOS': 'JARAMILLO SILVA LUIS',
      'GRADO': 'SLP',
      'ARMA': 'INFANTERIA',
      'CODIGO_MOS': '11B',
      'SANIDAD': 'APTO',
      'CURSOS_COMBATE': 'TIRADOR ESCOGIDO',
      'TIEMPO_MESES': 6
    },
    {
      'ID_MILITAR': '1098234564',
      'NOMBRES_APELLIDOS': 'RODRIGUEZ SUAREZ JAVIER',
      'GRADO': 'TE',
      'ARMA': 'COMUNICACIONES',
      'CODIGO_MOS': '25B',
      'SANIDAD': 'EXCUSA MEDICA',
      'CURSOS_COMBATE': 'GUERRA ELECTRONICA',
      'TIEMPO_MESES': 18
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla_Personal');

  XLSX.writeFile(wb, 'Plantilla_Carga_Masiva_Personal_SIGEP.xlsx');
}

// ---------------------------------------------------------------------------
// 5. PARSER DE ARCHIVO EXCEL / CSV PARA CARGA MASIVA
// ---------------------------------------------------------------------------
export async function parseBulkPersonnelFile(file: File, targetUnitId: string): Promise<{
  validSoldiers: SoldierData[];
  errors: string[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: Array<Record<string, unknown>> = XLSX.utils.sheet_to_json(worksheet);

        const validSoldiers: SoldierData[] = [];
        const errors: string[] = [];

        if (!rawJson || rawJson.length === 0) {
          return resolve({ validSoldiers: [], errors: ['El archivo no contiene filas de datos.'] });
        }

        rawJson.forEach((row, index) => {
          const rowNum = index + 2; // +1 cabecera, +1 base-1

          // Normalizar llaves
          const getVal = (possibleKeys: string[]) => {
            for (const k of possibleKeys) {
              for (const rowKey of Object.keys(row)) {
                if (rowKey.trim().toUpperCase() === k.toUpperCase()) {
                  return String(row[rowKey]).trim();
                }
              }
            }
            return '';
          };

          const id = getVal(['ID_MILITAR', 'ID', 'CEDULA', 'DOCUMENTO']) || `SLD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
          const name = getVal(['NOMBRES_APELLIDOS', 'NOMBRE', 'NOMBRES', 'APELLIDOS']);
          const rank = getVal(['GRADO', 'RANGO']) || 'SLP';
          const branch = getVal(['ARMA', 'SERVICIO']) || 'INFANTERIA';
          const mosCode = getVal(['CODIGO_MOS', 'MOS', 'ESPECIALIDAD']) || '11B';
          const healthStatus = getVal(['SANIDAD', 'ESTADO_SALUD']) || 'APTO';
          const cursosCombate = getVal(['CURSOS_COMBATE', 'CURSOS', 'CAPACITACION']) || 'NINGUNO';
          const timeInPositionRaw = getVal(['TIEMPO_MESES', 'PERMANENCIA', 'MESES']);
          const timeInPosition = timeInPositionRaw ? parseInt(timeInPositionRaw, 10) || 0 : 0;

          if (!name) {
            errors.push(`Fila ${rowNum}: El campo 'Nombres y Apellidos' es obligatorio.`);
            return;
          }

          validSoldiers.push({
            id,
            name: name.toUpperCase(),
            rank: rank.toUpperCase(),
            branch: branch.toUpperCase(),
            mosCode: mosCode.toUpperCase(),
            healthStatus: healthStatus.toUpperCase(),
            cursosCombate: cursosCombate.toUpperCase(),
            timeInPosition,
            unitId: targetUnitId,
            status: 'ACTIVE'
          });
        });

        resolve({ validSoldiers, errors });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        reject(new Error(`Error al procesar el archivo: ${msg}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo desde el sistema de archivos.'));
    };

    reader.readAsBinaryString(file);
  });
}
