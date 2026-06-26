import React, { useState } from 'react';
import { FileText, Activity, MapPin, Clock, Calendar, Shield, Bookmark, User, Cross } from 'lucide-react';
import axios from 'axios';

export default function FichaDigital({ dossier, userToken }: { dossier: any, userToken: string }) {
  if (!dossier || !dossier.soldier) return null;

  const soldier = dossier.soldier;
  const history = dossier.history || [];
  const unitHistory = dossier.unitHistory || [];

  // Calcular permanencia
  const joinDate = new Date(soldier.assignmentDate || soldier.joinDate || Date.now());
  const now = new Date();
  const diffMonths = Math.max(0, (now.getFullYear() - joinDate.getFullYear()) * 12 + now.getMonth() - joinDate.getMonth());

  return (
    <div className="glass-panel" style={{ overflow: 'hidden', animation: 'fadeIn 0.5s' }}>
      {/* Cabecera */}
      <div style={{ padding: '2rem', background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.1) 0%, transparent 100%)', borderBottom: '1px solid var(--glass-border)', display: 'flex', gap: '2rem' }}>
        <div style={{ width: '120px', height: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={64} style={{ opacity: 0.5 }} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>{soldier.rank} {soldier.name}</h1>
          <div style={{ display: 'flex', gap: '2rem', color: 'var(--text-secondary)' }}>
            <p><strong>Cédula / ID:</strong> {soldier.id}</p>
            <p><strong>Arma:</strong> {soldier.branch || 'N/A'}</p>
            <p><strong>Especialidad (MOS):</strong> {soldier.mosCode}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <span style={{ padding: '0.4rem 1rem', background: soldier.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: soldier.status === 'ACTIVE' ? '#10b981' : '#ef4444', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
              ESTADO: {soldier.status}
            </span>
            <span style={{ padding: '0.4rem 1rem', background: soldier.healthStatus === 'APTO' ? 'rgba(16, 185, 129, 0.2)' : soldier.healthStatus ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.1)', color: soldier.healthStatus === 'APTO' ? '#10b981' : soldier.healthStatus ? '#f59e0b' : '#ccc', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
              SANIDAD: {soldier.healthStatus || 'SIN REPORTE'}
            </span>
            <span style={{ padding: '0.4rem 1rem', background: 'rgba(0, 240, 255, 0.2)', color: 'var(--accent-cyan)', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={16} /> PERMANENCIA: {diffMonths} MESES
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Sección Preparación */}
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
            <Activity size={20} /> Preparación y Capacidades
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Cursos Registrados</label>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '0.5rem' }}>
                {soldier.cursosCombate ? soldier.cursosCombate : 'No hay cursos registrados'}
              </div>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Historial de Unidades Previas</label>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem', color: 'var(--text-primary)' }}>
                {unitHistory.length > 0 ? unitHistory.map((u: string, i: number) => <li key={i}>{u}</li>) : <li>Sin historial previo</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* Sección Historial de Novedades */}
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
            <MapPin size={20} /> Línea de Tiempo de Novedades
          </h3>
          <div style={{ position: 'relative', borderLeft: '2px solid var(--glass-border)', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginLeft: '10px' }}>
            {history.length > 0 ? history.map((nov: any, idx: number) => (
              <div key={idx} style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-31px', top: '5px', width: '12px', height: '12px', borderRadius: '50%', background: idx === 0 ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}></div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong style={{ color: 'var(--accent-cyan)' }}>{nov.tipo}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(nov.fecha).toLocaleDateString()}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{nov.descripcion}</p>
                </div>
              </div>
            )) : (
              <p style={{ color: 'var(--text-secondary)' }}>No hay novedades registradas en el expediente.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
