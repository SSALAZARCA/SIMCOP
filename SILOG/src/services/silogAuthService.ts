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
    description: 'Auditoría y Supervisión de Estado Mayor: Mando logístico y emisión de Paz y Salvo. NO realiza ingreso físico de bodega.'
  },
  {
    user: {
      id: 'USR-ALM-BASPC16',
      username: 'almacen.baspc16',
      fullName: 'Hernán Gómez Silva',
      rank: 'SM.',
      role: 'ALMACENISTA_CENTRAL_BASPC',
      roleTitle: 'Almacenista Centralizador - BASPC No. 16',
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
    description: 'Almacén Centralizador BASPC: Ingresa material nuevo al polvorín y lo asigna/despacha a los Batallones (BI-44, GM-16) o Estado Mayor.'
  },
  {
    user: {
      id: 'USR-BOD-BI44',
      username: 'bodeguero.bi44',
      fullName: 'Milton Vargas Peña',
      rank: 'SS.',
      role: 'BODEGUERO_BATALLON',
      roleTitle: 'Bodeguero / Almacenista Depósito Táctico - BI-44',
      unit: 'BI-44',
      unitName: 'Batallón de Infantería No. 44 Ramón Nonato Pérez',
      assignedUnitId: 'BI-44',
      assignedEchelon: 'BATALLON',
      warehouseId: 'WH-BI-44',
      allowedWarehouseIds: ['WH-BI-44'],
      securityClearance: 'SECRETO',
      militaryId: 'CC-1085293401'
    },
    passwordHash: 'bodega2026',
    description: 'Bodega de Batallón: Ingresa material del batallón y lo asigna o mueve internamente entre las Compañías (Cía A, B, C).'
  },
  {
    user: {
      id: 'USR-CIA-BI44',
      username: 'encargado.cia.bi44',
      fullName: 'Carlos Eduardo Morales',
      rank: 'CT.',
      role: 'ENCARGADO_COMPANIA',
      roleTitle: 'Comandante de Compañía A "Vencedores" - BI-44',
      unit: 'BI-44',
      unitName: 'Compañía A - BI-44 Ramón Nonato Pérez',
      assignedUnitId: 'BI-44',
      assignedEchelon: 'COMPANIA',
      warehouseId: 'WH-BI-44',
      allowedWarehouseIds: ['WH-BI-44'],
      securityClearance: 'RESERVADO',
      militaryId: 'CC-1087452119'
    },
    passwordHash: 'compania2026',
    description: 'Compañía / Pelotón: Toma el material asignado a la compañía y lo asigna individualmente a cada combatiente en el Kárdex SIGEP.'
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
    description: 'Estado Mayor de Brigada Arauca: Supervisión de depósitos tácticos en Saravena y Tame.'
  },
  {
    user: {
      id: 'USR-BOD-BI24',
      username: 'bodeguero.bi24',
      fullName: 'David Roa Martínez',
      rank: 'SS.',
      role: 'BODEGUERO_BATALLON',
      roleTitle: 'Bodeguero Depósito Táctico - BI-24 Saravena',
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
    description: 'Depósito Táctico Saravena: Ingresa material y distribuye hacia las compañías del BI-24.'
  },
  {
    user: {
      id: 'USR-CIA-BI24',
      username: 'encargado.cia.bi24',
      fullName: 'Javier Parra Rueda',
      rank: 'TE.',
      role: 'ENCARGADO_COMPANIA',
      roleTitle: 'Comandante de Compañía B - BI-24 Saravena',
      unit: 'BI-24',
      unitName: 'Compañía B - BI-24 Luis Tovar Lucero',
      assignedUnitId: 'BI-24',
      assignedEchelon: 'COMPANIA',
      warehouseId: 'WH-BI-24',
      allowedWarehouseIds: ['WH-BI-24'],
      securityClearance: 'RESERVADO',
      militaryId: 'CC-1090334811'
    },
    passwordHash: 'compania2026',
    description: 'Línea de Operaciones Arauca: Asigna fusiles, chalecos e IFAKs individualmente a los soldados de su compañía.'
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
    description: 'Estado Mayor de Brigada Nariño: Mando logístico sobre BASPC-23, BIP-09 y base patrulla Samaniego.'
  },
  {
    user: {
      id: 'USR-ALM-BASPC23',
      username: 'almacen.baspc23',
      fullName: 'Hernando Beltrán Rivas',
      rank: 'SM.',
      role: 'ALMACENISTA_CENTRAL_BASPC',
      roleTitle: 'Almacenista Centralizador - BASPC No. 23 "Pastos"',
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
    description: 'Almacén Centralizador de Pasto: Ingresa armamento y suministros y los asigna/despacha al BIP-09 o a la 23ª Brigada.'
  },
  {
    user: {
      id: 'USR-BOD-BIP09',
      username: 'bodeguero.bip09',
      fullName: 'Mauricio Quintero López',
      rank: 'SS.',
      role: 'BODEGUERO_BATALLON',
      roleTitle: 'Bodeguero Depósito Táctico - BIP No. 9',
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
    description: 'Depósito Táctico Ipiales: Ingresa material del batallón y lo abastece a las compañías y bases de patrulla avanzadas.'
  },
  {
    user: {
      id: 'USR-FURRIEL-AURA1',
      username: 'furriel.aura1',
      fullName: 'Edwin Rodríguez Benítez',
      rank: 'CP.',
      role: 'FURRIEL_PELOTON',
      roleTitle: 'Furriel / Encargado de Pelotón Aura 1',
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
    description: 'Base Patrulla Samaniego: Asigna individualmente el fusil, chaleco balístico, radio y raciones a cada soldado en combate.'
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

  /**
   * Genera el token dinámico militar de 6 dígitos basado en ventana de tiempo de 30s
   */
  public get2FATokenForUser(userId: string): { code: string; secondsRemaining: number; phoneMasked: string; terminalId: string } {
    const timeWindow = Math.floor(Date.now() / 30000);
    const secondsRemaining = 30 - (Math.floor(Date.now() / 1000) % 30);
    
    // Algoritmo determinístico para simulación de TOTP militar estándar
    let hash = 0;
    const seed = `${userId}-${timeWindow}-JELOG-MILITARY-2FA`;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash);
    const code = (positiveHash % 900000 + 100000).toString();

    const lastDigits = userId.replace(/\D/g, '').slice(-2) || '74';
    return {
      code,
      secondsRemaining: secondsRemaining === 0 ? 30 : secondsRemaining,
      phoneMasked: `+57 312 ••• ••${lastDigits}`,
      terminalId: `RADIO-C2-JELOG-${userId.slice(-6)}`
    };
  }

  /**
   * Paso 1: Validación de Credenciales Primarias
   */
  public validatePrimaryCredentials(usernameOrId: string, passwordPlain: string): { success: boolean; user?: SilogUser; message?: string } {
    const rawInput = usernameOrId.trim();
    const cleanUsername = rawInput.toLowerCase();
    const normalizedDigits = cleanUsername.replace(/^cc-?/i, '');

    const entry = PREDEFINED_USERS.find(
      p => p.user.username.toLowerCase() === cleanUsername || 
           p.user.militaryId.toLowerCase() === cleanUsername ||
           p.user.militaryId.toLowerCase().replace(/^cc-?/i, '') === normalizedDigits ||
           p.user.id.toLowerCase() === cleanUsername
    );

    if (!entry) {
      return { success: false, message: 'Usuario o Cédula Militar no registrado en la base de datos de personal logístico (JELOG).' };
    }

    if (entry.passwordHash !== passwordPlain.trim()) {
      return { success: false, message: 'Contraseña o clave criptográfica incorrecta. Verifique sus credenciales institucionales.' };
    }

    return { success: true, user: entry.user };
  }

  /**
   * Paso 2: Validación del Segundo Factor (2FA / OTP Criptográfico)
   */
  public verify2FA(
    userId: string, 
    otpCode: string, 
    method: 'TOTP_TACTICO' | 'RADIO_SMS' | 'TOKEN_FISICO' = 'TOTP_TACTICO'
  ): { success: boolean; user?: SilogUser; message?: string } {
    const cleanCode = otpCode.trim().replace(/\s+/g, '');
    const entry = PREDEFINED_USERS.find(p => p.user.id === userId);

    if (!entry) {
      return { success: false, message: 'Sesión de autenticación expirada. Vuelva a ingresar sus credenciales.' };
    }

    const currentToken = this.get2FATokenForUser(userId);

    // Valida contra el TOTP dinámico actual, clave maestra de contingencia '770412' o '123456'
    const isValid = cleanCode === currentToken.code || cleanCode === '770412' || cleanCode === '123456';

    if (!isValid) {
      return { 
        success: false, 
        message: 'Código de seguridad 2FA inválido o expirado. Verifique el token de su terminal militar.' 
      };
    }

    const authenticatedUser: SilogUser = {
      ...entry.user,
      twoFactorVerified: true,
      twoFactorMethod: method
    };

    this.currentUser = authenticatedUser;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentUser));
    } catch {
      // ignore storage error
    }

    return { success: true, user: this.currentUser };
  }

  public login(usernameOrId: string, passwordPlain: string): { success: boolean; user?: SilogUser; message?: string } {
    const check = this.validatePrimaryCredentials(usernameOrId, passwordPlain);
    if (!check.success || !check.user) {
      return check;
    }

    this.currentUser = {
      ...check.user,
      twoFactorVerified: true,
      twoFactorMethod: 'TOTP_TACTICO'
    };
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

  // ==========================================================================
  // REGLAS DOCTRINALES DE PERMISOS (CADENA DE CUSTODIA MILITAR)
  // ==========================================================================

  /**
   * 1. INGRESO DE MATERIAL (ALTA EN ALMACÉN):
   * Solo Almacenistas y Bodegueros pueden ingresar material nuevo al sistema.
   * Oficiales de Estado Mayor (S-4) o mandos tácticos NO ingresan material.
   */
  public canIngestMaterial(user?: SilogUser | null): boolean {
    const u = user || this.getCurrentUser();
    if (!u) return false;
    return [
      'ALMACENISTA_CENTRAL_BASPC',
      'BODEGUERO_BATALLON',
      'ALMACENISTA_CLASE_V',
      'ALMACENISTA_CLASE_II_I',
      'OFICIAL_COMUNICACIONES_S6',
      'OFICIAL_SANIDAD_S8'
    ].includes(u.role);
  }

  /**
   * 2. DESPACHO CENTRALIZADOR BASPC:
   * Solo los Almacenistas Centralizadores de los BASPC pueden asignar y transferir
   * material desde el almacén central hacia los Batallones o unidades de Estado Mayor (Brigada/División).
   */
  public canDispatchFromBaspc(user?: SilogUser | null): boolean {
    const u = user || this.getCurrentUser();
    if (!u) return false;
    return u.role === 'ALMACENISTA_CENTRAL_BASPC' || u.role === 'COMANDANTE_BASPC';
  }

  /**
   * 3. ASIGNACIÓN INTERNA DE BATALLÓN HACIA COMPAÑÍAS:
   * Solo los Bodegueros de Batallón pueden asignar o mover este material
   * dentro de las Compañías orgánicas del batallón.
   */
  public canAssignToCompany(user?: SilogUser | null): boolean {
    const u = user || this.getCurrentUser();
    if (!u) return false;
    return [
      'BODEGUERO_BATALLON',
      'ALMACENISTA_CLASE_V',
      'ALMACENISTA_CLASE_II_I'
    ].includes(u.role);
  }

  /**
   * 4. ASIGNACIÓN INDIVIDUAL NOMINAL AL COMBATIENTE:
   * Solo los Encargados de las Compañías y Pelotones (Comandante de Cía, Furriel de Pelotón)
   * pueden asignar el material individualmente a cada hombre (cédula en Kárdex SIGEP).
   */
  public canAssignToSoldier(user?: SilogUser | null): boolean {
    const u = user || this.getCurrentUser();
    if (!u) return false;
    return u.role === 'ENCARGADO_COMPANIA' || u.role === 'FURRIEL_PELOTON';
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
      case 'ALMACENISTA_CENTRAL_BASPC':
        return ['PANORAMA', 'ALMACENES', 'CLASE_V', 'CLASE_II', 'CLASE_I', 'CLASE_VIII', 'COMUNICACIONES', 'ESPECIAL', 'PODER_FUEGO'].includes(tabId);
      case 'BODEGUERO_BATALLON':
        return ['PANORAMA', 'ALMACENES', 'CLASE_V', 'CLASE_II', 'CLASE_I', 'CLASE_VIII', 'COMUNICACIONES', 'ESPECIAL', 'KARDEX_PERSONAL', 'PODER_FUEGO'].includes(tabId);
      case 'ENCARGADO_COMPANIA':
      case 'FURRIEL_PELOTON':
        return ['PANORAMA', 'CLASE_V', 'CLASE_II', 'CLASE_I', 'COMUNICACIONES', 'ESPECIAL', 'CLASE_VIII', 'KARDEX_PERSONAL', 'PODER_FUEGO'].includes(tabId);
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
