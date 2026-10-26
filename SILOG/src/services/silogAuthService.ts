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
  {
    user: {
      id: 'USR-S4-001',
      username: 's4.br23',
      fullName: 'Mario Alberto Rodríguez Cárdenas',
      rank: 'TC.',
      role: 'OFICIAL_S4',
      roleTitle: 'Oficial S-4 (Jefe Estado Mayor de Logística)',
      unit: 'BR23',
      unitName: 'Vigésima Tercera Brigada',
      securityClearance: 'SECRETO',
      militaryId: 'CC-98451204'
    },
    passwordHash: 'logistica2026',
    description: 'Acceso total a todos los almacenes de la Brigada, aprobación de Paz y Salvo y cálculo de poder de combate'
  },
  {
    user: {
      id: 'USR-BASPC-002',
      username: 'cmdte.baspc23',
      fullName: 'Juan Pablo Valderrama Mora',
      rank: 'MY.',
      role: 'COMANDANTE_BASPC',
      roleTitle: 'Comandante BASPC No. 23',
      unit: 'BASPC23',
      unitName: 'Batallón de Apoyo y Servicios No. 23',
      securityClearance: 'SECRETO',
      militaryId: 'CC-79812450'
    },
    passwordHash: 'baspc2026',
    description: 'Control de Almacenes Centralizadores de Brigada, redistribución y convoyes de abastecimiento'
  },
  {
    user: {
      id: 'USR-ARMAS-003',
      username: 'almacen.armas',
      fullName: 'Wilson Caicedo Mina',
      rank: 'SS.',
      role: 'ALMACENISTA_CLASE_V',
      roleTitle: 'Custodio de Armamento y Municiones (Clase V)',
      unit: 'BIP23',
      unitName: 'Batallón de Infantería No. 23 Vencedores',
      warehouseId: 'WH-BIP-DEP-01',
      securityClearance: 'SECRETO',
      militaryId: 'CC-1085293401'
    },
    passwordHash: 'armamento2026',
    description: 'Custodio del Depósito de Armamento: Fusiles, ametralladoras, morteros y lotes de munición'
  },
  {
    user: {
      id: 'USR-INT-004',
      username: 'almacen.intendencia',
      fullName: 'Edwin Morales Beltrán',
      rank: 'SV.',
      role: 'ALMACENISTA_CLASE_II_I',
      roleTitle: 'Custodio de Intendencia y Subsistencias (Clase I y II)',
      unit: 'BIP23',
      unitName: 'Batallón de Infantería No. 23 Vencedores',
      warehouseId: 'WH-BIP-DEP-01',
      securityClearance: 'RESERVADO',
      militaryId: 'CC-1087452119'
    },
    passwordHash: 'intendencia2026',
    description: 'Custodio de Chalecos Nivel IV, cascos de Kevlar con seriales de placas cerámicas y raciones MRE'
  },
  {
    user: {
      id: 'USR-S6-005',
      username: 'comunicaciones.s6',
      fullName: 'Andrés Felipe Pardo Gómez',
      rank: 'CT.',
      role: 'OFICIAL_COMUNICACIONES_S6',
      roleTitle: 'Oficial S-6 (Comunicaciones y Criptografía)',
      unit: 'BR23',
      unitName: 'Vigésima Tercera Brigada',
      securityClearance: 'ULTRASECRETO',
      militaryId: 'CC-1014892033'
    },
    passwordHash: 'comms2026',
    description: 'Gestión de Radios Harris Falcon III, Motorola APX, baterías BB-2590 y llaves criptográficas'
  },
  {
    user: {
      id: 'USR-S8-006',
      username: 'sanidad.s8',
      fullName: 'Alejandro Gómez Echeverry',
      rank: 'TE.',
      role: 'OFICIAL_SANIDAD_S8',
      roleTitle: 'Oficial S-8 (Sanidad Militar Táctica)',
      unit: 'BASPC23',
      unitName: 'Batallón de Apoyo y Servicios No. 23',
      securityClearance: 'RESERVADO',
      militaryId: 'CC-1032849102'
    },
    passwordHash: 'sanidad2026',
    description: 'Custodio de Kits de Trauma IFAK, torniquetes CAT certificados con lote y mochilas de combate'
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
