import React, { useState, useRef } from 'react';
import { UploadCloud, X, Loader as LoaderIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function IngestModal({ isOpen, onClose }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [progressText, setProgressText] = useState('');
    const [error, setError] = useState(null);
    const fileInputRef = useRef();
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setError(null);
        setProgressText('Extracting knowledge from PDF...');

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Get current session for Auth
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            // We expect the FastAPI backend to be running on port 8001
            const response = await fetch('http://127.0.0.1:8001/api/ingest/pdf', {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: formData,
            });

            setProgressText('Architecting the Mental Palace...');

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to process document');
            }

            const palaceData = await response.json();

            setProgressText('Environment Established. Initializing...');

            // Navigate to the newly created palace view
            setTimeout(() => navigate(`/palace/${palaceData.id}`), 1000);

        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 0, 11, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem'
        }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
                <button
                    onClick={onClose}
                    disabled={loading}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>

                <h2 className="heading-glow" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Construct New Palace</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Upload a study document to generate its 3D architecture.</p>

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#f87171', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                        {error}
                    </div>
                )}

                {!loading ? (
                    <>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: '2px dashed var(--border-neon)',
                                borderRadius: '12px',
                                padding: '3rem 2rem',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                backgroundColor: 'rgba(124, 58, 237, 0.05)',
                                marginBottom: '1.5rem'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary-bright)';
                                e.currentTarget.style.backgroundColor = 'rgba(124, 58, 237, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border-neon)';
                                e.currentTarget.style.backgroundColor = 'rgba(124, 58, 237, 0.05)';
                            }}
                        >
                            <UploadCloud size={48} color="var(--primary-bright)" style={{ marginBottom: '1rem', display: 'inline-block' }} />
                            <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                                {file ? file.name : "Click to select a PDF"}
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Maximum 500 pages (approx. 20MB)</p>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                style={{ display: 'none' }}
                                onChange={(e) => setFile(e.target.files[0])}
                            />
                        </div>

                        <button
                            className="btn-neon"
                            style={{ width: '100%', opacity: file ? 1 : 0.5, cursor: file ? 'pointer' : 'not-allowed' }}
                            onClick={handleUpload}
                            disabled={!file}
                        >
                            Launch Neural Pipeline
                        </button>
                    </>
                ) : (
                    <div className="flex-center" style={{ flexDirection: 'column', gap: '2rem', padding: '2rem 0' }}>
                        <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid var(--border-neon)' }}></div>
                            <div
                                className="animate-spin"
                                style={{
                                    position: 'absolute', inset: 0, borderRadius: '50%',
                                    borderTop: '2px solid var(--primary-bright)',
                                    animation: 'spin 1s linear infinite'
                                }}></div>
                            <div className="flex-center" style={{ width: '100%', height: '100%' }}>
                                <LoaderIcon size={40} color="var(--primary-bright)" />
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h3 className="heading-glow" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Processing Data</h3>
                            <p style={{ color: 'var(--text-muted)' }}>{progressText}</p>
                        </div>
                        <style>{`
              @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
                    </div>
                )}
            </div>
        </div>
    );
}
