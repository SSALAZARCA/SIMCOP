import React, { useState, useCallback } from 'react';
import type { IntelligenceReport, OsintEvent } from '../types';
import { IntelligenceSourceType, IntelligenceReliability, IntelligenceCredibility, MapEntityType, SelectedEntity } from '../types';
import { IntelListComponent } from './IntelListComponent';
import { IntelDetailsPanel } from './IntelDetailsPanel';
import { dmsToDecimal } from '../utils/coordinateUtils';
import { apiClient } from '../utils/apiClient';
import { API_BASE_URL } from '../utils/apiConfig';

interface IntelViewProps {
    intelReports: IntelligenceReport[];
    onSelectIntel: (report: IntelligenceReport) => void;
    addIntelReport: (reportData: Omit<IntelligenceReport, 'id' | 'reportTimestamp'>) => void;
    onRefreshOsint?: () => Promise<void>;
    osintLayerActive?: boolean;
    setOsintLayerActive?: (active: boolean) => void;
    osintEvents?: OsintEvent[];
    verifyOsint?: (id: string, verified: boolean) => Promise<void>;
}

export const IntelView: React.FC<IntelViewProps> = ({
    intelReports,
    onSelectIntel,
    addIntelReport,
    onRefreshOsint,
    osintLayerActive = false,
    setOsintLayerActive,
    osintEvents = [],
    verifyOsint
}) => {
    const [selectedIntelForPanel, setSelectedIntelForPanel] = useState<IntelligenceReport | null>(null);
    const [selectedOsintForPanel, setSelectedOsintForPanel] = useState<OsintEvent | null>(null);
    const [showAddIntelForm, setShowAddIntelForm] = useState(false);
    const [activeTab, setActiveTab] = useState<'oficial' | 'osint'>('oficial');

    const handleLocalSelect = useCallback((report: IntelligenceReport) => {
        setSelectedIntelForPanel(report);
        setSelectedOsintForPanel(null);
        onSelectIntel(report);
    }, [onSelectIntel]);

    const handleOsintSelect = useCallback((event: OsintEvent) => {
        setSelectedOsintForPanel(event);
        setSelectedIntelForPanel(null);
        // We could also call a prop to select it on the map, but it's optional for now.
    }, []);

    const handleLinkReports = async (targetId: string) => {
        if (!selectedIntelForPanel) return;
        try {
            await apiClient.put(`${API_BASE_URL}/api/intel/${selectedIntelForPanel.id}/link/${targetId}`, {});
            alert("Vínculo creado correctamente.");
        } catch (error) {
            console.error("Link failed", error);
        }
    };

    const formatUrl = (url: string | undefined) => {
        if (!url) return '#';
        const trimmed = url.trim();
        if (trimmed === '') return '#';
        if (!/^https?:\/\//i.test(trimmed)) {
            return `https://${trimmed}`;
        }
        return trimmed;
    };

    const handleUnlinkReports = async (targetId: string) => {
        if (!selectedIntelForPanel) return;
        try {
            await apiClient.delete(`${API_BASE_URL}/api/intel/${selectedIntelForPanel.id}/link/${targetId}`);
            alert("Vínculo eliminado.");
        } catch (error) {
            console.error("Unlink failed", error);
        }
    };

    const listSelectedEntity: SelectedEntity | null = selectedIntelForPanel
        ? { type: MapEntityType.INTEL, id: selectedIntelForPanel.id }
        : null;

    // State for new intel form fields
    const [newIntelTitle, setNewIntelTitle] = useState('');
    const [newIntelDetails, setNewIntelDetails] = useState('');
    const [newIntelType, setNewIntelType] = useState<IntelligenceSourceType>(IntelligenceSourceType.HUMINT);
    const [intelLatDeg, setIntelLatDeg] = useState('');
    const [intelLatMin, setIntelLatMin] = useState('');
    const [intelLatSec, setIntelLatSec] = useState('');
    const [intelLatDir, setIntelLatDir] = useState<'N' | 'S'>('N');
    const [intelLonDeg, setIntelLonDeg] = useState('');
    const [intelLonMin, setIntelLonMin] = useState('');
    const [intelLonSec, setIntelLonSec] = useState('');
    const [intelLonDir, setIntelLonDir] = useState<'W' | 'E'>('W');
    const [newIntelSourceDetails, setNewIntelSourceDetails] = useState('');
    const [newIntelReliability, setNewIntelReliability] = useState<IntelligenceReliability>(IntelligenceReliability.C);
    const [newIntelCredibility, setNewIntelCredibility] = useState<IntelligenceCredibility>(IntelligenceCredibility.THREE);
    const [newIntelKeywords, setNewIntelKeywords] = useState(''); // Comma-separated string
    const [newEventTimestamp, setNewEventTimestamp] = useState(''); // ISO string from datetime-local
    const [newAttachmentName, setNewAttachmentName] = useState('');
    const [newAttachmentType, setNewAttachmentType] = useState('');
    const [newAttachmentUrl, setNewAttachmentUrl] = useState(''); // Stores the URL from backend



    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            try {
                const response = await apiClient.uploadFile(file);
                // We use the fileDownloadUri as the stored URL
                setNewAttachmentName(response.fileName);
                setNewAttachmentType(response.fileType);
                setNewAttachmentUrl(response.fileDownloadUri);
            } catch (error) {
                console.error("Upload failed", error);
                alert("Error al subir archivo. Verifique conexión.");
                // Reset input?
            }
        }
    };

    const resetForm = () => {
        setNewIntelTitle('');
        setNewIntelDetails('');
        setNewIntelType(IntelligenceSourceType.HUMINT);
        setIntelLatDeg('');
        setIntelLatMin('');
        setIntelLatSec('');
        setIntelLatDir('N');
        setIntelLonDeg('');
        setIntelLonMin('');
        setIntelLonSec('');
        setIntelLonDir('W');
        setNewIntelSourceDetails('');
        setNewIntelReliability(IntelligenceReliability.C);
        setNewIntelCredibility(IntelligenceCredibility.THREE);
        setNewIntelKeywords('');
        setNewEventTimestamp('');
        setNewAttachmentName('');
        setNewAttachmentType('');
        setNewAttachmentUrl('');
        setShowAddIntelForm(false);
    };

    const handleAddIntelSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const latD = parseFloat(intelLatDeg);
        const latM = parseFloat(intelLatMin);
        const latS = parseFloat(intelLatSec);
        const lonD = parseFloat(intelLonDeg);
        const lonM = parseFloat(intelLonMin);
        const lonS = parseFloat(intelLonSec);

        if (
            isNaN(latD) || isNaN(latM) || isNaN(latS) ||
            isNaN(lonD) || isNaN(lonM) || isNaN(lonS)
        ) {
            alert("Todos los campos de GMS para Coordenadas son requeridos.");
            return;
        }
        if (latD < 0 || latD > 90 || latM < 0 || latM >= 60 || latS < 0 || latS >= 60) {
            alert("Valores de latitud inválidos (Grados: 0-90, Minutos/Segundos: 0-59).");
            return;
        }
        if (lonD < 0 || lonD > 180 || lonM < 0 || lonM >= 60 || lonS < 0 || lonS >= 60) {
            alert("Valores de longitud inválidos (Grados: 0-180, Minutos/Segundos: 0-59).");
            return;
        }

        const constructedLatDMS = `${latD}°${latM}′${latS}″ ${intelLatDir}`;
        const constructedLonDMS = `${lonD}°${lonM}′${lonS}″ ${intelLonDir}`;

        const lat = dmsToDecimal(constructedLatDMS, false);
        const lon = dmsToDecimal(constructedLonDMS, true);

        if (!newIntelTitle || !newIntelDetails || !newIntelSourceDetails || !newEventTimestamp) {
            alert("Por favor complete todos los campos requeridos (Título, Detalles, Detalles de Fuente, Fecha/Hora del Evento).");
            return;
        }
        if (lat === null) {
            alert("Formato de latitud inválido.");
            return;
        }
        if (lon === null) {
            alert("Formato de longitud inválido.");
            return;
        }

        const keywordsArray = newIntelKeywords.split(',').map(kw => kw.trim()).filter(kw => kw.length > 0);
        const eventTs = new Date(newEventTimestamp).getTime();
        if (isNaN(eventTs)) {
            alert("Fecha/Hora del evento inválida.");
            return;
        }

        const attachmentsArray = [];
        if (newAttachmentName && newAttachmentType) {
            attachmentsArray.push({
                name: newAttachmentName,
                type: newAttachmentType,
                url: newAttachmentUrl
            });
        }

        const newReportData: Omit<IntelligenceReport, 'id' | 'reportTimestamp'> = {
            title: newIntelTitle,
            details: newIntelDetails,
            type: newIntelType,
            location: { lat, lon },
            sourceDetails: newIntelSourceDetails,
            reliability: newIntelReliability,
            credibility: newIntelCredibility,
            keywords: keywordsArray,
            eventTimestamp: eventTs,
            attachments: attachmentsArray.length > 0 ? attachmentsArray : undefined,
        };
        addIntelReport(newReportData);
        resetForm();
    };


    const sourceTypeLabels: Record<string, string> = {
        [IntelligenceSourceType.HUMINT]: 'HUMINT (Inteligencia Humana)',
        [IntelligenceSourceType.SIGINT]: 'SIGINT (Inteligencia de Señales)',
        [IntelligenceSourceType.IMINT]: 'IMINT (Inteligencia de Imágenes)',
        [IntelligenceSourceType.OSINT]: 'OSINT (Fuentes Abiertas)',
        [IntelligenceSourceType.GEOINT]: 'GEOINT (Inteligencia Geoespacial)',
    };

    const reliabilityLabels: Record<string, string> = {
        [IntelligenceReliability.A]: 'A - Completamente Fiable',
        [IntelligenceReliability.B]: 'B - Generalmente Fiable',
        [IntelligenceReliability.C]: 'C - Fiable a Veces',
        [IntelligenceReliability.D]: 'D - Generalmente No Fiable',
        [IntelligenceReliability.E]: 'E - No Fiable',
        [IntelligenceReliability.F]: 'F - No Se Puede Juzgar',
    };

    const credibilityLabels: Record<string, string> = {
        [IntelligenceCredibility.ONE]: '1 - Confirmada',
        [IntelligenceCredibility.TWO]: '2 - Probablemente Verdadera',
        [IntelligenceCredibility.THREE]: '3 - Posiblemente Verdadera',
        [IntelligenceCredibility.FOUR]: '4 - Dudosamente Verdadera',
        [IntelligenceCredibility.FIVE]: '5 - Improbable',
        [IntelligenceCredibility.SIX]: '6 - No Se Puede Juzgar',
    };

    return (
        <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-700 pb-2 gap-2">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-200">Fuente de Inteligencia</h2>
                <div className="flex gap-2">
                    {onRefreshOsint && (
                        <button
                            onClick={() => {
                                onRefreshOsint()
                                    .then(() => {
                                        alert("Noticias OSINT actualizadas.");
                                        if (setOsintLayerActive) setOsintLayerActive(true);
                                    })
                                    .catch(e => alert("Error al actualizar OSINT."));
                            }}
                            className="px-3 py-1.5 md:px-4 md:py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md text-xs sm:text-sm font-medium transition-colors"
                        >
                            Procesar OSINT (IA)
                        </button>
                    )}
                    {setOsintLayerActive && (
                        <button
                            onClick={() => setOsintLayerActive(!osintLayerActive)}
                            className={`px-3 py-1.5 md:px-4 md:py-2 border rounded-md text-xs sm:text-sm font-medium transition-colors ${osintLayerActive
                                ? 'bg-cyan-900 border-cyan-500 text-cyan-200 hover:bg-cyan-800'
                                : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            {osintLayerActive ? 'Ocultar Capa OSINT' : 'Ver Capa OSINT'}
                        </button>
                    )}
                    <button
                        onClick={() => setShowAddIntelForm(!showAddIntelForm)}
                        className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-xs sm:text-sm font-medium transition-colors"
                    >
                        {showAddIntelForm ? 'Cancelar Entrada' : 'Añadir Informe Intel.'}
                    </button>
                </div>
            </div>

            {showAddIntelForm && (
                <form onSubmit={handleAddIntelSubmit} className="bg-gray-800 p-3 md:p-4 rounded-lg shadow-md space-y-3 md:space-y-4">
                    <h3 className="text-lg font-semibold text-gray-300 mb-3 border-b border-gray-600 pb-2">Nuevo Informe de Inteligencia</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                        <div>
                            <label htmlFor="intelTitle" className="block text-sm font-medium text-gray-300">Título*</label>
                            <input type="text" id="intelTitle" value={newIntelTitle} onChange={e => setNewIntelTitle(e.target.value)} required className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm" />
                        </div>
                        <div>
                            <label htmlFor="intelType" className="block text-sm font-medium text-gray-300">Tipo de Inteligencia*</label>
                            <select id="intelType" value={newIntelType} onChange={e => setNewIntelType(e.target.value as IntelligenceSourceType)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm">
                                {Object.values(IntelligenceSourceType).map(type => <option key={type} value={type}>{sourceTypeLabels[type] || type}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="eventTimestamp" className="block text-sm font-medium text-gray-300">Fecha/Hora del Evento*</label>
                            <input type="datetime-local" id="eventTimestamp" value={newEventTimestamp} onChange={e => setNewEventTimestamp(e.target.value)} required className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="intelSourceDetails" className="block text-sm font-medium text-gray-300">Detalles de la Fuente*</label>
                        <input type="text" id="intelSourceDetails" value={newIntelSourceDetails} onChange={e => setNewIntelSourceDetails(e.target.value)} required className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm" placeholder="Ej: Informante local EP-01, Interceptación Radio R-105" />
                    </div>

                    <div>
                        <label htmlFor="intelDetails" className="block text-sm font-medium text-gray-300">Detalles del Informe*</label>
                        <textarea id="intelDetails" value={newIntelDetails} onChange={e => setNewIntelDetails(e.target.value)} rows={3} required className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm"></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900/40 p-4 rounded-md border border-gray-700/50">
                        {/* Latitud */}
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-300">Latitud*</label>
                            <div className="grid grid-cols-4 gap-2">
                                <div className="space-y-0.5">
                                    <label className="block text-[9px] text-gray-400 text-center uppercase tracking-tighter">Grados</label>
                                    <input type="number" value={intelLatDeg} onChange={e => setIntelLatDeg(e.target.value)} placeholder="G" required className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm text-center font-bold text-white outline-none" />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="block text-[9px] text-gray-400 text-center uppercase tracking-tighter">Minutos</label>
                                    <input type="number" value={intelLatMin} onChange={e => setIntelLatMin(e.target.value)} placeholder="M" required className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm text-center font-bold text-white outline-none" />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="block text-[9px] text-gray-400 text-center uppercase tracking-tighter">Segundos</label>
                                    <input type="number" value={intelLatSec} onChange={e => setIntelLatSec(e.target.value)} placeholder="S" required className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm text-center font-bold text-white outline-none" />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="block text-[9px] text-gray-400 text-center uppercase tracking-tighter">Hemi.</label>
                                    <select value={intelLatDir} onChange={e => setIntelLatDir(e.target.value as 'N' | 'S')} className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm text-center font-bold text-white outline-none h-[38px]">
                                        <option value="N">N</option>
                                        <option value="S">S</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Longitud */}
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-300">Longitud*</label>
                            <div className="grid grid-cols-4 gap-2">
                                <div className="space-y-0.5">
                                    <label className="block text-[9px] text-gray-400 text-center uppercase tracking-tighter">Grados</label>
                                    <input type="number" value={intelLonDeg} onChange={e => setIntelLonDeg(e.target.value)} placeholder="G" required className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm text-center font-bold text-white outline-none" />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="block text-[9px] text-gray-400 text-center uppercase tracking-tighter">Minutos</label>
                                    <input type="number" value={intelLonMin} onChange={e => setIntelLonMin(e.target.value)} placeholder="M" required className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm text-center font-bold text-white outline-none" />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="block text-[9px] text-gray-400 text-center uppercase tracking-tighter">Segundos</label>
                                    <input type="number" value={intelLonSec} onChange={e => setIntelLonSec(e.target.value)} placeholder="S" required className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm text-center font-bold text-white outline-none" />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="block text-[9px] text-gray-400 text-center uppercase tracking-tighter">Hemi.</label>
                                    <select value={intelLonDir} onChange={e => setIntelLonDir(e.target.value as 'W' | 'E')} className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm text-center font-bold text-white outline-none h-[38px]">
                                        <option value="W">W</option>
                                        <option value="E">E</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <div>
                            <label htmlFor="intelReliability" className="block text-sm font-medium text-gray-300">Fiabilidad de la Fuente</label>
                            <select id="intelReliability" value={newIntelReliability} onChange={e => setNewIntelReliability(e.target.value as IntelligenceReliability)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm">
                                {Object.values(IntelligenceReliability).map(val => <option key={val} value={val}>{reliabilityLabels[val] || val}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="intelCredibility" className="block text-sm font-medium text-gray-300">Credibilidad de la Información</label>
                            <select id="intelCredibility" value={newIntelCredibility} onChange={e => setNewIntelCredibility(e.target.value as IntelligenceCredibility)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm">
                                {Object.values(IntelligenceCredibility).map(val => <option key={val} value={val}>{credibilityLabels[val] || val}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="intelKeywords" className="block text-sm font-medium text-gray-300">Palabras Clave (separadas por coma)</label>
                        <input type="text" id="intelKeywords" value={newIntelKeywords} onChange={e => setNewIntelKeywords(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm" placeholder="ej: vehículo, patrulla, actividad sospechosa" />
                    </div>

                    <fieldset className="border border-gray-600 p-3 rounded-md">
                        <legend className="text-sm font-medium text-gray-300 px-1">Adjunto (Subir Archivo)</legend>
                        <div className="grid grid-cols-1 gap-3 mt-1">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Seleccionar Archivo (Foto/PDF)</label>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                                />
                                {newAttachmentName && (
                                    <p className="text-xs text-green-400 mt-1">
                                        Archivo cargado: <span className="font-bold">{newAttachmentName}</span> ({newAttachmentType})
                                    </p>
                                )}
                            </div>
                        </div>
                    </fieldset>

                    <div className="flex justify-end space-x-3 pt-3">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-xs sm:text-sm font-medium transition-colors"
                        >
                            Limpiar Formulario
                        </button>
                        <button
                            type="submit"
                            className="px-3 py-1.5 md:px-4 md:py-2 bg-green-600 hover:bg-green-700 rounded-md text-xs sm:text-sm font-medium transition-colors"
                        >
                            Enviar Informe
                        </button>
                    </div>
                </form>
            )}

            <div className="flex flex-col md:flex-row flex-1 space-y-4 md:space-y-0 md:space-x-4">
                <div className="w-full md:w-2/5 pr-0 md:pr-2 flex flex-col space-y-3">
                    {/* TABS */}
                    <div className="flex bg-gray-800 p-1 rounded-md shadow">
                        <button 
                            className={`flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${activeTab === 'oficial' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                            onClick={() => setActiveTab('oficial')}
                        >
                            Informes Oficiales ({intelReports.length})
                        </button>
                        <button 
                            className={`flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${activeTab === 'osint' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                            onClick={() => setActiveTab('osint')}
                        >
                            Noticias OSINT ({osintEvents.length})
                        </button>
                    </div>

                    {activeTab === 'oficial' ? (
                        <IntelListComponent intelReports={intelReports} onSelectIntel={handleLocalSelect} selectedEntity={listSelectedEntity} />
                    ) : (
                        <div className="bg-gray-800 flex-1 rounded-lg shadow-inner overflow-hidden flex flex-col border border-gray-700">
                            <div className="p-3 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
                                <h3 className="font-semibold text-gray-200">Listado de Eventos IA</h3>
                            </div>
                            <div className="overflow-y-auto flex-1 p-2 space-y-2 max-h-[60vh]">
                                {osintEvents.length === 0 ? (
                                    <p className="text-gray-400 text-center py-4 text-sm">No hay noticias OSINT procesadas.</p>
                                ) : (
                                    osintEvents.map(event => (
                                        <div 
                                            key={event.id} 
                                            onClick={() => handleOsintSelect(event)}
                                            className={`p-3 rounded-md shadow border cursor-pointer ${event.verified ? 'bg-cyan-900/40 border-cyan-700' : 'bg-gray-700 border-gray-600'} hover:border-blue-500 transition-colors flex flex-col gap-2 ${selectedOsintForPanel?.id === event.id ? 'border-cyan-400 bg-cyan-900/60' : ''}`}
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <h4 className="font-bold text-gray-200 text-sm leading-tight">{event.title}</h4>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${event.confidenceScore >= 0.8 ? 'bg-red-900 text-red-200' : 'bg-yellow-900 text-yellow-200'}`}>
                                                    {(event.confidenceScore * 100).toFixed(0)}% CONF
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 italic line-clamp-3 leading-snug">{event.summary}</p>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-[10px] text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">{event.sourceName}</span>
                                                <div className="flex gap-2">
                                                    <a 
                                                        href={formatUrl(event.sourceUrl)} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="text-[10px] text-blue-400 hover:text-blue-300 underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        Ver Fuente original
                                                    </a>
                                                    {verifyOsint && !event.verified && (
                                                        <button 
                                                            onClick={() => verifyOsint(event.id, true)}
                                                            className="text-[10px] bg-green-600 hover:bg-green-500 text-white px-2 py-0.5 rounded"
                                                        >
                                                            Validar
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="w-full md:w-3/5 bg-gray-800 p-3 md:p-4 rounded-lg shadow-inner">
                    {selectedIntelForPanel ? (
                        <IntelDetailsPanel
                            report={selectedIntelForPanel}
                            allReports={intelReports}
                            onLink={handleLinkReports}
                            onUnlink={handleUnlinkReports}
                        />
                    ) : selectedOsintForPanel ? (
                        <div className="flex flex-col h-full bg-gray-900 rounded border border-gray-700 p-4">
                            <h3 className="text-xl font-bold text-gray-100 mb-2">{selectedOsintForPanel.title}</h3>
                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className={`px-2 py-1 text-xs font-bold rounded ${selectedOsintForPanel.verified ? 'bg-cyan-900 text-cyan-200' : 'bg-gray-700 text-gray-300'}`}>
                                    {selectedOsintForPanel.verified ? '✓ Verificado' : '⚠️ No Verificado'}
                                </span>
                                <span className="px-2 py-1 text-xs font-bold bg-blue-900 text-blue-200 rounded">
                                    Confianza: {(selectedOsintForPanel.confidenceScore * 100).toFixed(0)}%
                                </span>
                                <span className="px-2 py-1 text-xs font-bold bg-gray-700 text-gray-200 rounded">
                                    {selectedOsintForPanel.eventType}
                                </span>
                            </div>
                            
                            <div className="bg-gray-800 p-3 rounded mb-4">
                                <h4 className="text-sm font-semibold text-gray-400 mb-1">Resumen del Evento</h4>
                                <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{selectedOsintForPanel.summary}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                <div className="bg-gray-800 p-3 rounded">
                                    <span className="block text-gray-400 text-xs mb-1">Ubicación</span>
                                    <span className="text-gray-200">{selectedOsintForPanel.locationName}</span>
                                </div>
                                <div className="bg-gray-800 p-3 rounded">
                                    <span className="block text-gray-400 text-xs mb-1">Coordenadas</span>
                                    <span className="text-gray-200 font-mono text-xs">{selectedOsintForPanel.location.lat.toFixed(4)}, {selectedOsintForPanel.location.lon.toFixed(4)}</span>
                                </div>
                                <div className="bg-gray-800 p-3 rounded">
                                    <span className="block text-gray-400 text-xs mb-1">Fuente</span>
                                    <span className="text-gray-200">{selectedOsintForPanel.sourceName}</span>
                                </div>
                                <div className="bg-gray-800 p-3 rounded">
                                    <span className="block text-gray-400 text-xs mb-1">Fecha/Hora de Captura</span>
                                    <span className="text-gray-200">{new Date(selectedOsintForPanel.processedTimestamp).toLocaleString()}</span>
                                </div>
                            </div>
                            
                            <div className="mt-auto pt-4 flex justify-between border-t border-gray-700">
                                <a 
                                    href={formatUrl(selectedOsintForPanel.sourceUrl)} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
                                >
                                    Ver Noticia Original
                                </a>
                                {verifyOsint && !selectedOsintForPanel.verified && (
                                    <button 
                                        onClick={() => verifyOsint(selectedOsintForPanel.id, true)}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm transition-colors"
                                    >
                                        Validar Evento
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-2">
                            <p className="text-gray-400 text-center">{showAddIntelForm ? 'Completando nuevo informe...' : 'Seleccione un informe de inteligencia oficial para ver detalles.'}</p>
                            {activeTab === 'osint' && <p className="text-xs text-cyan-500 text-center max-w-sm">Los eventos OSINT se visualizan directamente en la lista o haciendo clic en el mapa 3D cuando la capa está activa.</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};