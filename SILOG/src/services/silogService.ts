// ============================================================================
// SERVICIO PRINCIPAL SILOG: SISTEMA INTEGRADO DE LOGÍSTICA MILITAR
// Sincronización M2M con SIGEP (Personal) y SIMCOP (C2 Operacional)
// ============================================================================

import { 
  MilitaryWarehouse, 
  RationBatchItem, 
  BallisticArmorItem, 
  WeaponItem, 
  AmmunitionLotItem, 
  CommEquipmentItem, 
  SpecialOptronicsItem, 
  CombatSanityItem, 
  SoldierLogisticsProfile, 
  PlatoonCombatCapability 
} from '../types';

// Almacenes Centralizadores (BASPC) y Depósitos de Batallón concordantes con la Estructura de Fuerza SIMCOP
const SEED_WAREHOUSES: MilitaryWarehouse[] = [
  // --- 16ª BRIGADA (CASANARE - 8ª DIVISIÓN SIMCOP) ---
  {
    id: 'WH-BASPC-16',
    name: 'Almacén General BASPC No. 16 (Centralizador 16ª Brigada)',
    type: 'BASPC_CENTRAL',
    unitId: 'BASPC-16',
    unitName: 'Batallón de Apoyo y Servicios No. 16',
    brigadeId: '16-BRIG',
    department: 'CASANARE',
    municipality: 'YOPAL',
    location: { lat: 5.3380, lon: -72.4000 },
    commanderInCharge: 'TC. Andrés Villar',
    storekeeperName: 'SM. Gómez Silva Hernán',
    securityLevel: 'POLVORIN_BLINDADO',
    capacityStatus: 'OPTIMO'
  },
  {
    id: 'WH-BI-44',
    name: 'Depósito Táctico - Batallón de Infantería No. 44',
    type: 'BATALLON_DEPOSITO',
    unitId: 'BI-44',
    unitName: 'Batallón de Infantería No. 44 Ramón Nonato Pérez',
    brigadeId: '16-BRIG',
    department: 'CASANARE',
    municipality: 'TAURAMENA',
    location: { lat: 4.9520, lon: -72.7530 },
    commanderInCharge: 'TC. Gustavo Adolfo Rodríguez',
    storekeeperName: 'SS. Vargas Peña Milton',
    securityLevel: 'ALTA_SEGURIDAD',
    capacityStatus: 'DISPONIBLE'
  },
  {
    id: 'WH-GM-16',
    name: 'Depósito Táctico - Grupo de Caballería No. 16',
    type: 'BATALLON_DEPOSITO',
    unitId: 'GM-16',
    unitName: 'Grupo de Caballería Montado No. 16 Guías del Casanare',
    brigadeId: '16-BRIG',
    department: 'CASANARE',
    municipality: 'YOPAL',
    location: { lat: 5.3200, lon: -72.3800 },
    commanderInCharge: 'TC. José Ramón Pérez',
    storekeeperName: 'SV. Rentería Bravo Carlos',
    securityLevel: 'ALTA_SEGURIDAD',
    capacityStatus: 'DISPONIBLE'
  },
  {
    id: 'WH-BEING-16',
    name: 'Depósito Especial - Batallón de Ingenieros No. 16',
    type: 'BATALLON_DEPOSITO',
    unitId: 'BEING-16',
    unitName: 'Batallón de Ingenieros No. 16 Rafael Navas Pardo',
    brigadeId: '16-BRIG',
    department: 'CASANARE',
    municipality: 'YOPAL',
    location: { lat: 5.3350, lon: -72.3980 },
    commanderInCharge: 'TC. Óscar Marín',
    storekeeperName: 'SS. Belalcázar Jaime',
    securityLevel: 'POLVORIN_BLINDADO',
    capacityStatus: 'OPTIMO'
  },

  // --- 18ª BRIGADA (ARAUCA - 8ª DIVISIÓN SIMCOP) ---
  {
    id: 'WH-BI-24',
    name: 'Depósito Táctico - Batallón de Infantería No. 24',
    type: 'BATALLON_DEPOSITO',
    unitId: 'BI-24',
    unitName: 'Batallón de Infantería No. 24 Luis Tovar Lucero',
    brigadeId: '18-BRIG',
    department: 'ARAUCA',
    municipality: 'SARAVENA',
    location: { lat: 7.0320, lon: -71.2720 },
    commanderInCharge: 'TC. Juan Carlos Ortiz',
    storekeeperName: 'SS. Roa Martínez David',
    securityLevel: 'ALTA_SEGURIDAD',
    capacityStatus: 'CRITICO'
  },
  {
    id: 'WH-GM-18',
    name: 'Depósito Táctico - Grupo de Caballería No. 18',
    type: 'BATALLON_DEPOSITO',
    unitId: 'GM-18',
    unitName: 'Grupo de Caballería Mecanizado No. 18 Reveiz Pizarro',
    brigadeId: '18-BRIG',
    department: 'ARAUCA',
    municipality: 'TAME',
    location: { lat: 6.9530, lon: -71.8790 },
    commanderInCharge: 'TC. Edwin Torres',
    storekeeperName: 'SV. Pinzón Álvaro',
    securityLevel: 'ALTA_SEGURIDAD',
    capacityStatus: 'DISPONIBLE'
  },

  // --- 23ª BRIGADA (NARIÑO - 3ª DIVISIÓN SIMCOP) ---
  {
    id: 'WH-BASPC-23',
    name: 'Almacén General BASPC No. 23 "Pastos" (Centralizador 23ª Brigada)',
    type: 'BASPC_CENTRAL',
    unitId: 'BASPC-23',
    unitName: 'Batallón de Apoyo y Servicios para el Combate No. 23',
    brigadeId: 'BR23',
    department: 'NARIÑO',
    municipality: 'PASTO',
    location: { lat: 1.2136, lon: -77.2811 },
    commanderInCharge: 'TC. Mendoza Vargas Andrés',
    storekeeperName: 'SM. Beltrán Rivas Hernando',
    securityLevel: 'POLVORIN_BLINDADO',
    capacityStatus: 'OPTIMO'
  },
  {
    id: 'WH-BIP-09',
    name: 'Depósito Táctico de Campaña - Batallón de Infantería No. 9',
    type: 'BATALLON_DEPOSITO',
    unitId: 'BIP-09',
    unitName: 'Batallón de Infantería No. 9 "Batalla de Boyacá"',
    brigadeId: 'BR23',
    department: 'NARIÑO',
    municipality: 'IPIALES',
    location: { lat: 0.8284, lon: -77.6444 },
    commanderInCharge: 'MY. Castro Peña Gabriel',
    storekeeperName: 'SS. Quintero López Mauricio',
    securityLevel: 'ALTA_SEGURIDAD',
    capacityStatus: 'DISPONIBLE'
  },
  {
    id: 'WH-BASE-PATRULLA-SAMANIEGO',
    name: 'Armerillo y Depósito de Base Patrulla Avanzada "Samaniego"',
    type: 'BASE_PATRULLA',
    unitId: 'PEL-AURA-1',
    unitName: 'Pelotón Aura 1 (Compañía B - BIP 9)',
    brigadeId: 'BR23',
    department: 'NARIÑO',
    municipality: 'SAMANIEGO',
    location: { lat: 1.3385, lon: -77.5956 },
    commanderInCharge: 'TE. Álvarez Ríos Santiago',
    storekeeperName: 'CP. Rodríguez Benítez Edwin',
    securityLevel: 'CAMPAMENTO_AVANZADO',
    capacityStatus: 'DISPONIBLE'
  }
];

