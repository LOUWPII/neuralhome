import React, { useState, useRef } from 'react';
import { UploadCloud, X, Loader as LoaderIcon, MessageSquare, Send, Camera, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';



export default function RoomCreationModal({ isOpen, onClose }) {
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [objectives, setObjectives] = useState('');
    const [selectedTheme, setSelectedTheme] = useState('neon_dev');
    const [file, setFile] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hello! I'm the Neural Architect. Tell me what you want to study and I'll help you define clear learning objectives and a study roadmap." }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);

    const [loading, setLoading] = useState(false);
    const [progressText, setProgressText] = useState('');
    const [error, setError] = useState(null);
    const fileInputRef = useRef();
    const photoInputRef = useRef();

    if (!isOpen) return null;

    const handleSendMessage = async (e) => {
        e?.preventDefault();
        if (!chatInput.trim()) return;

        const newMsg = { role: 'user', content: chatInput };
        setMessages(prev => [...prev, newMsg]);
        setChatInput('');
        setIsChatting(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));

            const response = await fetch('http://127.0.0.1:8001/api/ingest/architect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ message: newMsg.content, history })
            });

            if (!response.ok) throw new Error('Architect failed to respond');
            const data = await response.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Connection lost. Try again.' }]);
        } finally {
            setIsChatting(false);
        }
    };

    const handleUpload = async () => {
        if (!file || !title) {
            setError('Room Title and PDF are mandatory. Photo is optional but recommended for Dynamic Room.');
            return;
        }
        setLoading(true);
        setError(null);
        setProgressText(photoFile ? 'Analyzing your room photo...' : 'Extracting knowledge from PDF...');

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('subject', subject);
            formData.append('objectives', objectives);

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            let endpoint = 'http://127.0.0.1:8001/api/ingest/pdf';

            if (photoFile) {
                endpoint = 'http://127.0.0.1:8001/api/ingest/photo-pdf';
                formData.append('photo', photoFile);
                formData.append('pdf', file);
                formData.append('description', 'dynamic'); // Set theme to dynamic if photo exists
            } else {
                formData.append('file', file);
                formData.append('description', selectedTheme);
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
                body: formData,
            });

            if (photoFile) setProgressText('Creating your 3D Digital Twin...');
            else setProgressText('Mapping concepts to room...');

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to process document');
            }

            const palaceData = await response.json();
            setProgressText('Room constructed. Entering...');
            setTimeout(() => navigate(`/palace/${palaceData.id}`), 800);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(5, 0, 11, 0.92)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '2rem'
        }}>
            <div className="glass-panel" style={{
                width: '100%', maxWidth: '1100px', maxHeight: '90vh', display: 'flex', position: 'relative', overflow: 'hidden', borderRadius: '16px'
            }}>
                <button onClick={onClose} disabled={loading} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', zIndex: 10 }}>
                    <X size={24} />
                </button>

                {loading ? (
                    <div className="flex-center" style={{ width: '100%', flexDirection: 'column', gap: '2rem', padding: '4rem' }}>
                        <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid var(--border-neon)' }}></div>
                            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', borderTop: '2px solid var(--primary-bright)', animation: 'spin 1s linear infinite' }}></div>
                            <div className="flex-center" style={{ width: '100%', height: '100%' }}>
                                <LoaderIcon size={36} color="var(--primary-bright)" />
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h3 className="heading-glow" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Building Your Room</h3>
                            <p style={{ color: 'var(--text-muted)' }}>{progressText}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* LEFT — ARCHITECT CHAT */}
                        <div style={{ flex: '1', borderRight: '1px solid rgba(124, 58, 237, 0.2)', display: 'flex', flexDirection: 'column', padding: '2rem', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <MessageSquare color="var(--primary-bright)" size={20} />
                                <h2 className="heading-glow" style={{ fontSize: '1.25rem', margin: 0 }}>Neural Architect</h2>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem', paddingRight: '0.25rem' }}>
                                {messages.map((msg, idx) => (
                                    <div key={idx} style={{
                                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                        background: msg.role === 'user' ? 'rgba(124, 58, 237, 0.2)' : 'rgba(255,255,255,0.04)',
                                        border: msg.role === 'user' ? '1px solid rgba(124, 58, 237, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                                        padding: '0.75rem 1rem', borderRadius: '12px', maxWidth: '88%',
                                        fontSize: '0.875rem', lineHeight: '1.55', color: 'var(--text-main)'
                                    }}>
                                        {msg.content}
                                    </div>
                                ))}
                                {isChatting && (
                                    <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>
                                        Architect thinking...
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="text" className="input-field"
                                    placeholder="Ask about your study goals..."
                                    value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button type="submit" className="btn-neon" disabled={isChatting} style={{ padding: '0.75rem' }}>
                                    <Send size={16} />
                                </button>
                            </form>
                        </div>

                        {/* RIGHT — CONFIGURATION */}
                        <div style={{ flex: '1', padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0 }}>
                            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: 0 }}>New Room</h2>

                            {error && <div style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem' }}>{error}</div>}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Room Title:</label>
                                    <input className="input-field" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Advanced Calculus" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Subject:</label>
                                    <input className="input-field" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Mathematics" />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Study Objectives:</label>
                                <input className="input-field" value={objectives} onChange={e => setObjectives(e.target.value)} placeholder="e.g. Master integration techniques" />
                            </div>



                            {/* UPLOADS SECTION */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                {/* PDF UPLOAD */}
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        border: file ? '1px solid var(--primary-bright)' : '1px dashed rgba(124,58,237,0.4)',
                                        borderRadius: '10px', padding: '1rem', textAlign: 'center', cursor: 'pointer',
                                        background: file ? 'rgba(124,58,237,0.08)' : 'transparent', transition: 'all 0.3s',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100px'
                                    }}
                                >
                                    <FileText size={24} color={file ? "var(--primary-bright)" : "var(--text-muted)"} style={{ marginBottom: '0.5rem' }} />
                                    <p style={{ margin: 0, color: file ? 'var(--text-main)' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: file ? 'bold' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                                        {file ? file.name : 'Select PDF Source'}
                                    </p>
                                    <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files[0])} />
                                </div>

                                {/* PHOTO UPLOAD (DYNAMIC ROOM) */}
                                <div
                                    onClick={() => photoInputRef.current?.click()}
                                    style={{
                                        border: photoFile ? '1px solid #22d3ee' : '1px dashed rgba(34, 211, 238, 0.4)',
                                        borderRadius: '10px', padding: '1rem', textAlign: 'center', cursor: 'pointer',
                                        background: photoFile ? 'rgba(34, 211, 238, 0.08)' : 'transparent', transition: 'all 0.3s',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100px',
                                        position: 'relative', overflow: 'hidden'
                                    }}
                                >
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Preview" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} />
                                    ) : (
                                        <Camera size={24} color={photoFile ? "#22d3ee" : "var(--text-muted)"} style={{ marginBottom: '0.5rem' }} />
                                    )}
                                    <p style={{ margin: 0, color: photoFile ? 'var(--text-main)' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: photoFile ? 'bold' : 'normal', zIndex: 1 }}>
                                        {photoFile ? 'Photo Captured' : 'Upload Room Photo'}
                                    </p>
                                    <input 
                                        ref={photoInputRef} 
                                        type="file" 
                                        accept="image/*" 
                                        style={{ display: 'none' }} 
                                        onChange={(e) => {
                                            const f = e.target.files[0];
                                            if (f) {
                                                setPhotoFile(f);
                                                setPhotoPreview(URL.createObjectURL(f));
                                                setSelectedTheme('dynamic'); // Auto-select dynamic theme
                                            }
                                        }} 
                                    />
                                </div>
                            </div>

                            <button
                                className="btn-neon"
                                style={{ marginTop: 'auto', width: '100%', opacity: (file && title) ? 1 : 0.45, pointerEvents: (file && title) ? 'auto' : 'none' }}
                                onClick={handleUpload}
                            >
                                Construct the New Room
                            </button>
                        </div>
                    </>
                )}
            </div>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
