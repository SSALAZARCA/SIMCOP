import React, { useState, useCallback } from 'react';
import type { IntelligenceReport, SelectedEntity } from '../types';
import { IntelligenceSourceType, IntelligenceReliability, IntelligenceCredibility, MapEntityType } from '../types';
import { IntelListComponent } from './IntelListComponent';
import { IntelDetailsPanel } from './IntelDetailsPanel';
import { dmsToDecimal } from '../utils/coordinateUtils';
import { apiClient } from '../utils/apiClient';

interface IntelViewProps {
    intelReports: IntelligenceReport[];
    onSelectIntel: (report: IntelligenceReport) => void;
    addIntelReport: (reportData: Omit<IntelligenceReport, 'id' | 'reportTimestamp'>) => void;
}

export const IntelView: React.FC<IntelViewProps> = ({ intelReports, onSelectIntel, addIntelReport }) => {
    const [selectedIntelForPanel, setSelectedIntelForPanel] = useState<IntelligenceReport | null>(null);
    const [showAddIntelForm, setShowAddIntelForm] = useState(false);

    const handleLocalSelect = useCallback((report: IntelligenceReport) => {
        setSelectedIntelForPanel(report);
        onSelectIntel(report);
    }, [onSelectIntel]);

    const listSelectedEntity: SelectedEntity | null = selectedIntelForPanel
        ? { type: MapEntityType.INTEL, id: selectedIntelForPanel.id }
        : null;

    // State for new intel form fields
    const [newIntelTitle, setNewIntelTitle] = useState('');
    const [newIntelDetails, setNewIntelDetails] = useState('');
    const [newIntelType, setNewIntelType] = useState<IntelligenceSourceType>(IntelligenceSourceType.HUMINT);
    const [newIntelLatDMS, setNewIntelLatDMS] = useState('');
    const [newIntelLonDMS, setNewIntelLonDMS] = useState('');
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
        setNewIntelLatDMS('');
        setNewIntelLonDMS('');
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

        const lat = dmsToDecimal(newIntelLatDMS, false);
        const lon = dmsToDecimal(newIntelLonDMS, true);

        if (!newIntelTitle || !newIntelDetails || !newIntelSourceDetails || !newEventTimestamp) {
            alert("Por favor complete todos los campos requeridos (Título, Detalles, Detalles de Fuente, Fecha/Hora del Evento).");
            return;
        }
        if (lat === null) {
            alert("Formato de latitud inválido. Use Grados°Minutos′Segundos″ Dirección (ej: 34°15′30″ N).");
            return;
        }
        if (lon === null) {
            alert("Formato de longitud inválido. Use Grados°Minutos′Segundos″ Dirección (ej: 118°30′00″ W).");
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
                <button
                    onClick={() => setShowAddIntelForm(!showAddIntelForm)}
                    className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-xs sm:text-sm font-medium transition-colors"
                >
                    {showAddIntelForm ? 'Cancelar Entrada' : 'Añadir Informe Intel.'}
                </button>
            </div>

            {showAddIntelForm && (
                <form onSubmit={handleAddIntelSubmit} className="bg-gray-800 p-3 md:p-4 rounded-lg shadow-md space-y-3 md:space-y-4">
                    <h3 className="text-lg font-semibold text-gray-300 mb-3 border-b border-gray-600 pb-2">Nuevo Informe de Inteligencia</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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
                    </div>

                    <div>
                        <label htmlFor="intelSourceDetails" className="block text-sm font-medium text-gray-300">Detalles de la Fuente*</label>
                        <input type="text" id="intelSourceDetails" value={newIntelSourceDetails} onChange={e => setNewIntelSourceDetails(e.target.value)} required className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm" placeholder="Ej: Informante local EP-01, Interceptación Radio R-105" />
                    </div>

                    <div>
                        <label htmlFor="intelDetails" className="block text-sm font-medium text-gray-300">Detalles del Informe*</label>
                        <textarea id="intelDetails" value={newIntelDetails} onChange={e => setNewIntelDetails(e.target.value)} rows={3} required className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm"></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                        <div>
                            <label htmlFor="intelLatDMS" className="block text-sm font-medium text-gray-300">Latitud (G°M′S″ Dir)*</label>
                            <input type="text" id="intelLatDMS" value={newIntelLatDMS} onChange={e => setNewIntelLatDMS(e.target.value)} placeholder="ej: 34°15′30″ N" required className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm" />
                        </div>
                        <div>
                            <label htmlFor="intelLonDMS" className="block text-sm font-medium text-gray-300">Longitud (G°M′S″ Dir)*</label>
                            <input type="text" id="intelLonDMS" value={newIntelLonDMS} onChange={e => setNewIntelLonDMS(e.target.value)} placeholder="ej: 118°30′00″ W" required className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm" />
                        </div>
                        <div>
                            <label htmlFor="eventTimestamp" className="block text-sm font-medium text-gray-300">Fecha/Hora del Evento*</label>
                            <input type="datetime-local" id="eventTimestamp" value={newEventTimestamp} onChange={e => setNewEventTimestamp(e.target.value)} required className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-sm" />
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
                <div className="w-full md:w-2/5 pr-0 md:pr-2">
                    <IntelListComponent intelReports={intelReports} onSelectIntel={handleLocalSelect} selectedEntity={listSelectedEntity} />
                </div>
                <div className="w-full md:w-3/5 bg-gray-800 p-3 md:p-4 rounded-lg shadow-inner">
                    {selectedIntelForPanel ? (
                        <IntelDetailsPanel report={selectedIntelForPanel} />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-gray-400 text-center">{showAddIntelForm ? 'Completando nuevo informe...' : 'Seleccione un informe de inteligencia para ver detalles.'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};