// ============================================================================
// SERVICIO DE AUTENTICACIÓN Y CONTROL DE ACCESO MILITAR (SILOG AUTH)
// Jefatura de Estado Mayor de Logística (JELOG) / S-4 Ejército Nacional
// ============================================================================

import { SilogUser, SilogUserRole } from '../types';

interface PredefinedSilogCredential {
  user: SilogUser;
  passwordHash: string; // Contraseña plana para demostración táctica
  description: string;
}

const PREDEFINED_USERS: PredefinedSilogCredential[] = [
  // ==========================================================================
  // DÉCIMA SEXTA BRIGADA (16-BRIG - CASANARE / 8ª DIVISIÓN SIMCOP)
  // ==========================================================================
  {
    user: {
      id: 'USR-S4-BR16',
      username: 's4.brig16',
      fullName: 'Mario Alberto Rodríguez Cárdenas',
      rank: 'TC.',
      role: 'OFICIAL_S4',
      roleTitle: 'Oficial S-4 (Jefe Estado Mayor Logístico 16ª Brigada)',
      unit: '16-BRIG',
      unitName: 'Décima Sexta Brigada - Casanare',
      assignedUnitId: '16-BRIG',
      assignedEchelon: 'BRIGADA',
      allowedWarehouseIds: ['WH-BASPC-16', 'WH-BI-44', 'WH-GM-16', 'WH-BEING-16'],
      securityClearance: 'SECRETO',
      militaryId: 'CC-98451204'
    },
    passwordHash: 'logistica2026',
    description: 'Estado Mayor de Brigada: Mando y control logístico general sobre BASPC-16, BI-44, GM-16 y BEING-16'
  },
  {
    user: {
      id: 'USR-BASPC-16',
      username: 'cmdte.baspc16',
      fullName: 'Andrés Villar Hernández',
      rank: 'TC.',
      role: 'COMANDANTE_BASPC',
      roleTitle: 'Comandante BASPC No. 16 (Almacén Centralizador)',
      unit: 'BASPC-16',
      unitName: 'Batallón de Apoyo y Servicios No. 16',
      assignedUnitId: 'BASPC-16',
      assignedEchelon: 'BATALLON',
      warehouseId: 'WH-BASPC-16',
      allowedWarehouseIds: ['WH-BASPC-16'],
      securityClearance: 'SECRETO',
      militaryId: 'CC-79812450'
    },
    passwordHash: 'baspc2026',
    description: 'Almacén Centralizador de Casanare: Reserva de guerra de Brigada, polvorines y convoyes de reabastecimiento'
  },
  {
    user: {
      id: 'USR-ARMAS-BI44',
      username: 'almacen.armas.bi44',
      fullName: 'Milton Vargas Peña',
      rank: 'SS.',
      role: 'ALMACENISTA_CLASE_V',
      roleTitle: 'Custodio Armamento y Municiones - BI-44',
      unit: 'BI-44',
      unitName: 'Batallón de Infantería No. 44 Ramón Nonato Pérez',
      assignedUnitId: 'BI-44',
      assignedEchelon: 'BATALLON',
      warehouseId: 'WH-BI-44',
      allowedWarehouseIds: ['WH-BI-44'],
      securityClearance: 'SECRETO',
      militaryId: 'CC-1085293401'
    },
    passwordHash: 'armamento2026',
    description: 'Depósito Táctico Tauramena: Fusiles Galil, ametralladoras M-60 y lotes de munición del BI-44'
  },
  {
    user: {
      id: 'USR-INT-BI44',
      username: 'almacen.int.bi44',
      fullName: 'Carlos Rentería Bravo',
      rank: 'SV.',
      role: 'ALMACENISTA_CLASE_II_I',
      roleTitle: 'Custodio Intendencia y Subsistencias - BI-44',
      unit: 'BI-44',
      unitName: 'Batallón de Infantería No. 44 Ramón Nonato Pérez',
      assignedUnitId: 'BI-44',
      assignedEchelon: 'BATALLON',
      warehouseId: 'WH-BI-44',
      allowedWarehouseIds: ['WH-BI-44'],
      securityClearance: 'RESERVADO',
      militaryId: 'CC-1087452119'
    },
    passwordHash: 'intendencia2026',
    description: 'Chalecos Nivel IV, cascos Kevlar con placas cerámicas y raciones MRE para las compañías del BI-44'
  },

  // ==========================================================================
  // DÉCIMA OCTAVA BRIGADA (18-BRIG - ARAUCA / 8ª DIVISIÓN SIMCOP)
  // ==========================================================================
  {
    user: {
      id: 'USR-S4-BR18',
      username: 's4.brig18',
      fullName: 'César Augusto Karan',
      rank: 'CR.',
      role: 'OFICIAL_S4',
      roleTitle: 'Oficial S-4 (Jefe Estado Mayor 18ª Brigada)',
      unit: '18-BRIG',
      unitName: 'Décima Octava Brigada - Arauca',
      assignedUnitId: '18-BRIG',
      assignedEchelon: 'BRIGADA',
      allowedWarehouseIds: ['WH-BI-24', 'WH-GM-18'],
      securityClearance: 'SECRETO',
      militaryId: 'CC-1014892033'
    },
    passwordHash: 'arauca2026',
    description: 'Estado Mayor de Brigada Arauca: Supervisión de depósitos tácticos en Saravena y Tame'
  },
  {
    user: {
      id: 'USR-ARMAS-BI24',
      username: 'almacen.armas.bi24',
      fullName: 'David Roa Martínez',
      rank: 'SS.',
      role: 'ALMACENISTA_CLASE_V',
      roleTitle: 'Custodio Armamento - BI-24 Saravena',
      unit: 'BI-24',
      unitName: 'Batallón de Infantería No. 24 Luis Tovar Lucero',
      assignedUnitId: 'BI-24',
      assignedEchelon: 'BATALLON',
      warehouseId: 'WH-BI-24',
      allowedWarehouseIds: ['WH-BI-24'],
      securityClearance: 'SECRETO',
      militaryId: 'CC-1032849102'
    },
    passwordHash: 'saravena2026',
    description: 'Depósito Táctico Saravena: Gestión exclusiva de material y municiones del BI-24'
  },

  // ==========================================================================
  // VIGÉSIMA TERCERA BRIGADA (BR23 - NARIÑO / 3ª DIVISIÓN SIMCOP)
  // ==========================================================================
  {
    user: {
      id: 'USR-S4-BR23',
      username: 's4.br23',
      fullName: 'Andrés Mendoza Vargas',
      rank: 'TC.',
      role: 'OFICIAL_S4',
      roleTitle: 'Oficial S-4 (Jefe Estado Mayor 23ª Brigada)',
      unit: 'BR23',
      unitName: 'Vigésima Tercera Brigada - Nariño',
      assignedUnitId: 'BR23',
      assignedEchelon: 'BRIGADA',
      allowedWarehouseIds: ['WH-BASPC-23', 'WH-BIP-09', 'WH-BASE-PATRULLA-SAMANIEGO'],
      securityClearance: 'SECRETO',
      militaryId: 'CC-98451299'
    },
    passwordHash: 'logistica2026',
    description: 'Estado Mayor de Brigada Nariño: Mando logístico sobre BASPC-23, BIP-09 y base patrulla Samaniego'
  },
  {
    user: {
      id: 'USR-BASPC-23',
      username: 'cmdte.baspc23',
      fullName: 'Juan Pablo Valderrama Mora',
      rank: 'MY.',
      role: 'COMANDANTE_BASPC',
      roleTitle: 'Comandante BASPC No. 23 "Pastos"',
      unit: 'BASPC-23',
      unitName: 'Batallón de Apoyo y Servicios No. 23',
      assignedUnitId: 'BASPC-23',
      assignedEchelon: 'BATALLON',
      warehouseId: 'WH-BASPC-23',
      allowedWarehouseIds: ['WH-BASPC-23'],
      securityClearance: 'SECRETO',
      militaryId: 'CC-79812451'
    },
    passwordHash: 'baspc2026',
    description: 'Almacén Centralizador de Pasto: Reserva estratégica de Brigada y convoyes hacia la cordillera y costa'
  },
  {
    user: {
      id: 'USR-BIP-09',
      username: 'almacen.bip09',
      fullName: 'Mauricio Quintero López',
      rank: 'SS.',
      role: 'ALMACENISTA_CLASE_V',
      roleTitle: 'Custodio Depósito Táctico - BIP No. 9',
      unit: 'BIP-09',
      unitName: 'Batallón de Infantería No. 9 Batalla de Boyacá',
      assignedUnitId: 'BIP-09',
      assignedEchelon: 'BATALLON',
      warehouseId: 'WH-BIP-09',
      allowedWarehouseIds: ['WH-BIP-09'],
      securityClearance: 'SECRETO',
      militaryId: 'CC-1085293499'
    },
    passwordHash: 'ipiales2026',
    description: 'Depósito Táctico de Ipiales: Control de armamento y suministros del Batallón de Infantería No. 9'
  },
  {
    user: {
      id: 'USR-FURRIEL-AURA1',
      username: 'furriel.aura1',
      fullName: 'Edwin Rodríguez Benítez',
      rank: 'CP.',
      role: 'ALMACENISTA_CLASE_V',
      roleTitle: 'Furriel Armerillo Avanzado - Pelotón Aura 1',
      unit: 'PEL-AURA-1',
      unitName: 'Pelotón Aura 1 (Compañía B - BIP 9)',
      assignedUnitId: 'PEL-AURA-1',
      assignedEchelon: 'PELOTON',
      warehouseId: 'WH-BASE-PATRULLA-SAMANIEGO',
      allowedWarehouseIds: ['WH-BASE-PATRULLA-SAMANIEGO'],
      securityClearance: 'RESERVADO',
      militaryId: 'CC-1087452900'
    },
    passwordHash: 'samaniego2026',
    description: 'Armerillo de Campaña Samaniego: Control directo del kárdex individual de los 36 soldados en combate'
  }
];

