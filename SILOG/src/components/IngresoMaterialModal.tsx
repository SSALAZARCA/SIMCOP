import React, { useState } from 'react';
import { MilitaryWarehouse } from '../types';
import { silogService } from '../services/silogService';
import { silogAuthService } from '../services/silogAuthService';

interface IngresoMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: MilitaryWarehouse[];
  currentWarehouseId: string;
  initialCategory?: string;
  onSuccess: (message: string) => void;
}

export const IngresoMaterialModal: React.FC<IngresoMaterialModalProps> = ({
  isOpen,
  onClose,
  warehouses,
  currentWarehouseId,
  initialCategory = 'CLASE_V_ARMA',
  onSuccess
}) => {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(currentWarehouseId);
  const [category, setCategory] = useState<string>(initialCategory);

  // Form states - Armas
  const [weaponModel, setWeaponModel] = useState<string>('GALIL_ACE_23_556');
  const [weaponSerial, setWeaponSerial] = useState<string>('');
  const [weaponCaliber, setWeaponCaliber] = useState<string>('5.56x45mm');
  const [weaponStatus, setWeaponStatus] = useState<any>('OPERATIVO');

  // Form states - Munición
  const [ammoCaliber, setAmmoCaliber] = useState<string>('5.56x45mm');
  const [ammoLot, setAmmoLot] = useState<string>('');
  const [ammoQuantity, setAmmoQuantity] = useState<number>(1000);
  const [ammoPkg, setAmmoPkg] = useState<any>('CAJA_MADERA');
  const [ammoClass, setAmmoClass] = useState<any>('DOTACION_COMBATE');

  // Form states - Intendencia (Clase II)
  const [armorType, setArmorType] = useState<any>('CHALECO_BALISTICO_IV');
  const [armorSerial, setArmorSerial] = useState<string>('');
  const [frontPlateSerial, setFrontPlateSerial] = useState<string>('');
  const [rearPlateSerial, setRearPlateSerial] = useState<string>('');
  const [armorSize, setArmorSize] = useState<any>('L');
  const [armorExpYears, setArmorExpYears] = useState<number>(5);

  // Form states - Raciones (Clase I)
  const [rationType, setRationType] = useState<any>('RACION_CAMPANA_MRE');
  const [rationMenu, setRationMenu] = useState<string>('Menú 03: Carne con Arroz y Vegetales');
  const [rationLot, setRationLot] = useState<string>('');
  const [rationQuantity, setRationQuantity] = useState<number>(300);
  const [rationCalories, setRationCalories] = useState<number>(3200);

  // Form states - Comunicaciones (S-6)
  const [commModel, setCommModel] = useState<any>('HARRIS_FALCON_III_PRC152');
  const [commSerial, setCommSerial] = useState<string>('');
  const [commBand, setCommBand] = useState<any>('VHF_UHF_SATCOM');
  const [commBattery, setCommBattery] = useState<any>('BB_2590_LITIO');
  const [cryptoLoaded, setCryptoLoaded] = useState<boolean>(true);

  // Form states - Optrónica (Clase VII)
  const [optronicType, setOptronicType] = useState<any>('VISOR_NOCTURNO_PVS14');
  const [optronicSerial, setOptronicSerial] = useState<string>('');
  const [optronicGen, setOptronicGen] = useState<string>('GEN_3_FOM_1800');
  const [batteryPct, setBatteryPct] = useState<number>(100);

  // Form states - Sanidad (Clase VIII)
  const [sanType, setSanType] = useState<any>('IFAK_INDIVIDUAL_TRAUMA');
  const [sanLot, setSanLot] = useState<string>('');
  const [tourniquetLot, setTourniquetLot] = useState<string>('');
  const [gauzeUnits, setGauzeUnits] = useState<number>(2);

  if (!isOpen) return null;

  const targetWh = warehouses.find(w => w.id === selectedWarehouseId) || warehouses[0];

  const handleGenerateSerial = () => {
    const randomHex = Math.floor(Math.random() * 89999 + 10000);
    if (category === 'CLASE_V_ARMA') {
      setWeaponSerial(`CO-${weaponCaliber.includes('5.56') ? '556' : '762'}-${randomHex}`);
    } else if (category === 'CLASE_V_MUNICION') {
      setAmmoLot(`INDUMIL-26-L${randomHex}`);
    } else if (category === 'CLASE_II') {
      setArmorSerial(`CH-IV-${randomHex}`);
      setFrontPlateSerial(`PL-CER-${randomHex}-F`);
      setRearPlateSerial(`PL-CER-${randomHex}-R`);
    } else if (category === 'CLASE_I') {
      setRationLot(`LOTE-MRE-${randomHex}`);
    } else if (category === 'COMUNICACIONES') {
      setCommSerial(`HF-${randomHex}`);
    } else if (category === 'ESPECIAL') {
      setOptronicSerial(`NV-PVS14-${randomHex}`);
    } else if (category === 'CLASE_VIII') {
      setSanLot(`IFAK-COL-${randomHex}`);
      setTourniquetLot(`CAT-G7-${randomHex}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const currentUser = silogAuthService.getCurrentUser();
    if (!silogAuthService.canIngestMaterial(currentUser)) {
      alert("ACCIÓN DENEGADA: Según la doctrina logística militar, el ingreso de nuevo material físico es potestad exclusiva de los Almacenistas y Bodegueros autorizados.");
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    try {
      if (category === 'CLASE_V_ARMA') {
        const serial = weaponSerial.trim() || `CO-556-${Date.now().toString().slice(-5)}`;
        silogService.addWeapon({
          warehouseId: selectedWarehouseId,
          serialNumber: serial,
          model: weaponModel as any,
          caliber: weaponCaliber as any,
          status: weaponStatus,
          roundsFiredEstimate: 0,
          lastMaintenanceDate: today
        });
        onSuccess(`Armamento registrado: ${weaponModel} (Serial: ${serial}) ingresado al depósito.`);
      } else if (category === 'CLASE_V_MUNICION') {
        const lot = ammoLot.trim() || `IND-26-L${Date.now().toString().slice(-4)}`;
        silogService.addAmmoLot({
          warehouseId: selectedWarehouseId,
          caliber: ammoCaliber as any,
          lotNumber: lot,
          quantityRounds: Number(ammoQuantity),
          packagingType: ammoPkg,
          manufacturingYear: 2026,
          securityClassification: ammoClass
        });
        onSuccess(`Lote de munición ingresado: ${ammoQuantity.toLocaleString()} tiros de ${ammoCaliber} (Lote: ${lot}).`);
      } else if (category === 'CLASE_II') {
        const serial = armorSerial.trim() || `CH-IV-${Date.now().toString().slice(-5)}`;
        const expDate = new Date();
        expDate.setFullYear(expDate.getFullYear() + armorExpYears);
        silogService.addArmor({
          warehouseId: selectedWarehouseId,
          serialNumber: serial,
          armorType: armorType,
          size: armorSize,
          frontPlateSerial: frontPlateSerial || `PL-F-${Date.now().toString().slice(-4)}`,
          rearPlateSerial: rearPlateSerial || `PL-R-${Date.now().toString().slice(-4)}`,
          manufacturingDate: today,
          expirationDate: expDate.toISOString().split('T')[0],
          status: 'OPERATIVO'
        });
        onSuccess(`Intendencia registrada: ${armorType} (Serial: ${serial}) con placas balísticas.`);
      } else if (category === 'CLASE_I') {
        const lot = rationLot.trim() || `MRE-26-${Date.now().toString().slice(-4)}`;
        const expDate = new Date();
        expDate.setFullYear(expDate.getFullYear() + 2);
        silogService.addRationBatch({
          warehouseId: selectedWarehouseId,
          rationType: rationType,
          menuNumber: rationMenu,
          lotNumber: lot,
          expirationDate: expDate.toISOString().split('T')[0],
          quantityOnHand: Number(rationQuantity),
          caloriesPerUnit: Number(rationCalories),
          daysOfAutonomyEquivalent: Math.round(Number(rationQuantity) / 36)
        });
        onSuccess(`Subsistencias ingresadas: ${rationQuantity} raciones (${rationMenu}, Lote: ${lot}).`);
      } else if (category === 'COMUNICACIONES') {
        const serial = commSerial.trim() || `HF-${Date.now().toString().slice(-5)}`;
        silogService.addCommEquipment({
          warehouseId: selectedWarehouseId,
          serialNumber: serial,
          model: commModel,
          frequencyBand: commBand,
          status: 'OPERATIVO',
          batteryType: commBattery,
          cryptoKeyLoaded: cryptoLoaded
        });
        onSuccess(`Equipo de Comunicaciones ingresado: ${commModel} (Serial: ${serial}).`);
      } else if (category === 'ESPECIAL') {
        const serial = optronicSerial.trim() || `NV-${Date.now().toString().slice(-5)}`;
        silogService.addSpecialOptronics({
          warehouseId: selectedWarehouseId,
          serialNumber: serial,
          deviceType: optronicType,
          generation: optronicGen as any,
          status: 'OPERATIVO',
          batteryLevelPct: Number(batteryPct)
        });
        onSuccess(`Material Especial ingresado: ${optronicType} (Serial: ${serial}).`);
      } else if (category === 'CLASE_VIII') {
        const lot = sanLot.trim() || `IFAK-${Date.now().toString().slice(-5)}`;
        const expDate = new Date();
        expDate.setFullYear(expDate.getFullYear() + 3);
        silogService.addCombatSanity({
          warehouseId: selectedWarehouseId,
          kitType: sanType,
          serialOrLotNumber: lot,
          tourniquetCatLot: tourniquetLot || 'CAT-GEN7-2026',
          tourniquetExpiration: expDate.toISOString().split('T')[0],
          hemostaticGauzeUnits: Number(gauzeUnits),
          status: 'OPERATIVO'
        });
        onSuccess(`Sanidad militar ingresada: ${sanType} (Lote: ${lot}).`);
      }

      onClose();
    } catch (err: any) {
      alert(`Error al registrar material: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-[#0b0f17] border border-amber-500/40 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        
        {/* Encabezado */}
        <div className="bg-slate-900/90 border-b border-slate-800 p-4 md:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-xl text-amber-300">
              📦
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white uppercase tracking-wider">
                  Alta de Material e Ingreso a Almacén
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ENTRADA FISCAL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Registro oficial con seriales, lotes y asignación según la Estructura de Fuerza
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            ✕
          </button>
        </div>

        {/* Formulario con Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          
          {/* Selector de Almacén Destino */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <label className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center justify-between">
              <span>🏢 Almacén o Depósito de Destino (Estructura SIMCOP):</span>
              <span className="text-[10px] font-mono text-slate-400">
                Unidad: {targetWh.unitName}
              </span>
            </label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 text-white text-xs rounded-xl p-3 focus:outline-none"
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id} className="bg-slate-950 text-slate-200">
                  {w.name} ({w.municipality}, {w.department}) — [{w.unitId}]
                </option>
              ))}
            </select>
          </div>

          {/* Pestañas de Clase Doctrinal */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Seleccionar Clase de Abastecimiento Doctrinal:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
              {[
                { id: 'CLASE_V_ARMA', label: '🔫 Armamento', short: 'Clase V' },
                { id: 'CLASE_V_MUNICION', label: '🎯 Municiones', short: 'Clase V' },
                { id: 'CLASE_II', label: '🛡️ Intendencia', short: 'Clase II' },
                { id: 'CLASE_I', label: '🍞 Raciones', short: 'Clase I' },
                { id: 'COMUNICACIONES', label: '📻 Comunicaciones', short: 'S-6' },
                { id: 'ESPECIAL', label: '👁️ Optrónica', short: 'Clase VII' },
                { id: 'CLASE_VIII', label: '🩹 Sanidad', short: 'Clase VIII' },
              ].map(tab => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setCategory(tab.id)}
                  className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                    category === tab.id
                      ? 'bg-amber-600/30 border-amber-500 text-amber-300 font-bold shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs">{tab.label}</span>
                  <span className="text-[9px] font-mono text-slate-500">{tab.short}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Campos dinámicos por clase */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
            
            {/* 1. CLASE V: ARMAMENTO */}
            {category === 'CLASE_V_ARMA' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase">
                    Datos del Armamento Individual o de Apoyo
                  </h4>
                  <button
                    type="button"
                    onClick={handleGenerateSerial}
                    className="text-[10px] font-mono px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                  >
                    🎲 Generar Serial Táctico
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Modelo de Arma:</label>
                    <select
                      value={weaponModel}
                      onChange={(e) => {
                        setWeaponModel(e.target.value);
                        if (e.target.value.includes('556')) setWeaponCaliber('5.56x45mm');
                        if (e.target.value.includes('762') || e.target.value.includes('M60')) setWeaponCaliber('7.62x51mm');
                        if (e.target.value.includes('MGL')) setWeaponCaliber('40mm');
                        if (e.target.value.includes('MORTERO')) setWeaponCaliber('60mm');
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="GALIL_ACE_23_556">Fusil Galil ACE 23 (5.56mm)</option>
                      <option value="GALIL_AR_556">Fusil Galil AR (5.56mm)</option>
                      <option value="AMETRALLADORA_M60E4_762">Ametralladora M-60 E4 (7.62mm)</option>
                      <option value="AMETRALLADORA_NEGEV_556">Ametralladora Ligera Negev (5.56mm)</option>
                      <option value="LANZAGRANADAS_MGL_40MM">Lanzagranadas MGL 40mm (6 Tiros)</option>
                      <option value="MORTERO_COMMANDO_60MM">Mortero Tipo Comando 60mm</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Número de Serial Militar:</label>
                    <input
                      type="text"
                      value={weaponSerial}
                      onChange={(e) => setWeaponSerial(e.target.value)}
                      placeholder="Ej: CO-556-98401"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white uppercase font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Calibre:</label>
                    <input
                      type="text"
                      value={weaponCaliber}
                      disabled
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Estado de Operatividad:</label>
                    <select
                      value={weaponStatus}
                      onChange={(e) => setWeaponStatus(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="OPERATIVO">Operativo (Listo para Entrega)</option>
                      <option value="RESERVA_ESTRATEGICA">Reserva Estratégica</option>
                      <option value="EN_TALLER_BASPC">En Mantenimiento de Armamento</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CLASE V: MUNICIONES */}
            {category === 'CLASE_V_MUNICION' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase">
                    Registro de Lotes de Munición y Explosivos
                  </h4>
                  <button
                    type="button"
                    onClick={handleGenerateSerial}
                    className="text-[10px] font-mono px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  >
                    🎲 Generar Lote
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Calibre / Munición:</label>
                    <select
                      value={ammoCaliber}
                      onChange={(e) => setAmmoCaliber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="5.56x45mm">5.56×45mm (Fusil Galil / ACE)</option>
                      <option value="7.62x51mm">7.62×51mm (Ametralladora M-60)</option>
                      <option value="40mm_HE">40mm HE (Granada Alto Explosivo)</option>
                      <option value="60mm_MORTERO_HE">60mm HE (Bomba Mortero)</option>
                      <option value="9x19mm">9×19mm Parabellum (Pistola)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Número de Lote (Indumil):</label>
                    <input
                      type="text"
                      value={ammoLot}
                      onChange={(e) => setAmmoLot(e.target.value)}
                      placeholder="Ej: INDUMIL-26-088"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono uppercase"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Cantidad de Cartuchos/Tiros:</label>
                    <input
                      type="number"
                      value={ammoQuantity}
                      onChange={(e) => setAmmoQuantity(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono"
                      min={1}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Presentación de Empaque:</label>
                    <select
                      value={ammoPkg}
                      onChange={(e) => setAmmoPkg(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="CAJA_MADERA">Caja de Madera / Militar Sellada</option>
                      <option value="CANANA_METALICA">Canana Metálica x 200 Tiros</option>
                      <option value="PROVEEDORES_DOTACION">Proveedores Cargados (Dotación)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Destinación:</label>
                    <select
                      value={ammoClass}
                      onChange={(e) => setAmmoClass(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="DOTACION_COMBATE">Dotación de Combate (Unidades en Terreno)</option>
                      <option value="RESERVA_ESTRATEGICA">Reserva Estratégica en Polvorín</option>
                      <option value="INSTRUCCION_POLIGONO">Munición de Polígono / Entrenamiento</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 3. CLASE II: INTENDENCIA & BLINDAJE */}
            {category === 'CLASE_II' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase">
                    Registro de Protección Balística (Chalecos Nivel IV y Cascos)
                  </h4>
                  <button
                    type="button"
                    onClick={handleGenerateSerial}
                    className="text-[10px] font-mono px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  >
                    🎲 Generar Seriales
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Tipo de Blindaje:</label>
                    <select
                      value={armorType}
                      onChange={(e) => setArmorType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="CHALECO_BALISTICO_IV">Chaleco Balístico Nivel IV (Cerámica)</option>
                      <option value="CHALECO_PORTAPLACAS_IIIA">Chaleco Portaplacas Nivel IIIA</option>
                      <option value="CASCO_KEVLAR_MICH">Casco Táctico Kevlar MICH</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Serial del Chaleco/Casco:</label>
                    <input
                      type="text"
                      value={armorSerial}
                      onChange={(e) => setArmorSerial(e.target.value)}
                      placeholder="Ej: CH-IV-99801"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono uppercase"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Talla:</label>
                    <select
                      value={armorSize}
                      onChange={(e) => setArmorSize(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono"
                    >
                      <option value="S">Small (S)</option>
                      <option value="M">Medium (M)</option>
                      <option value="L">Large (L)</option>
                      <option value="XL">Extra Large (XL)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Serial Placa Frontal Cerámica:</label>
                    <input
                      type="text"
                      value={frontPlateSerial}
                      onChange={(e) => setFrontPlateSerial(e.target.value)}
                      placeholder="Ej: PL-CER-99801-F"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Serial Placa Trasera Cerámica:</label>
                    <input
                      type="text"
                      value={rearPlateSerial}
                      onChange={(e) => setRearPlateSerial(e.target.value)}
                      placeholder="Ej: PL-CER-99801-R"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Vigencia Balística (Años):</label>
                    <input
                      type="number"
                      value={armorExpYears}
                      onChange={(e) => setArmorExpYears(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono"
                      min={1}
                      max={10}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. CLASE I: ALIMENTACIÓN */}
            {category === 'CLASE_I' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase">
                    Raciones de Campaña (MRE) y Purificación de Agua
                  </h4>
                  <button
                    type="button"
                    onClick={handleGenerateSerial}
                    className="text-[10px] font-mono px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  >
                    🎲 Generar Lote
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Tipo de Subsistencia:</label>
                    <select
                      value={rationType}
                      onChange={(e) => setRationType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="RACION_CAMPANA_MRE">Ración de Campaña (MRE)</option>
                      <option value="VIVERES_SECOS">Víveres Secos / Base Fija</option>
                      <option value="PASTILLAS_PURIFICADORAS">Pastillas Purificadoras de Agua (Aquatabs)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Menú o Descripción:</label>
                    <input
                      type="text"
                      value={rationMenu}
                      onChange={(e) => setRationMenu(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Número de Lote:</label>
                    <input
                      type="text"
                      value={rationLot}
                      onChange={(e) => setRationLot(e.target.value)}
                      placeholder="Ej: LOTE-MRE-COL-2026-09"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono uppercase"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Cantidad de Raciones/Unidades:</label>
                    <input
                      type="number"
                      value={rationQuantity}
                      onChange={(e) => setRationQuantity(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono"
                      min={1}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Calorías por Ración (kcal):</label>
                    <input
                      type="number"
                      value={rationCalories}
                      onChange={(e) => setRationCalories(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono"
                      min={0}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. COMUNICACIONES S-6 */}
            {category === 'COMUNICACIONES' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase">
                    Equipos de Radio Táctico y Transmisiones
                  </h4>
                  <button
                    type="button"
                    onClick={handleGenerateSerial}
                    className="text-[10px] font-mono px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  >
                    🎲 Generar Serial
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Modelo de Radio:</label>
                    <select
                      value={commModel}
                      onChange={(e) => setCommModel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="HARRIS_FALCON_III_PRC152">Harris Falcon III AN/PRC-152 (Multibanda)</option>
                      <option value="HARRIS_MANPACK_PRC117G">Harris Manpack AN/PRC-117G (HF/VHF)</option>
                      <option value="MOTOROLA_APX8000">Motorola APX 8000 (Seguridad y Base)</option>
                      <option value="REPETIDORA_TACTICA_VHF">Repetidora Táctica Transportable VHF</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Serial del Radio:</label>
                    <input
                      type="text"
                      value={commSerial}
                      onChange={(e) => setCommSerial(e.target.value)}
                      placeholder="Ej: HF-152-4491"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono uppercase"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Tipo de Batería:</label>
                    <select
                      value={commBattery}
                      onChange={(e) => setCommBattery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="BB_2590_LITIO">Batería BB-2590 Litio Recargable</option>
                      <option value="LI_ION_RECARGABLE">Batería Li-Ion Estándar</option>
                      <option value="PANEL_SOLAR_CAMPANA">Kit Panel Solar de Campaña</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="cryptoKey"
                      checked={cryptoLoaded}
                      onChange={(e) => setCryptoLoaded(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded bg-slate-950 border-slate-700"
                    />
                    <label htmlFor="cryptoKey" className="text-xs text-slate-300 font-bold cursor-pointer">
                      🔐 Llave Criptográfica OTAR Vigente Cargada
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 6. OPTRÓNICA & UAV */}
            {category === 'ESPECIAL' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase">
                    Optoelectrónica, Visión Nocturna y UAVs
                  </h4>
                  <button
                    type="button"
                    onClick={handleGenerateSerial}
                    className="text-[10px] font-mono px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  >
                    🎲 Generar Serial
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Dispositivo:</label>
                    <select
                      value={optronicType}
                      onChange={(e) => setOptronicType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="VISOR_NOCTURNO_PVS14">Visor Nocturno AN/PVS-14</option>
                      <option value="MIRA_TERMICA_PAS13">Mira Térmica para Fusil AN/PAS-13</option>
                      <option value="DRON_TACTICO_MAVIC3T">Dron de Reconocimiento Mavic 3T (Térmico)</option>
                      <option value="DETECTOR_METALES_VALLON_EOD">Detector de Minas Vallon VMR3G (EOD)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Número de Serial:</label>
                    <input
                      type="text"
                      value={optronicSerial}
                      onChange={(e) => setOptronicSerial(e.target.value)}
                      placeholder="Ej: NV-PVS14-1022"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono uppercase"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Nivel de Batería (%):</label>
                    <input
                      type="number"
                      value={batteryPct}
                      onChange={(e) => setBatteryPct(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono"
                      min={0}
                      max={100}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 7. CLASE VIII: SANIDAD */}
            {category === 'CLASE_VIII' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase">
                    Sanidad Militar, Kits de Trauma IFAK y Torniquetes
                  </h4>
                  <button
                    type="button"
                    onClick={handleGenerateSerial}
                    className="text-[10px] font-mono px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  >
                    🎲 Generar Lotes
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Tipo de Elemento Sanitario:</label>
                    <select
                      value={sanType}
                      onChange={(e) => setSanType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="IFAK_INDIVIDUAL_TRAUMA">Kit Individual de Trauma IFAK</option>
                      <option value="MOCHILA_ENFERMERO_COMBATE">Mochila Táctica de Enfermero Militar</option>
                      <option value="BOTIQUIN_ESCUADRA">Botiquín de Escuadra</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Serial o Lote del Kit:</label>
                    <input
                      type="text"
                      value={sanLot}
                      onChange={(e) => setSanLot(e.target.value)}
                      placeholder="Ej: IFAK-COL-2026-88"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono uppercase"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Lote Torniquete CAT Gen 7:</label>
                    <input
                      type="text"
                      value={tourniquetLot}
                      onChange={(e) => setTourniquetLot(e.target.value)}
                      placeholder="Ej: CAT-GEN7-LOT26C"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Gasas Hemostáticas (Unidades):</label>
                    <input
                      type="number"
                      value={gauzeUnits}
                      onChange={(e) => setGauzeUnits(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono"
                      min={1}
                    />
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-950/60 transition active:scale-95 flex items-center gap-2"
            >
              <span>💾</span>
              <span>Guardar e Ingresar al Almacén</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
