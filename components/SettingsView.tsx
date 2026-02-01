import React, { useState, useEffect } from 'react';
import { Settings, Key, Save, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { configService } from '../services/configService';
import { initializeApiKey } from '../utils/geminiService';

const SettingsView: React.FC = () => {
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [savedKey, setSavedKey] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [showKey, setShowKey] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        // Load saved API key from backend
        const loadApiKey = async () => {
            try {
                setLoading(true);
                const apiKey = await configService.getGeminiApiKey();
                if (apiKey) {
                    setSavedKey(apiKey);
                    setGeminiApiKey(apiKey);
                }
            } catch (error) {
                console.error('Error loading API key:', error);
                setErrorMessage('Error al cargar la configuración');
            } finally {
                setLoading(false);
            }
        };

        loadApiKey();
    }, []);

    const handleSave = async () => {
        if (!geminiApiKey.trim()) {
            setErrorMessage('La API key no puede estar vacía');
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
            return;
        }

        // Validate API key format (should start with AIza)
        if (!geminiApiKey.startsWith('AIza')) {
            setErrorMessage('La API key debe comenzar con "AIza"');
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
            return;
        }

        try {
            setLoading(true);
            console.log('🔑 Intentando guardar API key...');
            await configService.saveGeminiApiKey(geminiApiKey, 'admin');
            console.log('✅ API key guardada exitosamente');

            // Reinitialize Gemini service with new API key
            console.log('🔄 Reinicializando servicio Gemini...');
            await initializeApiKey();
            console.log('✅ Servicio Gemini reinicializado');

            setSavedKey(geminiApiKey);
            setSaveStatus('success');
            setErrorMessage('');

            // Show success message for 2 seconds, then reload
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error: any) {
            console.error('❌ Error completo al guardar API key:', error);
            console.error('❌ Mensaje de error:', error.message);
            console.error('❌ Stack trace:', error.stack);

            let userMessage = 'Error al guardar la API key';
            if (error.message) {
                userMessage = error.message;
            }

            setErrorMessage(userMessage);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleClear = async () => {
        try {
            setLoading(true);
            await configService.deleteGeminiApiKey();
            setGeminiApiKey('');
            setSavedKey('');
            setSaveStatus('idle');
            setErrorMessage('');

            // Reload to reinitialize without API key
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error: any) {
            console.error('Error deleting API key:', error);
            setErrorMessage(error.message || 'Error al eliminar la API key');
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } finally {
            setLoading(false);
        }
    };

    const maskApiKey = (key: string) => {
        if (key.length <= 8) return key;
        return key.substring(0, 8) + '•'.repeat(key.length - 8);
    };

    if (loading && !geminiApiKey) {
        return (
            <div className="settings-view" style={{
                padding: '2rem',
                maxWidth: '800px',
                margin: '0 auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px',
            }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader size={48} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Cargando configuración...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-view" style={{
            padding: '2rem',
            maxWidth: '800px',
            margin: '0 auto',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '2rem',
            }}>
                <Settings size={32} color="#3b82f6" />
                <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>
                    Configuración
                </h1>
            </div>

            <div style={{
                backgroundColor: '#1e293b',
                borderRadius: '12px',
                padding: '2rem',
                border: '1px solid #334155',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1.5rem',
                }}>
                    <Key size={24} color="#3b82f6" />
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
                        API Key de Google Gemini
                    </h2>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
                        Ingresa tu API key de Google Gemini para habilitar las funcionalidades de IA en SIMCOP.
                    </p>
                    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                        Puedes obtener una API key gratuita en:{' '}
                        <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#3b82f6', textDecoration: 'underline' }}
                        >
                            Google AI Studio
                        </a>
                    </p>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        color: '#e2e8f0',
                        fontWeight: '500',
                    }}>
                        API Key
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showKey ? 'text' : 'password'}
                            value={geminiApiKey}
                            onChange={(e) => setGeminiApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                backgroundColor: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: '#e2e8f0',
                                fontSize: '1rem',
                                fontFamily: 'monospace',
                            }}
                        />
                        <button
                            onClick={() => setShowKey(!showKey)}
                            disabled={loading}
                            style={{
                                position: 'absolute',
                                right: '0.75rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: '#64748b',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '0.875rem',
                            }}
                        >
                            {showKey ? 'Ocultar' : 'Mostrar'}
                        </button>
                    </div>
                </div>

                {savedKey && (
                    <div style={{
                        backgroundColor: '#0f172a',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        border: '1px solid #1e40af',
                    }}>
                        <p style={{ color: '#60a5fa', fontSize: '0.875rem', margin: 0 }}>
                            ✓ API Key guardada: {maskApiKey(savedKey)}
                        </p>
                    </div>
                )}

                {saveStatus === 'success' && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        backgroundColor: '#064e3b',
                        color: '#6ee7b7',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        border: '1px solid #047857',
                    }}>
                        <CheckCircle size={20} />
                        <span>API Key guardada exitosamente. Recargando aplicación...</span>
                    </div>
                )}

                {saveStatus === 'error' && errorMessage && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        backgroundColor: '#7f1d1d',
                        color: '#fca5a5',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        border: '1px solid #991b1b',
                    }}>
                        <AlertCircle size={20} />
                        <span>{errorMessage}</span>
                    </div>
                )}

                <div style={{
                    display: 'flex',
                    gap: '1rem',
                }}>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            backgroundColor: loading ? '#475569' : '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: '500',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#2563eb')}
                        onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#3b82f6')}
                    >
                        {loading ? <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={20} />}
                        {loading ? 'Guardando...' : 'Guardar Configuración'}
                    </button>

                    {savedKey && (
                        <button
                            onClick={handleClear}
                            disabled={loading}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: '#475569',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: '500',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#334155')}
                            onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#475569')}
                        >
                            Limpiar
                        </button>
                    )}
                </div>

                <div style={{
                    marginTop: '2rem',
                    padding: '1rem',
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                }}>
                    <h3 style={{ color: '#e2e8f0', fontSize: '1rem', marginBottom: '0.5rem' }}>
                        ℹ️ Información de Seguridad
                    </h3>
                    <ul style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0, paddingLeft: '1.5rem' }}>
                        <li>Tu API key se guarda de forma segura en la base de datos del servidor</li>
                        <li>Los valores se encriptan antes de almacenarse</li>
                        <li>Solo administradores pueden modificar la configuración</li>
                        <li>La aplicación se recargará automáticamente al guardar cambios</li>
                        <li>La configuración es compartida por todos los usuarios de SIMCOP</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
