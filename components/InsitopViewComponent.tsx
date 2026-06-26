import React, { useCallback } from 'react';
import type { MilitaryUnit, UnitINSITOPDetail, UnitIdentificationINSITOP, LocationDetailsINSITOP, PersonnelStrengthINSITOP, CommanderDetailsINSITOP, VehiclesAndMotorcyclesINSITOP, INSITOPReport, CommanderInfo, PersonnelBreakdown } from '../types';
import { UnitType, UnitStatus, UnitSituationINSITOP } from '../types';
import { TableCellsIcon } from './icons/TableCellsIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { decimalToDMS } from '../utils/coordinateUtils';
import { exportInsitopToCSV } from '../utils/csvExporter';
import { generateRandomId } from '../hooks/useSimulatedData';
import { MISSION_TYPES } from '../constants';

interface InsitopViewProps {
  operationalUnits: MilitaryUnit[];
}

const transformUnitToInsitopDetail = (unit: MilitaryUnit): UnitINSITOPDetail => {
  const unitNameStr = String(unit.name ?? "NOMBRE DESCONOCIDO").toUpperCase();
  const unitTypeStr = unit.type ?? UnitType.SQUAD;

  let companyCodeVal: string;
  let platoonCodeVal: string;

  if (unitTypeStr === UnitType.COMPANY) {
    companyCodeVal = unitNameStr;
    platoonCodeVal = "N/A";
  } else if (unitTypeStr === UnitType.PLATOON) {
    platoonCodeVal = unitNameStr;
    companyCodeVal = `COMPAÑÍA DE ${unitNameStr}`;
  } else if (unitTypeStr === UnitType.BATTALION) {
    companyCodeVal = `${unitNameStr} (BN)`;
    platoonCodeVal = "N/A";
  } else {
    companyCodeVal = `${unitNameStr} (${unitTypeStr})`;
    platoonCodeVal = "N/A";
  }

  const unitIdentificationVal: UnitIdentificationINSITOP = {
    originalUnitId: String(unit.id ?? generateRandomId()),
    originalUnitName: unitNameStr,
    originalUnitType: unitTypeStr,
    companyCode: companyCodeVal,
    platoonCode: platoonCodeVal,
    sectionCode: "N/A",
    squadCode: "N/A",
    crewCode: "N/A",
  };

  let currentLatDMS = "N/A";
  let currentLonDMS = "N/A";
  if (unit.location && typeof unit.location.lat === 'number' && typeof unit.location.lon === 'number' && !isNaN(unit.location.lat) && !isNaN(unit.location.lon)) {
    const dmsLocationString = decimalToDMS(unit.location);
    if (dmsLocationString && dmsLocationString !== "N/A") {
      if (dmsLocationString.includes(',')) {
        const dmsParts = dmsLocationString.split(',');
        currentLatDMS = dmsParts[0] ? dmsParts[0].trim() : "N/A";
        currentLonDMS = dmsParts[1] ? dmsParts[1].trim() : "N/A";
      } else {
        currentLatDMS = dmsLocationString;
        currentLonDMS = "FORMATO INVÁLIDO";
      }
    }
  }

  const locationDetailsVal: LocationDetailsINSITOP = {
    latitudeDMS: currentLatDMS,
    longitudeDMS: currentLonDMS,
    siteName: "DATO NO EN UNIDAD SIMCOP",
    municipalityDANE: "DATO NO EN UNIDAD SIMCOP",
    departmentDANE: "DATO NO EN UNIDAD SIMCOP",
  };

  const pb = unit.personnelBreakdown || {};
  const personnelStrengthVal: PersonnelStrengthINSITOP = {
    officers: (pb as PersonnelBreakdown).officers ?? 0,
    NCOs: (pb as PersonnelBreakdown).ncos ?? 0,
    professionalSoldiers: (pb as PersonnelBreakdown).professionalSoldiers ?? 0,
    regularSoldiers: (pb as PersonnelBreakdown).slRegulars ?? 0, // Mapping slRegulars to regularSoldiers
    peasantSoldiers: 0, // Not tracked in MilitaryUnit
    baccalaureateSoldiers: 0 // Not tracked in MilitaryUnit
  };

  const commanderDetailsVal: CommanderDetailsINSITOP = {
    rankAbbreviation: (unit.commander?.rank || "GD.").toUpperCase(),
    fullName: (unit.commander?.name || "NO ASIGNADO").toUpperCase(),
  };

  const vehiclesAndMotorcyclesVal: VehiclesAndMotorcyclesINSITOP = {
    vehicleCount: 0,
    vehicleTypes: "NO DETALLADO EN UNIDAD",
    motorcycleCount: 0,
    motorcycleTypes: "NO DETALLADO EN UNIDAD"
  };

  const totalPersonnel = ((pb as PersonnelBreakdown).officers ?? 0) + ((pb as PersonnelBreakdown).ncos ?? 0) + ((pb as PersonnelBreakdown).professionalSoldiers ?? 0) + ((pb as PersonnelBreakdown).slRegulars ?? 0);
  const unitAdditionalRemarks = `ESTADO SIMCOP: ${unit.status ?? 'N/A'}. EFECTIVOS TOTALES: ${totalPersonnel}. MUNICIÓN: ${(unit.ammoLevel ?? 'N/A') !== 'N/A' ? unit.ammoLevel + '%' : 'N/A'}. SUMINISTROS: ${(unit.daysOfSupply ?? 'N/A') !== 'N/A' ? unit.daysOfSupply + ' días' : 'N/A'}. COMB.: ${(unit.fuelLevel ?? 'N/A') !== 'N/A' ? unit.fuelLevel + '%' : 'N/A'}.`;

  const missionSigla = unit.currentMission || MISSION_TYPES.find(m => m.sigla === "PATCTRL")?.sigla || "N/A";

  return {
    unitIdentification: unitIdentificationVal,
    locationDetails: locationDetailsVal,
    personnelStrength: personnelStrengthVal,
    unitSituation: unit.unitSituationType || UnitSituationINSITOP.ORGANICA, // Updated
    commanderDetails: commanderDetailsVal,
    missionType: missionSigla,
    vehiclesAndMotorcycles: vehiclesAndMotorcyclesVal,
    exdeGroupInfo: false,
    additionalRemarks: unitAdditionalRemarks,
  };
};


