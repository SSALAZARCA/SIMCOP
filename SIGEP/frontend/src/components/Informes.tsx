import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { FileBarChart, FileText, DownloadCloud, FileSpreadsheet, Loader } from 'lucide-react';
import axios from 'axios';
import { SIGEP_API_URL } from '../apiConfig';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Informes({ unitId, role }: { unitId: string, role: string }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [historial, setHistorial] = useState<any[]>([]);

  const reportes = [
    { id: 'PARTE', titulo: 'Parte Diario General', desc: 'Consolidado de efectivos físicos presentes, ausentes y en comisión.', icon: <FileText size={24} color="var(--accent-cyan)" />, type: 'pdf' },
    { id: 'TOE', titulo: 'Informe de Capacidad Combativa (TOE)', desc: 'Comparativa detallada entre la estructura autorizada y la real.', icon: <FileBarChart size={24} color="#a855f7" />, type: 'pdf' },
    { id: 'TRASLADOS', titulo: 'Matriz de Traslados (Histórico)', desc: 'Registro en Excel de todos los movimientos de personal despachados.', icon: <FileSpreadsheet size={24} color="var(--alert-success)" />, type: 'excel' }
  ];

  const addHistorial = (reportName: string) => {
    const newEntry = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      tipo: reportName,
      fecha: new Date().toLocaleString(),
      generadoPor: user?.username || 'Usuario'
    };
    setHistorial([newEntry, ...historial]);
  };

  const generarParteDiario = async () => {
    const res = await axios.get(`${SIGEP_API_URL}/personnel/unit/${unitId}`, {
      headers: { 'Authorization': `Bearer ${user?.token}` }
    });
    const personnel = res.data;
    
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Parte Diario General - Unidad: ${unitId}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Total de efectivos: ${personnel.length}`, 14, 40);

    const tableData = personnel.map((p: any) => [
      p.id,
      p.rankCategory,
      p.rank,
      `${p.firstName} ${p.lastName}`,
      p.status,
      p.healthStatus
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['ID Militar', 'Categoría', 'Grado', 'Nombres y Apellidos', 'Estado', 'Salud']],
      body: tableData,
    });

    doc.save(`Parte_Diario_${unitId}_${new Date().getTime()}.pdf`);
    addHistorial('Parte Diario General (PDF)');
  };

  const generarToe = async () => {
    const res = await axios.get(`${SIGEP_API_URL}/analysis/toe-balance/${unitId}`, {
      headers: { 'Authorization': `Bearer ${user?.token}` }
    });
    const toe = res.data;
    
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Informe TOE - Capacidad Combativa`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Unidad: ${unitId}`, 14, 30);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 40);

    doc.text(`Total Autorizado: ${toe.totalAuthorized}`, 14, 50);
    doc.text(`Total Real: ${toe.totalReal}`, 14, 60);

    if (toe.shortages && toe.shortages.length > 0) {
      doc.text(`Faltantes Críticos:`, 14, 75);
      const shortagesData = toe.shortages.map((s: any) => [s.role, s.missing]);
      autoTable(doc, {
        startY: 80,
        head: [['Rol/Grado', 'Cantidad Faltante']],
        body: shortagesData,
      });
    }

    doc.save(`TOE_${unitId}_${new Date().getTime()}.pdf`);
    addHistorial('Informe TOE (PDF)');
  };

  const generarMatrizTraslados = async () => {
    const res = await axios.get(`${SIGEP_API_URL}/transfers`, {
      headers: { 'Authorization': `Bearer ${user?.token}` }
    });
    const traslados = res.data;

    const wsData = traslados.map((t: any) => ({
      'ID Traslado': t.id,
      'Soldado ID': t.soldierId,
      'Categoría': t.rankCategory,
      'Unidad Origen': t.originUnitId,
      'Unidad Destino': t.destinationUnitId,
      'Motivo': t.reason,
      'Estado': t.status,
      'Fecha Creación': t.createdAt,
      'Creado Por': t.createdBy
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Traslados");
    XLSX.writeFile(wb, `Matriz_Traslados_${unitId}_${new Date().getTime()}.xlsx`);
    addHistorial('Matriz Traslados (Excel)');
  };

  const handleGenerate = async (id: string) => {
    setLoading(id);
    try {
      if (id === 'PARTE') await generarParteDiario();
      else if (id === 'TOE') await generarToe();
      else if (id === 'TRASLADOS') await generarMatrizTraslados();
    } catch (err) {
      console.error('Error al generar reporte', err);
      alert('Ocurrió un error al generar el reporte. Verifica la conexión con el servidor.');
    }
    setLoading(null);
  };

  return (
    <div className="fade-in" style={{ padding: '2rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '2rem', marginBottom: '2rem', color: 'var(--text-primary)' }}>
        <FileBarChart size={32} color="var(--accent-cyan)" />
        Informes y Parte Diario ({unitId})
      </h2>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textTransform: 'uppercase' }}>Generador de Reportes Oficiales</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          {reportes.map((rep, i) => (
            <div key={i} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {rep.icon}
                <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{rep.titulo}</h4>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', flex: 1 }}>{rep.desc}</p>
              <button 
                onClick={() => handleGenerate(rep.id)} 
                disabled={loading === rep.id}
                className="btn-primary" 
                style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', opacity: loading === rep.id ? 0.7 : 1 }}
              >
                {loading === rep.id ? <Loader size={18} className="spin" /> : <DownloadCloud size={18} />} 
                {loading === rep.id ? 'Generando...' : `Generar ${rep.type === 'pdf' ? 'PDF' : 'Excel'}`}
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>Historial de Generación</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID Documento</th>
              <th>Tipo de Informe</th>
              <th>Fecha y Hora</th>
              <th>Generado Por</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {historial.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No hay informes generados en esta sesión.
                </td>
              </tr>
            ) : (
              historial.map((h, i) => (
                <tr key={i}>
                  <td>{h.id}</td>
                  <td>{h.tipo}</td>
                  <td>{h.fecha}</td>
                  <td>{h.generadoPor}</td>
                  <td><span style={{ color: 'var(--alert-success)' }}>Descargado</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
