import React, { useState, useEffect } from 'react';
import { DatabaseStats, AdminAuditLog, UserRole } from '../types';
import { adminService } from '../services/adminService';
import { ShieldExclamationIcon, TableCellsIcon, ChartBarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const ADMIN_TABLES = [
  'users',
  'military_units',
  'alerts',
  'osint_events',
  'fire_missions',
];

export const AdminDashboardComponent: React.FC = () => {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'tables' | 'audit'>('stats');
  const [selectedTable, setSelectedTable] = useState<string>(ADMIN_TABLES[0]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  
  const [totpCode, setTotpCode] = useState('');
  const [isTruncating, setIsTruncating] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);
  
  const fetchStats = async () => {
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTableData = async (tableName: string) => {
    try {
      const data = await adminService.getTableData(tableName);
      setTableData(data);
    } catch (err) {
      console.error(err);
      setTableData([]);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const logs = await adminService.getAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'tables') {
      fetchTableData(selectedTable);
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, selectedTable]);

  const handleTruncate = async () => {
    if (!totpCode || totpCode.trim().length !== 6) {
      setMessage({ text: 'Por favor, ingrese un código 2FA válido de 6 dígitos.', type: 'error' });
      return;
    }
    
    if (window.confirm(`¿Está SEGURO de que desea VACIAR COMPLETAMENTE la tabla ${selectedTable}? Esta acción no se puede deshacer y requiere validación 2FA.`)) {
      setIsTruncating(true);
      setMessage(null);
      try {
        const res = await adminService.truncateTable(selectedTable, totpCode);
        setMessage({ text: res, type: 'success' });
        setTotpCode('');
        fetchTableData(selectedTable);
        fetchStats();
      } catch (err: any) {
        setMessage({ text: err.message, type: 'error' });
      } finally {
        setIsTruncating(false);
      }
    }
  };

  return (
    <div className="flex-1 p-6 bg-gray-900 text-white overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ShieldExclamationIcon className="w-8 h-8 text-red-500" />
          Módulo de Administración de Base de Datos
        </h1>
        <button onClick={fetchStats} className="btn-secondary flex items-center gap-2">
          <ArrowPathIcon className="w-5 h-5" />
          Actualizar
        </button>
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-700 pb-2">
        <button 
          onClick={() => setActiveTab('stats')} 
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${activeTab === 'stats' ? 'bg-gray-800 text-blue-400' : 'hover:bg-gray-800/50 text-gray-400'}`}
        >
          <ChartBarIcon className="w-5 h-5" />
          Métricas y Estadísticas
        </button>
        <button 
          onClick={() => setActiveTab('tables')} 
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${activeTab === 'tables' ? 'bg-gray-800 text-blue-400' : 'hover:bg-gray-800/50 text-gray-400'}`}
        >
          <TableCellsIcon className="w-5 h-5" />
          Explorador de Tablas Crudas
        </button>
        <button 
          onClick={() => setActiveTab('audit')} 
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${activeTab === 'audit' ? 'bg-gray-800 text-blue-400' : 'hover:bg-gray-800/50 text-gray-400'}`}
        >
          <ShieldExclamationIcon className="w-5 h-5" />
          Registro de Auditoría (Histórico)
        </button>
      </div>

      {activeTab === 'stats' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Usuarios Totales" value={stats.totalUsers} />
          <StatCard title="Unidades Creadas" value={stats.totalUnits} />
          <StatCard title="Alertas" value={stats.totalAlerts} />
          <StatCard title="Eventos OSINT" value={stats.totalOsintEvents} />
          <StatCard title="Misiones de Fuego" value={stats.totalFireMissions} />
        </div>
      )}

      {activeTab === 'tables' && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <select 
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              {ADMIN_TABLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <div className="flex items-center gap-3 bg-red-900/30 p-2 rounded-lg border border-red-800/50">
              <input 
                type="text" 
                placeholder="Código 2FA" 
                value={totpCode}
                onChange={e => setTotpCode(e.target.value)}
                className="bg-gray-900 border border-red-700 rounded-md px-3 py-1 w-32 focus:outline-none"
              />
              <button 
                onClick={handleTruncate}
                disabled={isTruncating}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded-md text-sm font-semibold transition-colors disabled:opacity-50"
              >
                VACIAR TABLA
              </button>
            </div>
          </div>
          
          {message && (
            <div className={`p-4 mb-6 rounded-md ${message.type === 'error' ? 'bg-red-900/50 text-red-200 border border-red-800' : 'bg-green-900/50 text-green-200 border border-green-800'}`}>
              {message.text}
            </div>
          )}

          <div className="overflow-x-auto">
            {tableData.length === 0 ? (
              <p className="text-gray-400 text-center py-8">La tabla está vacía.</p>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-gray-900 text-gray-300">
                  <tr>
                    {Object.keys(tableData[0]).map(key => (
                      <th key={key} className="px-6 py-3">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => (
                    <tr key={i} className="border-b border-gray-700 hover:bg-gray-700/50">
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} className="px-6 py-4 truncate max-w-xs">{String(val)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-200">Histórico de Acciones Destructivas</h2>
          <div className="overflow-x-auto">
            {auditLogs.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No hay registros de auditoría disponibles.</p>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-gray-900 text-gray-300">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Acción</th>
                    <th className="px-4 py-3">Objetivo</th>
                    <th className="px-4 py-3">Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-700 hover:bg-gray-700/50 text-red-200">
                      <td className="px-4 py-3">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold">{log.username}</td>
                      <td className="px-4 py-3">{log.action}</td>
                      <td className="px-4 py-3">{log.target}</td>
                      <td className="px-4 py-3">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value }: { title: string, value: number }) => (
  <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex flex-col items-center justify-center shadow-lg">
    <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">{title}</h3>
    <span className="text-4xl font-bold text-blue-400">{value}</span>
  </div>
);
