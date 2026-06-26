import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const AnalysisDashboard = () => {
  const { user } = useAuth();
  const [toeData, setToeData] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [criticalRotation, setCriticalRotation] = useState([]);
  const [units, setUnits] = useState([]);
  const [unitId, setUnitId] = useState("");

  // Cargar lista de unidades reales desde SIMCOP al montar
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const res = await axios.get(`http://localhost:8080/api/units`);
        setUnits(res.data);
        if (res.data.length > 0) {
          setUnitId(res.data[0].id); // Autoseleccionar la primera
        }
      } catch (error) {
        console.error("Error fetching units from SIMCOP", error);
      }
    };
    fetchUnits();
  }, []);

  // Escuchar cambios de unitId para cargar la info específica de la unidad
  useEffect(() => {
    if (unitId) {
      fetchData();
    }
  }, [unitId]);

  const fetchData = async () => {
    if (!user || !user.token) return;
    const config = { headers: { 'Authorization': `Bearer ${user.token}` } };
    try {
      const resToe = await axios.get(`http://localhost:4000/api/analysis/toe-balance/${unitId}`, config);
      setToeData(resToe.data);
      
      const resAvail = await axios.get(`http://localhost:4000/api/analysis/availability/${unitId}`, config);
      setAvailability(resAvail.data);
      
      const resCrit = await axios.get(`http://localhost:4000/api/analysis/critical-rotation/${unitId}`, config);
      setCriticalRotation(resCrit.data);
    } catch (error) {
      console.error("Error fetching analysis data", error);
    }
  };

  const availData = availability ? [
    { name: 'Aptos', value: availability.aptos },
    { name: 'No Aptos/Baja', value: availability.noAptos },
    { name: 'Excusados', value: availability.excusados },
    { name: 'Licencias', value: availability.licencias }
  ] : [];
  
  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

  return (
    <div className="fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', margin: 0 }}>
          Centro de Inteligencia de Personal
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ color: 'var(--text-secondary)' }}>Unidad a Evaluar:</label>
          <select 
            className="form-control" 
            value={unitId} 
            onChange={(e) => setUnitId(e.target.value)}
            style={{ width: '300px', backgroundColor: 'var(--glass-bg)', color: '#fff' }}
          >
            {units.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
            ))}
          </select>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Balance TOE vs Real */}
        <div className="glass-panel" style={{ padding: '2rem', gridColumn: '1 / -1' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>
            Balance del Pie de Fuerza (TOE vs. Real) - {unitId}
          </h3>
          <div style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={toeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="mosCode" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: '#fff' }} />
                <Legend />
                <Bar dataKey="required" name="Requeridos (TOE)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Físicos Reales" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Disponibilidad Humana */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>
            Disponibilidad Humana
          </h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={availData}
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {availData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: '#fff' }} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', textAlign: 'center' }}>
             <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Fuerza</span>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--alert-success)', margin: '0.5rem 0 0 0' }}>
                  {availability ? availability.aptos + availability.noAptos + availability.excusados + availability.licencias : 0}
                </p>
             </div>
             <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No Disponibles</span>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--alert-danger)', margin: '0.5rem 0 0 0' }}>
                  {availability ? availability.noAptos + availability.excusados + availability.licencias : 0}
                </p>
             </div>
          </div>
        </div>

        {/* Métricas de Permanencia */}
        <div className="glass-panel" style={{ padding: '2rem', gridColumn: '1 / -1' }}>
          <h3 style={{ color: 'var(--alert-warning)', marginBottom: '1rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '10px' }}>
             ⚠️ Alertas de Criticidad de Rotación ({'>'}24 Meses)
          </h3>
          {criticalRotation.length === 0 ? (
             <p style={{ color: 'var(--text-secondary)' }}>No hay personal en estado crítico de permanencia en esta unidad.</p>
          ) : (
             <div style={{ overflowX: 'auto' }}>
               <table className="data-table">
                 <thead>
                   <tr>
                     <th>Nombre</th>
                     <th>Grado</th>
                     <th>Especialidad</th>
                     <th>Meses en Cargo</th>
                     <th>Acción Recomendada</th>
                   </tr>
                 </thead>
                 <tbody>
                   {criticalRotation.map((s, idx) => (
                     <tr key={idx}>
                       <td>{s.name}</td>
                       <td>{s.rank}</td>
                       <td>{s.mosCode}</td>
                       <td>
                          <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--alert-danger)', padding: '0.2rem 0.5rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                            {s.timeInPosition} Meses
                          </span>
                       </td>
                       <td>
                         <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                            Proyectar Traslado
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AnalysisDashboard;