class SilogService {
  private static instance: SilogService;

  private warehouses: MilitaryWarehouse[] = [...SEED_WAREHOUSES];
  private weapons: WeaponItem[] = [];
  private ammoLots: AmmunitionLotItem[] = [];
  private armors: BallisticArmorItem[] = [];
  private rtsBatches: RationBatchItem[] = [];
  private comms: CommEquipmentItem[] = [];
  private optronics: SpecialOptronicsItem[] = [];
  private sanityItems: CombatSanityItem[] = [];
  private soldierKardexMap: Map<string, SoldierLogisticsProfile> = new Map();

  private constructor() {
    this.seedInitialInventory();
  }

  public static getInstance(): SilogService {
    if (!SilogService.instance) {
      SilogService.instance = new SilogService();
    }
    return SilogService.instance;
  }

  private seedInitialInventory() {
    // 1. Armamento Clase V
    this.weapons = [
      // Base Samaniego (Nariño)
      { id: 'W-001', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'CO-556-98124', model: 'GALIL_ACE_23_556', caliber: '5.56x45mm', status: 'ASIGNADO', roundsFiredEstimate: 1420, lastMaintenanceDate: '2026-08-15', assignedSoldierId: 'SLP-01' },
      { id: 'W-002', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'CO-556-98125', model: 'GALIL_ACE_23_556', caliber: '5.56x45mm', status: 'ASIGNADO', roundsFiredEstimate: 890, lastMaintenanceDate: '2026-09-02', assignedSoldierId: 'CP-02' },
      { id: 'W-003', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'CO-556-98126', model: 'GALIL_ACE_23_556', caliber: '5.56x45mm', status: 'ASIGNADO', roundsFiredEstimate: 1100, lastMaintenanceDate: '2026-07-20', assignedSoldierId: 'SS-03' },
      { id: 'W-004', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'CO-556-98127', model: 'GALIL_ACE_23_556', caliber: '5.56x45mm', status: 'ASIGNADO', roundsFiredEstimate: 650, lastMaintenanceDate: '2026-09-10', assignedSoldierId: 'TE-04' },
      { id: 'W-005', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'M60-762-4412', model: 'AMETRALLADORA_M60E4_762', caliber: '7.62x51mm', status: 'OPERATIVO', roundsFiredEstimate: 8400, lastMaintenanceDate: '2026-08-30' },
      { id: 'W-006', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'M60-762-4413', model: 'AMETRALLADORA_M60E4_762', caliber: '7.62x51mm', status: 'OPERATIVO', roundsFiredEstimate: 7200, lastMaintenanceDate: '2026-08-12' },
      { id: 'W-007', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'MGL-40-1092', model: 'LANZAGRANADAS_MGL_40MM', caliber: '40mm', status: 'OPERATIVO', roundsFiredEstimate: 140, lastMaintenanceDate: '2026-09-01' },
      { id: 'W-008', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'MOR-60-551', model: 'MORTERO_COMMANDO_60MM', caliber: '60mm', status: 'OPERATIVO', roundsFiredEstimate: 210, lastMaintenanceDate: '2026-07-15' },
      { id: 'W-009', warehouseId: 'WH-BIP-09', serialNumber: 'CO-556-10041', model: 'GALIL_ACE_23_556', caliber: '5.56x45mm', status: 'OPERATIVO', roundsFiredEstimate: 320, lastMaintenanceDate: '2026-09-20' },
      { id: 'W-010', warehouseId: 'WH-BASPC-23', serialNumber: 'M60-762-9901', model: 'AMETRALLADORA_M60E4_762', caliber: '7.62x51mm', status: 'EN_TALLER_BASPC', roundsFiredEstimate: 18200, lastMaintenanceDate: '2026-10-01' },

      // BI-44 (Tauramena - 16ª Brigada)
      { id: 'W-101', warehouseId: 'WH-BI-44', serialNumber: 'CO-556-44001', model: 'GALIL_ACE_23_556', caliber: '5.56x45mm', status: 'OPERATIVO', roundsFiredEstimate: 450, lastMaintenanceDate: '2026-09-18' },
      { id: 'W-102', warehouseId: 'WH-BI-44', serialNumber: 'CO-556-44002', model: 'GALIL_ACE_23_556', caliber: '5.56x45mm', status: 'OPERATIVO', roundsFiredEstimate: 780, lastMaintenanceDate: '2026-09-18' },
      { id: 'W-103', warehouseId: 'WH-BI-44', serialNumber: 'CO-556-44003', model: 'GALIL_SAR_556', caliber: '5.56x45mm', status: 'OPERATIVO', roundsFiredEstimate: 2300, lastMaintenanceDate: '2026-08-05' },
      { id: 'W-104', warehouseId: 'WH-BI-44', serialNumber: 'M60-762-1601', model: 'AMETRALLADORA_M60E4_762', caliber: '7.62x51mm', status: 'OPERATIVO', roundsFiredEstimate: 5100, lastMaintenanceDate: '2026-09-12' },
      { id: 'W-105', warehouseId: 'WH-BI-44', serialNumber: 'MGL-40-1601', model: 'LANZAGRANADAS_MGL_40MM', caliber: '40mm', status: 'OPERATIVO', roundsFiredEstimate: 85, lastMaintenanceDate: '2026-09-15' },
      { id: 'W-106', warehouseId: 'WH-BI-44', serialNumber: 'MOR-60-1601', model: 'MORTERO_COMMANDO_60MM', caliber: '60mm', status: 'OPERATIVO', roundsFiredEstimate: 120, lastMaintenanceDate: '2026-08-22' },

      // BASPC-16 (Almacén Centralizador Casanare)
      { id: 'W-201', warehouseId: 'WH-BASPC-16', serialNumber: 'CO-556-POLV-01', model: 'GALIL_ACE_23_556', caliber: '5.56x45mm', status: 'OPERATIVO', roundsFiredEstimate: 0, lastMaintenanceDate: '2026-10-01' },
      { id: 'W-202', warehouseId: 'WH-BASPC-16', serialNumber: 'CO-556-POLV-02', model: 'GALIL_ACE_23_556', caliber: '5.56x45mm', status: 'OPERATIVO', roundsFiredEstimate: 0, lastMaintenanceDate: '2026-10-01' },
      { id: 'W-203', warehouseId: 'WH-BASPC-16', serialNumber: 'M60-762-POLV-01', model: 'AMETRALLADORA_M60E4_762', caliber: '7.62x51mm', status: 'OPERATIVO', roundsFiredEstimate: 120, lastMaintenanceDate: '2026-09-29' },
      { id: 'W-204', warehouseId: 'WH-BASPC-16', serialNumber: 'M60-762-REP-02', model: 'AMETRALLADORA_M60E4_762', caliber: '7.62x51mm', status: 'EN_TALLER_BASPC', roundsFiredEstimate: 16500, lastMaintenanceDate: '2026-10-15' },

      // BI-24 (Saravena - 18ª Brigada Arauca)
      { id: 'W-301', warehouseId: 'WH-BI-24', serialNumber: 'CO-556-24001', model: 'GALIL_ACE_23_556', caliber: '5.56x45mm', status: 'OPERATIVO', roundsFiredEstimate: 1620, lastMaintenanceDate: '2026-09-05' },
      { id: 'W-302', warehouseId: 'WH-BI-24', serialNumber: 'M60-762-2401', model: 'AMETRALLADORA_M60E4_762', caliber: '7.62x51mm', status: 'OPERATIVO', roundsFiredEstimate: 9100, lastMaintenanceDate: '2026-09-10' }
    ];

    // 2. Municiones por Lote
    this.ammoLots = [
      // Base Samaniego
      { id: 'LOT-556-A', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', caliber: '5.56x45mm', lotNumber: 'INDUMIL-26-042', quantityRounds: 6300, packagingType: 'PROVEEDORES_DOTACION', manufacturingYear: 2026, securityClassification: 'DOTACION_COMBATE' },
      { id: 'LOT-762-B', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', caliber: '7.62x51mm', lotNumber: 'INDUMIL-25-118', quantityRounds: 2400, packagingType: 'CANANA_METALICA', manufacturingYear: 2025, securityClassification: 'DOTACION_COMBATE' },
      { id: 'LOT-40MM-C', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', caliber: '40mm_HE', lotNumber: 'IM-40-2025-9', quantityRounds: 48, packagingType: 'CAJA_MADERA', manufacturingYear: 2025, securityClassification: 'DOTACION_COMBATE' },
      { id: 'LOT-60MM-D', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', caliber: '60mm_MORTERO_HE', lotNumber: 'MORT-60-2024-2', quantityRounds: 24, packagingType: 'CAJA_MADERA', manufacturingYear: 2024, securityClassification: 'DOTACION_COMBATE' },
      
      // BASPC-23
      { id: 'LOT-556-BASPC', warehouseId: 'WH-BASPC-23', caliber: '5.56x45mm', lotNumber: 'INDUMIL-26-POLV', quantityRounds: 85000, packagingType: 'CAJA_MADERA', manufacturingYear: 2026, securityClassification: 'RESERVA_ESTRATEGICA' },

      // BI-44 (Casanare)
      { id: 'LOT-556-BI44', warehouseId: 'WH-BI-44', caliber: '5.56x45mm', lotNumber: 'IND-26-BI44-A', quantityRounds: 14200, packagingType: 'CAJA_MADERA', manufacturingYear: 2026, securityClassification: 'DOTACION_COMBATE' },
      { id: 'LOT-762-BI44', warehouseId: 'WH-BI-44', caliber: '7.62x51mm', lotNumber: 'IND-25-BI44-B', quantityRounds: 4800, packagingType: 'CANANA_METALICA', manufacturingYear: 2025, securityClassification: 'DOTACION_COMBATE' },
      { id: 'LOT-40MM-BI44', warehouseId: 'WH-BI-44', caliber: '40mm_HE', lotNumber: 'IM-40-BI44-1', quantityRounds: 96, packagingType: 'CAJA_MADERA', manufacturingYear: 2025, securityClassification: 'DOTACION_COMBATE' },
      { id: 'LOT-60MM-BI44', warehouseId: 'WH-BI-44', caliber: '60mm_MORTERO_HE', lotNumber: 'MORT-60-BI44', quantityRounds: 48, packagingType: 'CAJA_MADERA', manufacturingYear: 2024, securityClassification: 'DOTACION_COMBATE' },

      // BASPC-16 (Almacén Centralizador Casanare)
      { id: 'LOT-556-BASPC16', warehouseId: 'WH-BASPC-16', caliber: '5.56x45mm', lotNumber: 'IND-26-BASPC16-RES', quantityRounds: 120000, packagingType: 'CAJA_MADERA', manufacturingYear: 2026, securityClassification: 'RESERVA_ESTRATEGICA' },
      { id: 'LOT-762-BASPC16', warehouseId: 'WH-BASPC-16', caliber: '7.62x51mm', lotNumber: 'IND-25-BASPC16-RES', quantityRounds: 35000, packagingType: 'CAJA_MADERA', manufacturingYear: 2025, securityClassification: 'RESERVA_ESTRATEGICA' },

      // BI-24 (Arauca)
      { id: 'LOT-556-BI24', warehouseId: 'WH-BI-24', caliber: '5.56x45mm', lotNumber: 'IND-26-BI24-SARA', quantityRounds: 9800, packagingType: 'CAJA_MADERA', manufacturingYear: 2026, securityClassification: 'DOTACION_COMBATE' }
    ];

    // 3. Intendencia y Blindaje Balístico Clase II
    this.armors = [
      // Base Samaniego
      { id: 'AR-01', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'CH-IV-99120', armorType: 'CHALECO_BALISTICO_IV', size: 'L', frontPlateSerial: 'PL-CERAMIC-9912-F', rearPlateSerial: 'PL-CERAMIC-9912-R', manufacturingDate: '2024-05-10', expirationDate: '2029-05-10', status: 'ASIGNADO', assignedSoldierId: 'SLP-01' },
      { id: 'AR-02', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'CH-IV-99121', armorType: 'CHALECO_BALISTICO_IV', size: 'M', frontPlateSerial: 'PL-CERAMIC-9913-F', rearPlateSerial: 'PL-CERAMIC-9913-R', manufacturingDate: '2024-05-10', expirationDate: '2029-05-10', status: 'ASIGNADO', assignedSoldierId: 'CP-02' },
      { id: 'AR-03', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'CH-IV-99122', armorType: 'CHALECO_BALISTICO_IV', size: 'L', frontPlateSerial: 'PL-CERAMIC-9914-F', rearPlateSerial: 'PL-CERAMIC-9914-R', manufacturingDate: '2024-05-10', expirationDate: '2029-05-10', status: 'ASIGNADO', assignedSoldierId: 'SS-03' },
      { id: 'AR-04', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'CH-IV-99123', armorType: 'CHALECO_BALISTICO_IV', size: 'M', frontPlateSerial: 'PL-CERAMIC-9915-F', rearPlateSerial: 'PL-CERAMIC-9915-R', manufacturingDate: '2024-05-10', expirationDate: '2029-05-10', status: 'ASIGNADO', assignedSoldierId: 'TE-04' },
      { id: 'AR-05', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'CSK-MICH-4401', armorType: 'CASCO_KEVLAR_MICH', size: 'L', manufacturingDate: '2023-11-15', expirationDate: '2028-11-15', status: 'ASIGNADO', assignedSoldierId: 'SLP-01' },

      // BI-44 (Casanare)
      { id: 'AR-101', warehouseId: 'WH-BI-44', serialNumber: 'CH-IV-44010', armorType: 'CHALECO_BALISTICO_IV', size: 'L', frontPlateSerial: 'PL-CER-44010-F', rearPlateSerial: 'PL-CER-44010-R', manufacturingDate: '2025-01-10', expirationDate: '2030-01-10', status: 'OPERATIVO' },
      { id: 'AR-102', warehouseId: 'WH-BI-44', serialNumber: 'CH-IV-44011', armorType: 'CHALECO_BALISTICO_IV', size: 'M', frontPlateSerial: 'PL-CER-44011-F', rearPlateSerial: 'PL-CER-44011-R', manufacturingDate: '2025-01-10', expirationDate: '2030-01-10', status: 'OPERATIVO' },
      { id: 'AR-103', warehouseId: 'WH-BI-44', serialNumber: 'CSK-MICH-4410', armorType: 'CASCO_KEVLAR_MICH', size: 'L', manufacturingDate: '2024-06-15', expirationDate: '2029-06-15', status: 'OPERATIVO' },

      // BASPC-16 (Almacén Centralizador Casanare)
      { id: 'AR-201', warehouseId: 'WH-BASPC-16', serialNumber: 'CH-IV-BASPC-01', armorType: 'CHALECO_BALISTICO_IV', size: 'XL', frontPlateSerial: 'PL-CER-16001-F', rearPlateSerial: 'PL-CER-16001-R', manufacturingDate: '2025-03-20', expirationDate: '2030-03-20', status: 'OPERATIVO' },
      { id: 'AR-202', warehouseId: 'WH-BASPC-16', serialNumber: 'CSK-MICH-1601', armorType: 'CASCO_KEVLAR_MICH', size: 'M', manufacturingDate: '2025-02-10', expirationDate: '2030-02-10', status: 'OPERATIVO' }
    ];

    // 4. Alimentación y Raciones de Campaña Clase I
    this.rtsBatches = [
      // Base Samaniego
      { id: 'RAT-MRE-01', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', rationType: 'RACION_CAMPANA_MRE', menuNumber: 'Menú 02: Arroz Atollado con Pollo y Galletas', lotNumber: 'LOTE-MRE-COL-2026-03', expirationDate: '2028-03-30', quantityOnHand: 540, caloriesPerUnit: 3200, daysOfAutonomyEquivalent: 5 },
      { id: 'RAT-MRE-02', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', rationType: 'RACION_CAMPANA_MRE', menuNumber: 'Menú 05: Carne Desmechada con Frijoles', lotNumber: 'LOTE-MRE-COL-2026-04', expirationDate: '2028-04-15', quantityOnHand: 480, caloriesPerUnit: 3400, daysOfAutonomyEquivalent: 4 },
      { id: 'RAT-AGUA-01', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', rationType: 'PASTILLAS_PURIFICADORAS', menuNumber: 'Aquatabs Tácticas Militares (Tiras x 50)', lotNumber: 'AQUA-MED-2026', expirationDate: '2029-01-01', quantityOnHand: 320, caloriesPerUnit: 0, daysOfAutonomyEquivalent: 15 },

      // BI-44 (Casanare)
      { id: 'RAT-BI44-01', warehouseId: 'WH-BI-44', rationType: 'RACION_CAMPANA_MRE', menuNumber: 'Menú 01: Pollo con Vegetales y Granola', lotNumber: 'LOTE-MRE-BI44-01', expirationDate: '2028-06-30', quantityOnHand: 1800, caloriesPerUnit: 3100, daysOfAutonomyEquivalent: 12 },
      { id: 'RAT-BI44-AGUA', warehouseId: 'WH-BI-44', rationType: 'PASTILLAS_PURIFICADORAS', menuNumber: 'Aquatabs Purificadoras (Caja x 500)', lotNumber: 'AQUA-BI44-2026', expirationDate: '2029-05-15', quantityOnHand: 650, caloriesPerUnit: 0, daysOfAutonomyEquivalent: 25 },

      // BASPC-16
      { id: 'RAT-BASPC16-C1', warehouseId: 'WH-BASPC-16', rationType: 'RACION_CAMPANA_MRE', menuNumber: 'Surtido General de Raciones Campaña Casanare', lotNumber: 'LOTE-CENTRAL-BASPC16-2026', expirationDate: '2028-12-31', quantityOnHand: 22000, caloriesPerUnit: 3300, daysOfAutonomyEquivalent: 60 },

      // BASPC-23
      { id: 'RAT-BASPC-C1', warehouseId: 'WH-BASPC-23', rationType: 'RACION_CAMPANA_MRE', menuNumber: 'Surtido General de Raciones Campaña Ejército', lotNumber: 'LOTE-CENTRAL-BASPC-2026', expirationDate: '2028-12-31', quantityOnHand: 14500, caloriesPerUnit: 3300, daysOfAutonomyEquivalent: 45 }
    ];

    // 5. Comunicaciones Tácticas (S-6 / Clase VII)
    this.comms = [
      { id: 'COM-01', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'HF-152-9901', model: 'HARRIS_FALCON_III_PRC152', frequencyBand: 'VHF_UHF_SATCOM', status: 'ASIGNADO', batteryType: 'BB_2590_LITIO', assignedSoldierId: 'CP-02', cryptoKeyLoaded: true },
      { id: 'COM-02', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'HF-117-4410', model: 'HARRIS_MANPACK_PRC117G', frequencyBand: 'HF_TACTICO', status: 'OPERATIVO', batteryType: 'BB_2590_LITIO', cryptoKeyLoaded: true },
      { id: 'COM-03', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'MOT-APX-112', model: 'MOTOROLA_APX8000', frequencyBand: 'VHF_UHF_SATCOM', status: 'ASIGNADO', batteryType: 'LI_ION_RECARGABLE', assignedSoldierId: 'TE-04', cryptoKeyLoaded: false },
      { id: 'COM-04', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'REP-CERRO-DONA', model: 'REPETIDORA_TACTICA_VHF', frequencyBand: 'VHF_UHF_SATCOM', status: 'OPERATIVO', batteryType: 'PANEL_SOLAR_CAMPANA', cryptoKeyLoaded: true },
      { id: 'COM-05', warehouseId: 'WH-BASPC-23', serialNumber: 'HF-152-8809', model: 'HARRIS_FALCON_III_PRC152', frequencyBand: 'VHF_UHF_SATCOM', status: 'EN_REPARACION_S6', batteryType: 'BB_2590_LITIO', cryptoKeyLoaded: false },
      { id: 'COM-101', warehouseId: 'WH-BI-44', serialNumber: 'HF-152-4401', model: 'HARRIS_FALCON_III_PRC152', frequencyBand: 'VHF_UHF_SATCOM', status: 'OPERATIVO', batteryType: 'BB_2590_LITIO', cryptoKeyLoaded: true },
      { id: 'COM-201', warehouseId: 'WH-BASPC-16', serialNumber: 'HF-117-1601', model: 'HARRIS_MANPACK_PRC117G', frequencyBand: 'HF_TACTICO', status: 'OPERATIVO', batteryType: 'BB_2590_LITIO', cryptoKeyLoaded: true }
    ];

    // 6. Material Especial y Optoelectrónica
    this.optronics = [
      { id: 'OPT-01', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'NV-PVS14-8812', deviceType: 'VISOR_NOCTURNO_PVS14', generation: 'GEN_3_FOM_1800', status: 'ASIGNADO', batteryLevelPct: 95, assignedSoldierId: 'TE-04' },
      { id: 'OPT-02', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'NV-PVS14-8813', deviceType: 'VISOR_NOCTURNO_PVS14', generation: 'GEN_3_FOM_1800', status: 'ASIGNADO', batteryLevelPct: 88, assignedSoldierId: 'SLP-01' },
      { id: 'OPT-03', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'DRN-MAVIC-T01', deviceType: 'DRON_TACTICO_MAVIC3T', generation: 'TERMICO_640x512', status: 'OPERATIVO', batteryLevelPct: 100 },
      { id: 'OPT-04', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', serialNumber: 'EOD-VALLON-09', deviceType: 'DETECTOR_METALES_VALLON_EOD', generation: 'INDUCCION_PULSOS', status: 'OPERATIVO', batteryLevelPct: 92 },
      { id: 'OPT-101', warehouseId: 'WH-BI-44', serialNumber: 'NV-PVS14-4401', deviceType: 'VISOR_NOCTURNO_PVS14', generation: 'GEN_3_FOM_1800', status: 'OPERATIVO', batteryLevelPct: 90 },
      { id: 'OPT-102', warehouseId: 'WH-BI-44', serialNumber: 'DRN-MAVIC-T16', deviceType: 'DRON_TACTICO_MAVIC3T', generation: 'TERMICO_640x512', status: 'OPERATIVO', batteryLevelPct: 98 }
    ];

    // 7. Sanidad Militar y Trauma Clase VIII
    this.sanityItems = [
      { id: 'SAN-01', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', kitType: 'IFAK_INDIVIDUAL_TRAUMA', serialOrLotNumber: 'IFAK-COL-2026-99', tourniquetCatLot: 'CAT-GEN7-LOT26A', tourniquetExpiration: '2029-06-30', hemostaticGauzeUnits: 2, status: 'ASIGNADO', assignedSoldierId: 'SLP-01' },
      { id: 'SAN-02', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', kitType: 'IFAK_INDIVIDUAL_TRAUMA', serialOrLotNumber: 'IFAK-COL-2026-98', tourniquetCatLot: 'CAT-GEN7-LOT26A', tourniquetExpiration: '2029-06-30', hemostaticGauzeUnits: 2, status: 'ASIGNADO', assignedSoldierId: 'CP-02' },
      { id: 'SAN-03', warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO', kitType: 'MOCHILA_ENFERMERO_COMBATE', serialOrLotNumber: 'MEDPACK-COMBAT-01', tourniquetCatLot: 'CAT-GEN7-LOT26A', tourniquetExpiration: '2029-06-30', hemostaticGauzeUnits: 8, status: 'ASIGNADO', assignedSoldierId: 'SS-03' },
      { id: 'SAN-101', warehouseId: 'WH-BI-44', kitType: 'IFAK_INDIVIDUAL_TRAUMA', serialOrLotNumber: 'IFAK-BI44-2026-01', tourniquetCatLot: 'CAT-GEN7-LOT26B', tourniquetExpiration: '2029-08-30', hemostaticGauzeUnits: 2, status: 'OPERATIVO' },
      { id: 'SAN-201', warehouseId: 'WH-BASPC-16', kitType: 'MOCHILA_ENFERMERO_COMBATE', serialOrLotNumber: 'MEDPACK-BASPC-16', tourniquetCatLot: 'CAT-GEN7-LOT26A', tourniquetExpiration: '2029-06-30', hemostaticGauzeUnits: 12, status: 'OPERATIVO' }
    ];

    // 8. Kárdex inicial sincronizado con los soldados de SIGEP
    this.soldierKardexMap.set('SLP-01', {
      soldierId: 'SLP-01',
      fullName: 'SLP. Gómez Morales Carlos',
      rank: 'SLP',
      mosCode: 'FUSILERO',
      unitId: 'PEL-AURA-1',
      unitName: 'Pelotón Aura 1',
      assignedWeapon: this.weapons[0],
      magazinesCount: 5,
      ammunitionRounds: 175,
      assignedArmor: this.armors[0],
      helmetAssigned: this.armors[4],
      assignedNightVision: this.optronics[1],
      assignedIfak: this.sanityItems[0],
      rationsOnHand: 6,
      waterPurificationTablets: 20,
      assignmentDate: '2026-02-10',
      pazYSalvoStatus: 'PAZ_Y_SALVO'
    });

    this.soldierKardexMap.set('CP-02', {
      soldierId: 'CP-02',
      fullName: 'CP. Rodríguez Benítez Edwin',
      rank: 'CP',
      mosCode: 'COMUNICACIONES',
      unitId: 'PEL-AURA-1',
      unitName: 'Pelotón Aura 1',
      assignedWeapon: this.weapons[1],
      magazinesCount: 5,
      ammunitionRounds: 175,
      assignedArmor: this.armors[1],
      assignedCommRadio: this.comms[0],
      assignedIfak: this.sanityItems[1],
      rationsOnHand: 6,
      waterPurificationTablets: 20,
      assignmentDate: '2026-03-01',
      pazYSalvoStatus: 'PAZ_Y_SALVO'
    });

    this.soldierKardexMap.set('SS-03', {
      soldierId: 'SS-03',
      fullName: 'SS. Ospina Vargas Julián',
      rank: 'SS',
      mosCode: 'ENFERMERO_COMBATE',
      unitId: 'PEL-AURA-1',
      unitName: 'Pelotón Aura 1',
      assignedWeapon: this.weapons[2],
      magazinesCount: 5,
      ammunitionRounds: 175,
      assignedArmor: this.armors[2],
      assignedIfak: this.sanityItems[2],
      rationsOnHand: 6,
      waterPurificationTablets: 20,
      assignmentDate: '2026-01-15',
      pazYSalvoStatus: 'PAZ_Y_SALVO'
    });

    this.soldierKardexMap.set('TE-04', {
      soldierId: 'TE-04',
      fullName: 'TE. Álvarez Ríos Santiago',
      rank: 'TE',
      mosCode: 'OFICIAL_OPERACIONES',
      unitId: 'PEL-AURA-1',
      unitName: 'Pelotón Aura 1',
      assignedWeapon: this.weapons[3],
      magazinesCount: 5,
      ammunitionRounds: 175,
      assignedArmor: this.armors[3],
      assignedCommRadio: this.comms[2],
      assignedNightVision: this.optronics[0],
      rationsOnHand: 6,
      waterPurificationTablets: 20,
      assignmentDate: '2026-04-05',
      pazYSalvoStatus: 'PAZ_Y_SALVO'
    });
  }

  public getWarehouses(): MilitaryWarehouse[] {
    return this.warehouses;
  }

  public getWeapons(warehouseId?: string): WeaponItem[] {
    return warehouseId ? this.weapons.filter(w => w.warehouseId === warehouseId) : this.weapons;
  }

  public getAmmoLots(warehouseId?: string): AmmunitionLotItem[] {
    return warehouseId ? this.ammoLots.filter(a => a.warehouseId === warehouseId) : this.ammoLots;
  }

  public getArmors(warehouseId?: string): BallisticArmorItem[] {
    return warehouseId ? this.armors.filter(a => a.warehouseId === warehouseId) : this.armors;
  }

  public getRations(warehouseId?: string): RationBatchItem[] {
    return warehouseId ? this.rtsBatches.filter(r => r.warehouseId === warehouseId) : this.rtsBatches;
  }

  public getComms(warehouseId?: string): CommEquipmentItem[] {
    return warehouseId ? this.comms.filter(c => c.warehouseId === warehouseId) : this.comms;
  }

  public getOptronics(warehouseId?: string): SpecialOptronicsItem[] {
    return warehouseId ? this.optronics.filter(o => o.warehouseId === warehouseId) : this.optronics;
  }

  public getSanityItems(warehouseId?: string): CombatSanityItem[] {
    return warehouseId ? this.sanityItems.filter(s => s.warehouseId === warehouseId) : this.sanityItems;
  }

  // ==========================================================================
  // OPERACIONES DE ALTA / ENTRADA DE MATERIAL A ALMACENES (MUTACIONES)
  // ==========================================================================

  public addWeapon(item: Omit<WeaponItem, 'id'>): WeaponItem {
    const newItem: WeaponItem = {
      ...item,
      id: `W-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`
    };
    this.weapons.unshift(newItem);
    return newItem;
  }

  public addAmmoLot(item: Omit<AmmunitionLotItem, 'id'>): AmmunitionLotItem {
    const newItem: AmmunitionLotItem = {
      ...item,
      id: `LOT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`
    };
    this.ammoLots.unshift(newItem);
    return newItem;
  }

  public addArmor(item: Omit<BallisticArmorItem, 'id'>): BallisticArmorItem {
    const newItem: BallisticArmorItem = {
      ...item,
      id: `AR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`
    };
    this.armors.unshift(newItem);
    return newItem;
  }

  public addRationBatch(item: Omit<RationBatchItem, 'id'>): RationBatchItem {
    const newItem: RationBatchItem = {
      ...item,
      id: `RAT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`
    };
    this.rtsBatches.unshift(newItem);
    return newItem;
  }

  public addCommEquipment(item: Omit<CommEquipmentItem, 'id'>): CommEquipmentItem {
    const newItem: CommEquipmentItem = {
      ...item,
      id: `COM-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`
    };
    this.comms.unshift(newItem);
    return newItem;
  }

  public addSpecialOptronics(item: Omit<SpecialOptronicsItem, 'id'>): SpecialOptronicsItem {
    const newItem: SpecialOptronicsItem = {
      ...item,
      id: `OPT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`
    };
    this.optronics.unshift(newItem);
    return newItem;
  }

  public addCombatSanity(item: Omit<CombatSanityItem, 'id'>): CombatSanityItem {
    const newItem: CombatSanityItem = {
      ...item,
      id: `SAN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`
    };
    this.sanityItems.unshift(newItem);
    return newItem;
  }

  public deleteItem(category: string, id: string): boolean {
    switch (category) {
      case 'CLASE_V_ARMA':
        this.weapons = this.weapons.filter(w => w.id !== id);
        return true;
      case 'CLASE_V_MUNICION':
        this.ammoLots = this.ammoLots.filter(a => a.id !== id);
        return true;
      case 'CLASE_II':
        this.armors = this.armors.filter(a => a.id !== id);
        return true;
      case 'CLASE_I':
        this.rtsBatches = this.rtsBatches.filter(r => r.id !== id);
        return true;
      case 'COMUNICACIONES':
        this.comms = this.comms.filter(c => c.id !== id);
        return true;
      case 'ESPECIAL':
        this.optronics = this.optronics.filter(o => o.id !== id);
        return true;
      case 'CLASE_VIII':
        this.sanityItems = this.sanityItems.filter(s => s.id !== id);
        return true;
      default:
        return false;
    }
  }

  public getSoldierKardex(soldierId: string): SoldierLogisticsProfile | undefined {
    return this.soldierKardexMap.get(soldierId);
  }

  public getAllKardexProfiles(): SoldierLogisticsProfile[] {
    return Array.from(this.soldierKardexMap.values());
  }

  /**
   * Genera el Certificado de Paz y Salvo Logístico para traslados de SIGEP
   */
  public generatePazYSalvo(soldierId: string): {
    pazYSalvo: boolean;
    pendingItems: string[];
    certificateNumber?: string;
    message: string;
  } {
    const profile = this.soldierKardexMap.get(soldierId);
    if (!profile) {
      return {
        pazYSalvo: true,
        pendingItems: [],
        certificateNumber: `PAZ-SALVO-AUTO-${Date.now()}`,
        message: 'Militar sin material bélico o fiscal a cargo. Paz y Salvo concedido.'
      };
    }

    const pending: string[] = [];
    if (profile.assignedWeapon && profile.assignedWeapon.status === 'ASIGNADO') {
      pending.push(`Fusil ${profile.assignedWeapon.model} (Serial: ${profile.assignedWeapon.serialNumber})`);
    }
    if (profile.assignedArmor && profile.assignedArmor.status === 'ASIGNADO') {
      pending.push(`Chaleco Balístico IV (Serial: ${profile.assignedArmor.serialNumber})`);
    }
    if (profile.assignedCommRadio && profile.assignedCommRadio.status === 'ASIGNADO') {
      pending.push(`Radio Táctico ${profile.assignedCommRadio.model} (Serial: ${profile.assignedCommRadio.serialNumber})`);
    }
    if (profile.assignedNightVision && profile.assignedNightVision.status === 'ASIGNADO') {
      pending.push(`Visor Nocturno PVS-14 (Serial: ${profile.assignedNightVision.serialNumber})`);
    }

    if (pending.length > 0) {
      return {
        pazYSalvo: false,
        pendingItems: pending,
        message: `DEVOLUCIÓN PENDIENTE: El militar tiene ${pending.length} elementos a cargo en el armerillo/depósito. Debe reintegrar el material antes de la entrega formal de puesto.`
      };
    }

    const certNum = `PAZ-SALVO-LOG-${soldierId}-${Date.now().toString().slice(-6)}`;
    profile.pazYSalvoStatus = 'PAZ_Y_SALVO';

    return {
      pazYSalvo: true,
      pendingItems: [],
      certificateNumber: certNum,
      message: `Paz y Salvo Oficial emitido (${certNum}). Todo el material fue reintegrado al Almacén.`
    };
  }

  /**
   * CÁLCULO DE LA CAPACIDAD REAL DE FUEGO Y PODER DE COMBATE DEL PELOTÓN PARA SIMCOP
   */
  public calculatePlatoonCombatCapability(platoonId: string = 'PEL-AURA-1'): PlatoonCombatCapability {
    const warehouseWeapons = this.weapons.filter(w => w.warehouseId === 'WH-BASE-PATRULLA-SAMANIEGO');
    const warehouseAmmo = this.ammoLots.filter(a => a.warehouseId === 'WH-BASE-PATRULLA-SAMANIEGO');
    const warehouseRations = this.rtsBatches.filter(r => r.warehouseId === 'WH-BASE-PATRULLA-SAMANIEGO');
    const warehouseComms = this.comms.filter(c => c.warehouseId === 'WH-BASE-PATRULLA-SAMANIEGO');
    const warehouseOptronics = this.optronics.filter(o => o.warehouseId === 'WH-BASE-PATRULLA-SAMANIEGO');

    const rifles556 = warehouseWeapons.filter(w => w.caliber === '5.56x45mm' && (w.status === 'OPERATIVO' || w.status === 'ASIGNADO')).length;
    const machineGuns762 = warehouseWeapons.filter(w => w.caliber === '7.62x51mm' && (w.status === 'OPERATIVO' || w.status === 'ASIGNADO')).length;
    const grenadeLaunchers40mm = warehouseWeapons.filter(w => w.caliber === '40mm' && (w.status === 'OPERATIVO' || w.status === 'ASIGNADO')).length;
    const mortars60mm = warehouseWeapons.filter(w => w.caliber === '60mm' && (w.status === 'OPERATIVO' || w.status === 'ASIGNADO')).length;

    const totalRounds556 = warehouseAmmo.filter(a => a.caliber === '5.56x45mm').reduce((acc, curr) => acc + curr.quantityRounds, 0);
    const totalRounds762 = warehouseAmmo.filter(a => a.caliber === '7.62x51mm').reduce((acc, curr) => acc + curr.quantityRounds, 0);
    const totalMortarBombs60mm = warehouseAmmo.filter(a => a.caliber === '60mm_MORTERO_HE').reduce((acc, curr) => acc + curr.quantityRounds, 0);

    const totalSoldiers = 36;
    const pvs14Count = warehouseOptronics.filter(o => o.deviceType === 'VISOR_NOCTURNO_PVS14' && o.status !== 'BAJA_TECNICA').length;
    const nightVisionPct = Math.min(100, Math.round((pvs14Count / (totalSoldiers || 1)) * 100));

    const readyComms = warehouseComms.filter(c => c.status === 'OPERATIVO' || c.status === 'ASIGNADO');
    const commScore = readyComms.some(c => c.model.includes('HARRIS') && c.cryptoKeyLoaded) ? 100 : 65;

    const totalRationsCount = warehouseRations.filter(r => r.rationType === 'RACION_CAMPANA_MRE').reduce((acc, curr) => acc + curr.quantityOnHand, 0);
    const rationsDays = Math.max(1, Math.round(totalRationsCount / (totalSoldiers * 3)));

    // Minutos de fuego continuo doctrinal (5.56 a 30 disparos/min por fusil; M60 a 100 disparos/min)
    const sustainedMins = Math.round((totalRounds556 / Math.max(1, rifles556 * 35)) * 10);

    const daytimeReadiness = Math.min(100, Math.round(((rifles556 / 32) * 40) + ((machineGuns762 / 2) * 30) + ((totalRounds556 / 5000) * 30)));
    const nightReadiness = Math.min(100, Math.round((daytimeReadiness * 0.4) + (nightVisionPct * 0.6)));
    const overallFirepower = Math.round((daytimeReadiness * 0.6) + (nightReadiness * 0.4));

    let advisory = '';
    if (nightVisionPct < 50) {
      advisory = `⚠️ CAPACIDAD NOCTURNA DEGRADADA (${nightVisionPct}% optrónicos PVS-14). Dispone de 2 ametralladoras M-60 y ${totalRounds556} cartuchos 5.56. Autonomía Clase I: ${rationsDays} días de raciones MRE. Enlace C2 Harris 100% operativo.`;
    } else {
      advisory = `CAPACIDAD DE COMBATE ÓPTIMA (${overallFirepower}%). Pleno poder de fuego diurno y nocturno. Autonomía de combate asegurada para ${rationsDays} días.`;
    }

    return {
      platoonId,
      platoonName: 'Pelotón Aura 1 (Compañía B - BIP 9)',
      totalSoldiers,
      operationalWeapons: {
        rifles556,
        machineGuns762,
        grenadeLaunchers40mm,
        mortars60mm
      },
      totalRounds556,
      totalRounds762,
      totalMortarBombs60mm,
      nightVisionAvailabilityPct: nightVisionPct,
      commCoverageScore: commScore,
      rationsAutonomyDays: rationsDays,
      sustainedFireMinutes: sustainedMins,
      overallFirepowerIndex: overallFirepower,
      daytimeReadinessPct: daytimeReadiness,
      nightReadinessPct: nightReadiness,
      tacticalAdvisoryForSimcop: advisory
    };
  }
}

export const silogService = SilogService.getInstance();
