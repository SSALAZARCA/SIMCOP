import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { SIGEP_API_URL } from '../apiConfig';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${SIGEP_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Credenciales inválidas');
      
      login(data.token, data.simcopToken, data.username, data.role, data.unitId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-panel" style={{ padding: '3rem', width: '100%', maxWidth: '400px' }}>
        <h1 className="brand-title" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>SIGEP</h1>
        <p className="brand-subtitle" style={{ textAlign: 'center', marginBottom: '2rem' }}>Autenticación Táctica</p>
        
        {error && <div style={{ color: 'var(--alert-danger)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Usuario ORBAT</label>
            <input 
              type="text" 
              className="form-control" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ejercito, division, brigada, batallon"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input 
              type="password" 
              className="form-control" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="password"
              required
            />
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Ingresar al Sistema</button>
        </form>
      </div>
    </div>
  );
}