export const InsitopViewComponent: React.FC<InsitopViewProps> = ({
  operationalUnits,
}) => {

  const insitopDataForTable: UnitINSITOPDetail[] = operationalUnits.map(transformUnitToInsitopDetail);

  const handleExportCSV = () => {
    const today = new Date().toISOString().split('T')[0];
    const effectiveDateStr = window.prompt("Ingrese la fecha efectiva para el reporte INSITOP (YYYY-MM-DD) que se incluirá en el CSV:", today);

    if (effectiveDateStr) {
      const trimmedDate = effectiveDateStr.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        const dateParts = trimmedDate.split('-').map(Number);
        const year = dateParts[0];
        const month = dateParts[1];
        const day = dateParts[2];
        const dateObj = new Date(year, month - 1, day);

        if (dateObj.getFullYear() === year && dateObj.getMonth() === month - 1 && dateObj.getDate() === day) {
          const reportForCSV: INSITOPReport = {
            id: `SIMCOP_INSITOP_${Date.now()}`,
            reportTimestamp: Date.now(),
            effectiveReportDate: trimmedDate,
            unitEntries: insitopDataForTable,
            generatedBy: "SIMCOP AI System (Live View Export)",
          };
          exportInsitopToCSV(reportForCSV);
        } else {
          alert("Fecha inválida para el CSV. Por favor ingrese una fecha real en formato YYYY-MM-DD.");
        }
      } else {
        alert("Formato de fecha inválido para el CSV. Por favor use YYYY-MM-DD.");
      }
    }
  };

  const insitopTableHeaders = [
    "Unidad (SIMCOP)", "Tipo (SIMCOP)", "Cód. Compañía", "Cód. Pelotón",
    "Latitud DMS", "Longitud DMS", "Municipio", "Departamento",
    "Oficiales", "Subofic.", "SL Prof.", "SL Reg.", "SL Camp.", "SL Bach.",
    "Situación", "Grado Cmdte.", "Nombre Cmdte.", "Misión", "Precisiones"
  ];

  return (
    <div className="flex flex-col space-y-4 p-1">
      <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-700 pb-3 gap-2">
        <h2 className="text-lg md:text-2xl font-semibold text-gray-200 flex items-center">
          <TableCellsIcon className="w-6 h-6 md:w-7 md:h-7 mr-2 md:mr-3 text-green-400" />
          Cuadro de Situación de Tropas (INSITOP - Vista en Vivo)
        </h2>
        <button
          onClick={handleExportCSV}
          className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center"
          disabled={insitopDataForTable.length === 0}
        >
          <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
          Exportar Vista Actual a CSV
        </button>
      </div>

      <div className="flex-1 bg-gray-800 p-1 md:p-2 rounded-lg shadow-inner">
        {insitopDataForTable.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-lg text-center">No hay unidades operacionales para mostrar en el INSITOP.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700 text-xs">
              <thead className="bg-gray-750 sticky top-0 z-10">
                <tr>
                  {insitopTableHeaders.map(header => (
                    <th key={header} scope="col" className="px-2 py-1.5 md:px-3 md:py-2 text-left font-medium text-gray-300 tracking-wider whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {insitopDataForTable.map((unitDetail) => (
                  <tr key={unitDetail.unitIdentification.originalUnitId} className="hover:bg-gray-750 transition-colors">
                    <td className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-gray-200">{unitDetail.unitIdentification.originalUnitName}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-gray-300">{unitDetail.unitIdentification.originalUnitType}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-gray-300">{unitDetail.unitIdentification.companyCode || 'N/A'}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-gray-300">{unitDetail.unitIdentification.platoonCode || 'N/A'}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-gray-300">{unitDetail.locationDetails.latitudeDMS}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-gray-300">{unitDetail.locationDetails.longitudeDMS}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-gray-300 capitalize">{unitDetail.locationDetails.municipalityDANE.toLowerCase()}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-gray-300 capitalize">{unitDetail.locationDetails.departmentDANE.toLowerCase()}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-center text-gray-300">{unitDetail.personnelStrength.officers}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-center text-gray-300">{unitDetail.personnelStrength.NCOs}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-center text-gray-300">{unitDetail.personnelStrength.professionalSoldiers}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-center text-gray-300">{unitDetail.personnelStrength.regularSoldiers}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-center text-gray-300">{unitDetail.personnelStrength.peasantSoldiers}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-center text-gray-300">{unitDetail.personnelStrength.baccalaureateSoldiers}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-gray-300">{unitDetail.unitSituation}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-gray-300">{unitDetail.commanderDetails.rankAbbreviation}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-gray-300">{unitDetail.commanderDetails.fullName}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 whitespace-nowrap text-gray-300">{unitDetail.missionType}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 whitespace-normal text-gray-300 max-w-xs truncate hover:whitespace-normal hover:max-w-none" title={unitDetail.additionalRemarks}>{unitDetail.additionalRemarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 text-center pt-2">
        Esta tabla muestra la información de las unidades operacionales en tiempo real, formateada según las especificaciones INSITOP.
        Los campos marcados como "N/A", "DATO NO EN UNIDAD SIMCOP" o "POR DEFINIR" indican que la información no está directamente disponible en los datos de la unidad simulada y requerirían entrada manual en un sistema real.
      </p>
    </div>
  );
};
