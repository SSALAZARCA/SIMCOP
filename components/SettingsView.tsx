import React, { useState, useEffect } from 'react';
import { Settings, Key, Save, CheckCircle, AlertCircle, Loader, Cpu, Server } from 'lucide-react';
import { configService } from '../services/configService';
import { initializeApiKey } from '../utils/geminiService';
import NativeAITelemetry from './NativeAITelemetry';

const SettingsView: React.FC = () => {
    const [aiProvider, setAiProvider] = useState<'GEMINI' | 'LOCAL_OLLAMA' | 'LOCAL_LMLink' | 'NATIVE_SIMCOP'>('GEMINI');
    const [localEndpoint, setLocalEndpoint] = useState('http://localhost:11434');
    const [localModel, setLocalModel] = useState('llama3');
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [savedKey, setSavedKey] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [showKey, setShowKey] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        // Load saved configuration from backend
        const loadConfiguration = async () => {
            try {
                setLoading(true);
                
                // Load Gemini key
                const apiKey = await configService.getGeminiApiKey();
                if (apiKey) {
                    setSavedKey(apiKey);
                    setGeminiApiKey(apiKey);
                }

                // Load AI Provider Config
                const aiConfig = await configService.getAIProviderConfig();
                if (aiConfig) {
                    setAiProvider(aiConfig.provider as any);
                    setLocalEndpoint(aiConfig.localEndpoint || 'http://localhost:11434');
                    setLocalModel(aiConfig.localModel || 'llama3');
                }
            } catch (error) {
                console.error('Error loading config:', error);
                setErrorMessage('Error al cargar la configuración');
            } finally {
                setLoading(false);
            }
        };

        loadConfiguration();
    }, []);

    const handleSave = async () => {
        // Validation based on provider
        if (aiProvider === 'GEMINI') {
            if (!geminiApiKey.trim()) {
                setErrorMessage('La API key de Gemini no puede estar vacía');
                setSaveStatus('error');
                setTimeout(() => setSaveStatus('idle'), 3000);
                return;
            }

            if (!geminiApiKey.startsWith('AIza')) {
                setErrorMessage('La API key de Gemini debe comenzar con "AIza"');
                setSaveStatus('error');
                setTimeout(() => setSaveStatus('idle'), 3000);
                return;
            }
        } else {
            if (!localEndpoint.trim()) {
                setErrorMessage('El endpoint de Ollama no puede estar vacío');
                setSaveStatus('error');
                setTimeout(() => setSaveStatus('idle'), 3000);
                return;
            }
            if (!localModel.trim()) {
                setErrorMessage('El nombre del modelo local no puede estar vacío');
                setSaveStatus('error');
                setTimeout(() => setSaveStatus('idle'), 3000);
                return;
            }
        }

        try {
            setLoading(true);
            console.log('🔑 Guardando configuración de IA...');

            // Save API key if Gemini is selected or if LMLink has an optional key
            if (aiProvider === 'GEMINI' || aiProvider === 'LOCAL_LMLink') {
                await configService.saveGeminiApiKey(geminiApiKey, 'admin');
                await initializeApiKey();
                setSavedKey(geminiApiKey);
            }

            // Save AI Provider Config (provider, localEndpoint, localModel)
            await configService.saveAIProviderConfig(aiProvider, localEndpoint, localModel, 'admin');

            setSaveStatus('success');
            setErrorMessage('');

            // Success reload
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error: any) {
            console.error('❌ Error al guardar configuración de IA:', error);
            setErrorMessage(error.message || 'Error al guardar la configuración');
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleClear = async () => {
        try {
            setLoading(true);
            // Delete key
            await configService.deleteGeminiApiKey();
            // Reset provider to Gemini default
            await configService.saveAIProviderConfig('GEMINI', 'http://localhost:11434', 'llama3', 'admin');
            
            setGeminiApiKey('');
            setSavedKey('');
            setAiProvider('GEMINI');
            setLocalEndpoint('http://localhost:11434');
            setLocalModel('llama3');
            setSaveStatus('idle');
            setErrorMessage('');

            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error: any) {
            console.error('Error al resetear configuración:', error);
            setErrorMessage(error.message || 'Error al resetear configuración');
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
                    Configuración del Sistema
                </h1>
            </div>

            <div style={{
                backgroundColor: '#1e293b',
                borderRadius: '12px',
                padding: '2rem',
                border: '1px solid #334155',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
            }}>
                {/* AI Provider selector */}
                <div style={{ marginBottom: '2rem' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '0.75rem',
                        color: '#94a3b8',
                        fontWeight: '500',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        Proveedor de Inteligencia Artificial (IA)
                    </label>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem',
                        backgroundColor: '#0f172a',
                        padding: '0.375rem',
                        borderRadius: '8px',
                        border: '1px solid #334155'
                    }}>
                        <button
                            onClick={() => setAiProvider('GEMINI')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 1rem',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                                backgroundColor: aiProvider === 'GEMINI' ? '#3b82f6' : 'transparent',
                                color: aiProvider === 'GEMINI' ? 'white' : '#94a3b8',
                            }}
                        >
                            <Key size={18} />
                            Google Gemini Cloud
                        </button>
                        <button
                            onClick={() => setAiProvider('LOCAL_OLLAMA')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 1rem',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                                backgroundColor: aiProvider === 'LOCAL_OLLAMA' ? '#3b82f6' : 'transparent',
                                color: aiProvider === 'LOCAL_OLLAMA' ? 'white' : '#94a3b8',
                            }}
                        >
                            <Cpu size={18} />
                            IA Local (Ollama)
                        </button>
                        <button
                            onClick={() => setAiProvider('LOCAL_LMLink')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 1rem',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                                backgroundColor: aiProvider === 'LOCAL_LMLink' ? '#3b82f6' : 'transparent',
                                color: aiProvider === 'LOCAL_LMLink' ? 'white' : '#94a3b8',
                            }}
                        >
                            <Cpu size={18} />
                            LMLink
                        </button>
                        <button
                            onClick={() => setAiProvider('NATIVE_SIMCOP')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 1rem',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                                backgroundColor: aiProvider === 'NATIVE_SIMCOP' ? '#10b981' : 'transparent',
                                color: aiProvider === 'NATIVE_SIMCOP' ? 'white' : '#94a3b8',
                            }}
                        >
                            <Server size={18} />
                            IA Nativa SIMCOP
                        </button>
                    </div>
                </div>

                {/* Conditional configuration panels */}
                {aiProvider === 'GEMINI' ? (
                    <div style={{
                        animation: 'fadeIn 0.3s ease-out',
                        marginBottom: '2rem'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            marginBottom: '1.25rem',
                        }}>
                            <Key size={22} color="#60a5fa" />
                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc' }}>
                                Credenciales de Google Gemini
                            </h3>
                        </div>

                        <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1rem' }}>
                            Usa la API en la nube oficial de Google. Requiere una conexión de red activa y una API key configurada.
                        </p>
                        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                            Obtén una clave gratis en:{' '}
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#60a5fa', textDecoration: 'underline' }}
                            >
                                Google AI Studio
                            </a>
                        </p>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                color: '#e2e8f0',
                                fontWeight: '500',
                            }}>
                                Gemini API Key
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
                                        padding: '0.75rem 3.5rem 0.75rem 0.75rem',
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
                                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid #1e3a8a',
                                color: '#60a5fa',
                                fontSize: '0.875rem',
                            }}>
                                ✓ API Key actual guardada: {maskApiKey(savedKey)}
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{
                        animation: 'fadeIn 0.3s ease-out',
                        marginBottom: '2rem'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            marginBottom: '1.25rem',
                        }}>
                            <Server size={22} color="#10b981" />
                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc' }}>
                                {aiProvider === 'LOCAL_LMLink' ? 'Servidor Local de IA (LMLink)' : aiProvider === 'NATIVE_SIMCOP' ? 'Motor Nativo SIMCOP AI (PyTorch)' : 'Servidor Local de IA (Ollama)'}
                            </h3>
                        </div>

                        <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                            {aiProvider === 'LOCAL_LMLink' ? 'Conéctate a tu PC remoto con GPU mediante la red Mesh P2P de LM Studio. Las peticiones irán por un túnel cifrado WireGuard de extremo a extremo garantizando máxima privacidad y baja latencia, sin exponer puertos al internet público.' : aiProvider === 'NATIVE_SIMCOP' ? 'Conéctate directamente al motor de inteligencia artificial especializado FastAPI + PyTorch de SIMCOP. Para el VPS, asegúrate de ingresar la IP o URL del backend (ej: http://TU_IP_DEL_VPS/api/v1).' : 'Conéctate a una IA alojada localmente en tu propia máquina mediante Ollama. Esto garantiza 100% de soberanía, privacidad de datos y no requiere conexión a Internet.'}
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    color: '#e2e8f0',
                                    fontWeight: '500',
                                    fontSize: '0.875rem'
                                }}>
                                    Dirección del Servidor {aiProvider === 'NATIVE_SIMCOP' ? '(Backend API)' : '(Túnel Local)'}
                                </label>
                                <input
                                    type="text"
                                    value={localEndpoint}
                                    onChange={(e) => setLocalEndpoint(e.target.value)}
                                    placeholder={aiProvider === 'LOCAL_LMLink' ? 'http://localhost:1234' : aiProvider === 'NATIVE_SIMCOP' ? 'http://localhost:8000' : 'http://localhost:11434'}
                                    disabled={loading}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        backgroundColor: '#0f172a',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        color: '#e2e8f0',
                                        fontSize: '0.95rem',
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    color: '#e2e8f0',
                                    fontWeight: '500',
                                    fontSize: '0.875rem'
                                }}>
                                    {aiProvider === 'LOCAL_LMLink' ? 'Modelo LMLink a Utilizar' : aiProvider === 'NATIVE_SIMCOP' ? 'Modelo Quantizado PTH' : 'Modelo Ollama a Utilizar'}
                                </label>
                                <input
                                    type="text"
                                    value={localModel}
                                    onChange={(e) => setLocalModel(e.target.value)}
                                    placeholder={aiProvider === 'LOCAL_LMLink' ? 'gemma4-damasco' : aiProvider === 'NATIVE_SIMCOP' ? 'simcop_nlp_weights_quantized_int8.pth' : 'llama3'}
                                    disabled={loading}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        backgroundColor: '#0f172a',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        color: '#e2e8f0',
                                        fontSize: '0.95rem',
                                    }}
                                />
                            </div>
                        </div>

                        {aiProvider === 'LOCAL_LMLink' && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    color: '#e2e8f0',
                                    fontWeight: '500',
                                    fontSize: '0.875rem'
                                }}>
                                    API Key de LMLink (Opcional si usas Tailscale)
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        value={geminiApiKey}
                                        onChange={(e) => setGeminiApiKey(e.target.value)}
                                        placeholder="Ingresa la contraseña / Token de acceso"
                                        disabled={loading}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            paddingRight: '4rem',
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
                        )}

                        <div style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            borderRadius: '8px',
                            padding: '1rem',
                            marginTop: '0.5rem'
                        }}>
                            <p style={{ margin: 0, color: '#a7f3d0', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                \uD83D\uDCA1 <strong>Requisito:</strong> {aiProvider === 'LOCAL_LMLink' ? 'Aseg\u00FArate de haber iniciado el t\u00FAnel ejecutando `lms link connect` en esta misma terminal. SIMCOP enviar\u00E1 las peticiones a tu localhost y el agente lms las cifrar\u00E1 y enviar\u00E1 por la red Mesh (Wireguard) hacia tu GPU central.' : 'Aseg\u00FArate de que Ollama est\u00E9 ejecut\u00E1ndose localmente (`ollama serve`) y que hayas descargado el modelo especificado ejecutando `ollama pull llama3` en tu terminal.'}
                            </p>
                        </div>
                    </div>
                )}

                {aiProvider === 'NATIVE_SIMCOP' && (
                    <NativeAITelemetry endpoint={localEndpoint} />
                )}

                {/* Status messages */}
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
                        <span>Configuración guardada exitosamente. Recargando aplicación...</span>
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

                {/* OSINT Webhook Config */}
                <div style={{
                    marginTop: '2rem',
                    marginBottom: '1.5rem',
                    padding: '1.5rem',
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                }}>
                    <h3 style={{ color: '#e2e8f0', fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>📡</span> Integración Webhook OSINT Externo
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                        Utiliza estos datos para configurar tu agente o bot externo. Las alertas enviadas aquí se procesarán automáticamente sin consumir cuota de la API de IA.
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: 'bold' }}>
                                URL del Webhook (POST)
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input 
                                    type="text" 
                                    readOnly 
                                    value="https://api.simcop.site/api/osint/webhook" 
                                    style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #334155', color: '#38bdf8', padding: '0.5rem', borderRadius: '4px', fontSize: '0.875rem' }}
                                />
                                <button 
                                    onClick={() => navigator.clipboard.writeText('https://api.simcop.site/api/osint/webhook')}
                                    style={{ backgroundColor: '#334155', border: 'none', color: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
                                >
                                    Copiar
                                </button>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: 'bold' }}>
                                Cabecera de Autenticación (X-Webhook-Token)
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input 
                                    type="text" 
                                    readOnly 
                                    value="simcop-osint-secret-2026" 
                                    style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #334155', color: '#a3e635', padding: '0.5rem', borderRadius: '4px', fontSize: '0.875rem' }}
                                />
                                <button 
                                    onClick={() => navigator.clipboard.writeText('simcop-osint-secret-2026')}
                                    style={{ backgroundColor: '#334155', border: 'none', color: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
                                >
                                    Copiar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    borderTop: '1px solid #334155',
                    paddingTop: '1.5rem',
                    marginTop: '1.5rem'
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
                        Restablecer Predeterminados
                    </button>
                </div>

                <div style={{
                    marginTop: '2rem',
                    padding: '1rem',
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                }}>
                    <h3 style={{ color: '#e2e8f0', fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🛡️</span> Soberanía & Privacidad de Datos
                    </h3>
                    <ul style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0, paddingLeft: '1.5rem', lineHeight: '1.5' }}>
                        <li>Al seleccionar **IA Local (Ollama)**, todas las solicitudes de análisis militar, predicción logística y resúmenes se procesan de forma privada en tu hardware sin salir a servidores externos.</li>
                        <li>Las API keys de Google Gemini se almacenan encriptadas en la base de datos local de forma segura.</li>
                        <li>La configuración modificada se aplicará de forma global para todos los terminales tácticos conectados a esta instancia de SIMCOP.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