const STORAGE_KEY = 'silog_military_authenticated_user_v1';

class SilogAuthService {
  private static instance: SilogAuthService;
  private currentUser: SilogUser | null = null;

  private constructor() {
    this.restoreSession();
  }

  public static getInstance(): SilogAuthService {
    if (!SilogAuthService.instance) {
      SilogAuthService.instance = new SilogAuthService();
    }
    return SilogAuthService.instance;
  }

  private restoreSession(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("No se pudo restaurar la sesión de SILOG:", e);
      this.currentUser = null;
    }
  }

  public getPredefinedAccounts(): { user: SilogUser; passwordPlain: string; description: string }[] {
    return PREDEFINED_USERS.map(p => ({
      user: p.user,
      passwordPlain: p.passwordHash,
      description: p.description
    }));
  }

  public login(usernameOrId: string, passwordPlain: string): { success: boolean; user?: SilogUser; message?: string } {
    const cleanUsername = usernameOrId.trim().toLowerCase();
    const entry = PREDEFINED_USERS.find(
      p => p.user.username.toLowerCase() === cleanUsername || 
           p.user.militaryId.toLowerCase() === cleanUsername ||
           p.user.id.toLowerCase() === cleanUsername
    );

    if (!entry) {
      return { success: false, message: 'Usuario no registrado en la base de datos de personal logístico (JELOG).' };
    }

    if (entry.passwordHash !== passwordPlain.trim()) {
      return { success: false, message: 'Contraseña o código criptográfico incorrecto. Verifique sus credenciales.' };
    }

    this.currentUser = entry.user;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentUser));
    } catch {
      // ignore storage error
    }

    return { success: true, user: this.currentUser };
  }

  public loginAsPredefined(userId: string): SilogUser | null {
    const entry = PREDEFINED_USERS.find(p => p.user.id === userId);
    if (entry) {
      this.currentUser = entry.user;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentUser));
      } catch {}
      return this.currentUser;
    }
    return null;
  }

  public logout(): void {
    this.currentUser = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  public getCurrentUser(): SilogUser | null {
    if (!this.currentUser) {
      this.restoreSession();
    }
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  public getSimcopBrigades(): { id: string; name: string }[] {
    return [
      { id: 'ALL', name: 'Todas las Unidades de la Estructura de Fuerza' },
      { id: '16-BRIG', name: 'Décima Sexta Brigada (Casanare / 8ª División)' },
      { id: '18-BRIG', name: 'Décima Octava Brigada (Arauca / 8ª División)' },
      { id: 'BR23', name: 'Vigésima Tercera Brigada (Nariño / 3ª División)' }
    ];
  }

  /**
   * Filtra los almacenes que el usuario tiene autorización para ver u operar
   * según su posición jerárquica en la Estructura de Fuerza de SIMCOP
   */
  public getAllowedWarehouses(user: SilogUser, allWarehouses: any[]): any[] {
    if (!user.allowedWarehouseIds || user.allowedWarehouseIds.length === 0) {
      return allWarehouses;
    }
    const filtered = allWarehouses.filter(w => user.allowedWarehouseIds.includes(w.id));
    return filtered.length > 0 ? filtered : allWarehouses;
  }

  /**
   * Determina si el rol tiene acceso a una pestaña específica de SILOG
   */
  public hasTabPermission(role: SilogUserRole, tabId: string): boolean {
    if (role === 'OFICIAL_S4' || role === 'COMANDANTE_BASPC') {
      return true; // Acceso general de Estado Mayor y Mando Logístico
    }

    switch (role) {
      case 'ALMACENISTA_CLASE_V':
        return ['PANORAMA', 'ALMACENES', 'CLASE_V', 'KARDEX_PERSONAL', 'PODER_FUEGO'].includes(tabId);
      case 'ALMACENISTA_CLASE_II_I':
        return ['PANORAMA', 'ALMACENES', 'CLASE_II', 'CLASE_I', 'KARDEX_PERSONAL'].includes(tabId);
      case 'OFICIAL_COMUNICACIONES_S6':
        return ['PANORAMA', 'ALMACENES', 'COMUNICACIONES', 'ESPECIAL', 'KARDEX_PERSONAL', 'PODER_FUEGO'].includes(tabId);
      case 'OFICIAL_SANIDAD_S8':
        return ['PANORAMA', 'ALMACENES', 'CLASE_VIII', 'KARDEX_PERSONAL'].includes(tabId);
      default:
        return false;
    }
  }
}

export const silogAuthService = SilogAuthService.getInstance();
