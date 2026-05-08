import React, { useState, useRef } from 'react';
import { UploadCloud, X, Loader as LoaderIcon, MessageSquare, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ROOM_THEMES = [
    {
        id: 'neon_dev',
        name: 'Neon Dev',
        emoji: '🌆',
        description: 'Dark space with glowing magenta & cyan grids. Holographic and futuristic.',
        preview: 'linear-gradient(135deg, #020010 0%, #1a0040 50%, #0a001a 100%)',
        accent: '#c026d3',
    },
    {
        id: 'silicon_valley',
        name: 'Silicon Valley Lab',
        emoji: '🏢',
        description: 'Bright, minimal Apple-style office. Clean white floors, studio lighting, server racks.',
        preview: 'linear-gradient(135deg, #e8f4fd 0%, #c8e8fa 50%, #a0c8f0 100%)',
        accent: '#3b82f6',
    },
];

export default function RoomCreationModal({ isOpen, onClose }) {
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [objectives, setObjectives] = useState('');
    const [selectedTheme, setSelectedTheme] = useState('neon_dev');
    const [file, setFile] = useState(null);

    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hello! I'm the Neural Architect. Tell me what you want to study and I'll help you define clear learning objectives and a study roadmap." }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);

    const [loading, setLoading] = useState(false);
    const [progressText, setProgressText] = useState('');
    const [error, setError] = useState(null);
    const fileInputRef = useRef();

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
            setError('Title and PDF file are required.');
            return;
        }
        setLoading(true);
        setError(null);
        setProgressText('Extracting knowledge from PDF...');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', title);
            formData.append('subject', subject);
            formData.append('description', selectedTheme); // store the theme slug
            formData.append('objectives', objectives);

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch('http://127.0.0.1:8001/api/ingest/pdf', {
                method: 'POST',
                headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
                body: formData,
            });

            setProgressText('Mapping concepts to room...');

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
                        <div style={{
                            flex: '1',
                            padding: '2rem',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.5rem',
                            minWidth: 0,
                            background: 'linear-gradient(180deg, rgba(10,0,30,0.6) 0%, rgba(5,0,14,0.8) 100%)',
                        }}>
                            {/* Section header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: 3, height: 28,
                                    background: 'linear-gradient(180deg, #c026d3, #7c3aed)',
                                    borderRadius: '2px',
                                    boxShadow: '0 0 10px #c026d388',
                                }} />
                                <h2 style={{
                                    fontSize: '1.3rem',
                                    fontWeight: 800,
                                    color: '#f8fafc',
                                    margin: 0,
                                    letterSpacing: '-0.3px',
                                }}>
                                    New Room
                                </h2>
                            </div>

                            {error && (
                                <div style={{
                                    color: '#fca5a5',
                                    background: 'rgba(239,68,68,0.08)',
                                    border: '1px solid rgba(239,68,68,0.25)',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '10px',
                                    fontSize: '0.85rem',
                                    lineHeight: 1.5,
                                }}>
                                    {error}
                                </div>
                            )}

                            {/* ── Room Title + Subject row ─────────────────── */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <NeonField
                                    label="Room Title"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g. Advanced Calculus"
                                    icon="◈"
                                    required
                                />
                                <NeonField
                                    label="Subject"
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    placeholder="e.g. Mathematics"
                                    icon="⬡"
                                />
                            </div>

                            {/* ── Study Objectives — hero field ────────────── */}
                            <ObjectivesField
                                value={objectives}
                                onChange={e => setObjectives(e.target.value)}
                            />

                            {/* ROOM THEME SELECTOR */}
                            <div>
                                <FieldLabel icon="⬡" text="Choose Room Environment" />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                                    {ROOM_THEMES.map(theme => (
                                        <div
                                            key={theme.id}
                                            onClick={() => setSelectedTheme(theme.id)}
                                            style={{
                                                cursor: 'pointer',
                                                borderRadius: '14px',
                                                overflow: 'hidden',
                                                border: selectedTheme === theme.id
                                                    ? `1.5px solid ${theme.accent}`
                                                    : '1.5px solid rgba(255,255,255,0.07)',
                                                transition: 'all 0.22s ease',
                                                boxShadow: selectedTheme === theme.id
                                                    ? `0 0 22px ${theme.accent}44, inset 0 0 20px ${theme.accent}08`
                                                    : 'none',
                                                transform: selectedTheme === theme.id ? 'scale(1.02)' : 'scale(1)',
                                            }}
                                        >
                                            <div style={{
                                                height: '70px',
                                                background: theme.preview,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '2rem',
                                            }}>
                                                {theme.emoji}
                                            </div>
                                            <div style={{
                                                padding: '0.75rem',
                                                background: selectedTheme === theme.id
                                                    ? `${theme.accent}12`
                                                    : 'rgba(0,0,0,0.35)',
                                            }}>
                                                <p style={{
                                                    margin: '0 0 0.25rem',
                                                    fontWeight: 700,
                                                    fontSize: '0.88rem',
                                                    color: selectedTheme === theme.id ? theme.accent : '#e2e8f0',
                                                }}>
                                                    {theme.name}
                                                </p>
                                                <p style={{
                                                    margin: 0,
                                                    fontSize: '0.73rem',
                                                    color: 'rgba(255,255,255,0.4)',
                                                    lineHeight: 1.45,
                                                }}>
                                                    {theme.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* PDF UPLOAD */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    border: file
                                        ? '1px solid rgba(124,58,237,0.7)'
                                        : '1px dashed rgba(124,58,237,0.28)',
                                    borderRadius: '12px',
                                    padding: '1.25rem',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    background: file
                                        ? 'rgba(124,58,237,0.07)'
                                        : 'rgba(124,58,237,0.02)',
                                    transition: 'all 0.25s',
                                    boxShadow: file ? '0 0 16px rgba(124,58,237,0.15)' : 'none',
                                }}
                                onMouseEnter={e => { if (!file) e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)'; }}
                                onMouseLeave={e => { if (!file) e.currentTarget.style.borderColor = 'rgba(124,58,237,0.28)'; }}
                            >
                                <UploadCloud
                                    size={26}
                                    color={file ? '#a78bfa' : 'rgba(124,58,237,0.6)'}
                                    style={{ marginBottom: '0.5rem' }}
                                />
                                <p style={{
                                    margin: 0,
                                    color: file ? '#c4b5fd' : 'rgba(255,255,255,0.3)',
                                    fontSize: '0.83rem',
                                    fontWeight: file ? 600 : 400,
                                    letterSpacing: file ? '0' : '0.3px',
                                }}>
                                    {file ? file.name : 'Click to select a PDF source'}
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf"
                                    style={{ display: 'none' }}
                                    onChange={(e) => setFile(e.target.files[0])}
                                />
                            </div>

                            {/* CONSTRUCT BUTTON */}
                            <button
                                onClick={handleUpload}
                                disabled={!(file && title)}
                                style={{
                                    marginTop: 'auto',
                                    width: '100%',
                                    padding: '0.95rem',
                                    borderRadius: '12px',
                                    border: 'none',
                                    cursor: (file && title) ? 'pointer' : 'not-allowed',
                                    fontFamily: 'inherit',
                                    fontSize: '0.92rem',
                                    fontWeight: 700,
                                    letterSpacing: '0.5px',
                                    color: (file && title) ? '#fff' : 'rgba(255,255,255,0.3)',
                                    background: (file && title)
                                        ? 'linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)'
                                        : 'rgba(124,58,237,0.12)',
                                    boxShadow: (file && title)
                                        ? '0 0 28px rgba(192,38,211,0.35), 0 4px 16px rgba(124,58,237,0.3)'
                                        : 'none',
                                    transition: 'all 0.25s ease',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                                onMouseEnter={e => {
                                    if (file && title) {
                                        e.currentTarget.style.boxShadow = '0 0 40px rgba(192,38,211,0.5), 0 6px 24px rgba(124,58,237,0.45)';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.boxShadow = (file && title)
                                        ? '0 0 28px rgba(192,38,211,0.35), 0 4px 16px rgba(124,58,237,0.3)'
                                        : 'none';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                Construct the New Room
                            </button>
                        </div>
                    </>
                )}
            </div>
            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
                @keyframes neonFocusPulse {
                    0%   { box-shadow: 0 0 0 0 rgba(192,38,211,0); }
                    50%  { box-shadow: 0 0 0 3px rgba(192,38,211,0.18); }
                    100% { box-shadow: 0 0 0 0 rgba(192,38,211,0); }
                }
            `}</style>
        </div>
    );
}

/* ── NeonField — premium dark input with glow ─────────────────────────── */
function FieldLabel({ icon, text, required }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.55rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#c026d3', lineHeight: 1 }}>{icon}</span>
            <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                color: '#ffffff',
                textShadow: 'none',
            }}>
                {text}
            </span>
            {required && (
                <span style={{ fontSize: '0.65rem', color: '#c026d3', marginLeft: '2px' }}>*</span>
            )}
        </div>
    );
}

function NeonField({ label, value, onChange, placeholder, icon, required }) {
    const [focused, setFocused] = React.useState(false);
    const hasValue = value.length > 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <FieldLabel icon={icon} text={label} required={required} />
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    style={{
                        width: '100%',
                        padding: '0.7rem 0.95rem',
                        background: focused
                            ? 'rgba(124,58,237,0.1)'
                            : hasValue
                                ? 'rgba(124,58,237,0.07)'
                                : 'rgba(255,255,255,0.03)',
                        border: focused
                            ? '1px solid rgba(192,38,211,0.7)'
                            : hasValue
                                ? '1px solid rgba(124,58,237,0.4)'
                                : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        color: '#f1f5f9',
                        fontFamily: 'inherit',
                        fontSize: '0.88rem',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box',
                        boxShadow: focused
                            ? '0 0 0 3px rgba(192,38,211,0.12), 0 0 16px rgba(192,38,211,0.1)'
                            : 'none',
                        caretColor: '#c026d3',
                    }}
                />
                {/* Bottom accent line on focus */}
                <div style={{
                    position: 'absolute',
                    bottom: 0, left: '10%', right: '10%',
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, #c026d3, #7c3aed, transparent)',
                    opacity: focused ? 1 : 0,
                    transition: 'opacity 0.25s ease',
                    borderRadius: '1px',
                }} />
            </div>
        </div>
    );
}

/* ── ObjectivesField — hero textarea with enhanced visual weight ──────── */
function ObjectivesField({ value, onChange }) {
    const [focused, setFocused] = React.useState(false);
    const hasValue = value.length > 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Label row with "primary field" badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.55rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#c026d3', lineHeight: 1 }}>◈</span>
                    <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '1.2px',
                        color: '#ffffff',
                        textShadow: 'none',
                    }}>
                        Study Objectives
                    </span>
                </div>
                <span style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: '#c026d3',
                    background: 'rgba(192,38,211,0.1)',
                    border: '1px solid rgba(192,38,211,0.25)',
                    padding: '2px 8px',
                    borderRadius: '20px',
                }}>
                    Primary
                </span>
            </div>

            {/* Outer glow wrapper */}
            <div style={{
                borderRadius: '12px',
                padding: '1px',
                background: focused
                    ? 'linear-gradient(135deg, rgba(192,38,211,0.6), rgba(124,58,237,0.4))'
                    : hasValue
                        ? 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(192,38,211,0.2))'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04))',
                transition: 'all 0.25s ease',
                boxShadow: focused
                    ? '0 0 24px rgba(192,38,211,0.2), 0 0 48px rgba(124,58,237,0.1)'
                    : 'none',
            }}>
                <div style={{
                    borderRadius: '11px',
                    background: focused
                        ? 'rgba(124,58,237,0.1)'
                        : hasValue
                            ? 'rgba(124,58,237,0.06)'
                            : 'rgba(5,0,14,0.8)',
                    padding: '0.85rem 1rem',
                    transition: 'background 0.2s ease',
                }}>
                    {/* Hint text above textarea */}
                    <p style={{
                        margin: '0 0 0.5rem',
                        fontSize: '0.72rem',
                        color: focused ? 'rgba(192,38,211,0.7)' : 'rgba(255,255,255,0.2)',
                        letterSpacing: '0.3px',
                        transition: 'color 0.2s',
                    }}>
                        Define what you want to master from this material
                    </p>
                    <textarea
                        value={value}
                        onChange={onChange}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        placeholder="e.g. Master integration techniques, understand convergence theorems, apply to real-world problems..."
                        rows={3}
                        style={{
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: '#f1f5f9',
                            fontFamily: 'inherit',
                            fontSize: '0.88rem',
                            lineHeight: 1.6,
                            resize: 'none',
                            caretColor: '#c026d3',
                            boxSizing: 'border-box',
                        }}
                    />
                    {/* Character count */}
                    {hasValue && (
                        <div style={{
                            textAlign: 'right',
                            fontSize: '0.65rem',
                            color: 'rgba(192,38,211,0.5)',
                            marginTop: '0.25rem',
                            letterSpacing: '0.5px',
                        }}>
                            {value.length} chars
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}