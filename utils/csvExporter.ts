
import type { INSITOPReport, UnitINSITOPDetail } from '../types';

const escapeCSVField = (field: string | number | undefined | boolean): string => {
  if (field === undefined || field === null) {
    return '';
  }
  let stringField = String(field);
  if (typeof field === 'boolean') {
    stringField = field ? 'Sí' : 'No';
  }
  // If the field contains a comma, double quote, or newline, enclose in double quotes
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    // Escape existing double quotes by doubling them
    stringField = stringField.replace(/"/g, '""');
    return `"${stringField}"`;
  }
  return stringField;
};

export const exportInsitopToCSV = (report: INSITOPReport): void => {
  const headers = [
    'ID_REPORTE_CONSOLIDADO_SIMCOP',
    'FECHA_EFECTIVA_REPORTE_CONSOLIDADO',
    'FECHA_GENERACION_SIMCOP',
    'ID_UNIDAD_ORIGINAL_SIMCOP',
    'NOMBRE_UNIDAD_ORIGINAL_SIMCOP',
    'TIPO_UNIDAD_ORIGINAL_SIMCOP',
    'COD_COMPANIA',
    'COD_PELOTON',
    'COD_SECCION',
    'COD_ESCUADRA',
    'COD_TRIPULACION',
    'LATITUD_DMS',
    'LONGITUD_DMS',
    'SITIO_VEREDA',
    'MUNICIPIO_DANE',
    'DEPARTAMENTO_DANE',
    'EFECTIVOS_OFICIALES',
    'EFECTIVOS_SUBOFICIALES',
    'EFECTIVOS_SL_PROFESIONALES',
    'EFECTIVOS_SL_REGULARES',
    'EFECTIVOS_SL_CAMPESINOS',
    'EFECTIVOS_SL_BACHILLERES',
    'SITUACION_UNIDAD',
    'GRADO_COMANDANTE',
    'NOMBRE_COMANDANTE',
    'TIPO_MISION',
    'CANT_VEHICULOS',
    'TIPOS_VEHICULOS',
    'CANT_MOTOCICLETAS',
    'TIPOS_MOTOCICLETAS',
    'INFO_GRUPO_EXDE',
    'PRECISIONES_ADICIONALES',
  ];

  const rows = report.unitEntries.map(unitEntry => [
    report.id,
    report.effectiveReportDate,
    new Date(report.reportTimestamp).toISOString(),
    unitEntry.unitIdentification.originalUnitId,
    unitEntry.unitIdentification.originalUnitName,
    unitEntry.unitIdentification.originalUnitType,
    unitEntry.unitIdentification.companyCode,
    unitEntry.unitIdentification.platoonCode,
    unitEntry.unitIdentification.sectionCode,
    unitEntry.unitIdentification.squadCode,
    unitEntry.unitIdentification.crewCode,
    unitEntry.locationDetails.latitudeDMS,
    unitEntry.locationDetails.longitudeDMS,
    unitEntry.locationDetails.siteName,
    unitEntry.locationDetails.municipalityDANE,
    unitEntry.locationDetails.departmentDANE,
    unitEntry.personnelStrength.officers,
    unitEntry.personnelStrength.NCOs,
    unitEntry.personnelStrength.professionalSoldiers,
    unitEntry.personnelStrength.regularSoldiers,
    unitEntry.personnelStrength.peasantSoldiers,
    unitEntry.personnelStrength.baccalaureateSoldiers,
    unitEntry.unitSituation,
    unitEntry.commanderDetails.rankAbbreviation,
    unitEntry.commanderDetails.fullName,
    unitEntry.missionType,
    unitEntry.vehiclesAndMotorcycles?.vehicleCount,
    unitEntry.vehiclesAndMotorcycles?.vehicleTypes,
    unitEntry.vehiclesAndMotorcycles?.motorcycleCount,
    unitEntry.vehiclesAndMotorcycles?.motorcycleTypes,
    unitEntry.exdeGroupInfo,
    unitEntry.additionalRemarks,
  ].map(escapeCSVField));

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  const reportDateForFile = report.effectiveReportDate.replace(/-/g, '');
  const fileName = `INSITOP_Consolidado_${report.id.substring(0, 6)}_${reportDateForFile}.csv`;
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
