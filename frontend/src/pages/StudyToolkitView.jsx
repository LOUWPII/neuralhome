/**
 * StudyToolkitView.jsx  —  CU-003 Full Split-Screen Study Mode
 *
 * Route: /study/:palaceId/:conceptId
 *
 * Layout (full-screen):
 *   ┌─────────────────────────────────────────────────────┐
 *   │  Navbar: [← Palace]   Concept Label   Palace Title  │
 *   ├──────────────────────────┬──────────────────────────┤
 *   │  LEFT 40%                │  RIGHT 60%               │
 *   │  Socratic Chat           │  3D Concept Miniature    │
 *   │  (scrollable history +   │  (floating animated obj) │
 *   │   textarea input)        │  + Feynman card below    │
 *   └──────────────────────────┴──────────────────────────┘
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Brain, BookOpen, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ConceptMiniature from '../3d/ConceptMiniature';

const API_BASE = 'http://localhost:8001';

/* ── colour helpers ─────────────────────────────────────────────────────── */
const themeAccent = (t) => t === 'silicon_valley' ? '#3b82f6' : '#a78bfa';
const themeDim    = (t) => t === 'silicon_valley' ? '#1d4ed8' : '#7c3aed';

/* ── message bubble ─────────────────────────────────────────────────────── */
function Bubble({ msg, accent }) {
    const isUser = msg.role === 'user';
    return (
        <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
            {!isUser && (
                <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: `${accent}22`, border: `1px solid ${accent}66`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginRight: '0.5rem', alignSelf: 'flex-end',
                }}>
                    <Brain size={13} color={accent} />
                </div>
            )}
            <div style={{
                maxWidth: '82%',
                padding: '0.65rem 0.95rem',
                borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: isUser
                    ? `linear-gradient(135deg, ${accent}dd, ${accent}99)`
                    : 'rgba(255,255,255,0.07)',
                border: isUser ? 'none' : '1px solid rgba(255,255,255,0.09)',
                color: '#f1f5f9',
                fontSize: '0.9rem',
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
            }}>
                {msg.content}
            </div>
        </div>
    );
}

/* ── typing indicator ───────────────────────────────────────────────────── */
function TypingIndicator({ accent }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0' }}>
            {[0, 1, 2].map(d => (
                <span key={d} style={{
                    width: 7, height: 7, borderRadius: '50%', background: accent,
                    animation: `tkDot 1.3s ease-in-out ${d * 0.21}s infinite`,
                }} />
            ))}
        </div>
    );
}

/* ── main view ──────────────────────────────────────────────────────────── */
export default function StudyToolkitView() {
    const { palaceId, conceptId } = useParams();
    const navigate  = useNavigate();
    const { language } = useAuth();  // 'en' | 'es'

    /* data */
    const [concept,  setConcept]  = useState(null);
    const [palace,   setPalace]   = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [fetchErr, setFetchErr] = useState(null);

    /* chat */
    const [messages,  setMessages]  = useState([]);
    const [input,     setInput]     = useState('');
    const [chatBusy,  setChatBusy]  = useState(false);
    const [started,   setStarted]   = useState(false);

    /* ui */
    const [feynmanOpen, setFeynmanOpen] = useState(true);

    const bottomRef = useRef(null);
    const inputRef  = useRef(null);

    const accent = themeAccent(palace?.description);
    const dim    = themeDim(palace?.description);

    /* ── load data ───────────────────────────────────────────────────── */
    useEffect(() => {
        async function load() {
            try {
                const [{ data: c, error: ce }, { data: p, error: pe }] = await Promise.all([
                    supabase.from('concepts').select('*').eq('id', conceptId).single(),
                    supabase.from('palaces').select('*').eq('id', palaceId).single(),
                ]);
                if (ce) throw ce;
                if (pe) throw pe;
                setConcept(c);
                setPalace(p);
            } catch (e) {
                console.error('[StudyToolkit] load error:', e);
                setFetchErr(e.message ?? 'Failed to load concept.');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [conceptId, palaceId]);

    /* ── auto-scroll ────────────────────────────────────────────────── */
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, chatBusy]);

    /* ── kick off tutor with hidden opener ─────────────────────────── */
    useEffect(() => {
        if (!started && concept && palace) {
            setStarted(true);
            sendMessage('Hello — I want to start studying this concept.');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [concept, palace]);

    /* ── send message ───────────────────────────────────────────────── */
    const sendMessage = useCallback(async (override) => {
        const text = (override ?? input).trim();
        if (!text || chatBusy) return;

        const isHidden   = !!override;
        const nextMsgs   = isHidden
            ? messages
            : [...messages, { role: 'user', content: text }];

        if (!isHidden) {
            setMessages(nextMsgs);
            setInput('');
        }
        setChatBusy(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('No auth session');

            const res = await fetch(`${API_BASE}/api/chat/socratic`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    concept_id: conceptId,
                    message: text,
                    language,           // forward user's preferred language
                    history: nextMsgs.slice(-12).map(m => ({ role: m.role, content: m.content })),
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Tutor unavailable');
            }

            const data = await res.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        } catch (err) {
            console.error('[StudyToolkit] chat error:', err);
            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: '⚠️ The tutor is temporarily unavailable. Try again in a moment.' },
            ]);
        } finally {
            setChatBusy(false);
            inputRef.current?.focus();
        }
    }, [conceptId, input, messages, chatBusy]);

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    /* ── loading / error states ─────────────────────────────────────── */
    if (loading) {
        return (
            <div style={fullCenter}>
                <div style={spinnerStyle(accent)} />
                <p style={{ color: accent, marginTop: '1.2rem', fontFamily: 'inherit', letterSpacing: '1px' }}>
                    Loading Study Session…
                </p>
            </div>
        );
    }

    if (fetchErr || !concept || !palace) {
        return (
            <div style={{ ...fullCenter, flexDirection: 'column', gap: '1rem' }}>
                <p style={{ color: '#ef4444', fontSize: '1rem' }}>{fetchErr ?? 'Concept not found.'}</p>
                <button className="btn-outline" onClick={() => navigate(`/palace/${palaceId}`)}>
                    Return to Palace
                </button>
            </div>
        );
    }

    const theme = palace.description || 'neon_dev';

    /* ── render ─────────────────────────────────────────────────────── */
    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'var(--bg-dark)',
            display: 'flex', flexDirection: 'column',
            fontFamily: 'var(--font-main)',
            color: 'var(--text-main)',
            overflow: 'hidden',
            animation: 'studyFadeIn 0.35s ease',
        }}>

            {/* ── TOP NAV ───────────────────────────────────────────── */}
            <nav style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1.5rem',
                borderBottom: `1px solid ${accent}33`,
                background: 'rgba(5,0,14,0.7)',
                backdropFilter: 'blur(12px)',
                flexShrink: 0,
                zIndex: 20,
            }}>
                <button
                    id="study-back-btn"
                    onClick={() => navigate(`/palace/${palaceId}`)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        background: 'transparent', border: `1px solid ${accent}44`,
                        color: 'var(--text-muted)', borderRadius: '8px',
                        padding: '0.4rem 0.8rem', cursor: 'pointer',
                        fontSize: '0.85rem', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = `${accent}44`; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                    <ArrowLeft size={15} /> Back to Palace
                </button>

                {/* Centre: concept label */}
                <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1.2px', color: accent, fontWeight: 600 }}>
                        Study Mode · {palace.subject || palace.title}
                    </p>
                    <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                        {concept.label}
                    </h1>
                </div>

                {/* Right: session badge */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: `${accent}18`, border: `1px solid ${accent}44`,
                    borderRadius: '20px', padding: '0.3rem 0.85rem',
                    fontSize: '0.75rem', color: accent, fontWeight: 600,
                }}>
                    <BookOpen size={13} /> Socratic Session
                </div>
            </nav>

            {/* ── BODY ──────────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* ── LEFT PANEL: CHAT (40%) ─────────────────────────── */}
                <div style={{
                    width: '40%', minWidth: 320,
                    display: 'flex', flexDirection: 'column',
                    borderRight: `1px solid ${accent}22`,
                    background: 'rgba(5,0,14,0.55)',
                    overflow: 'hidden',
                }}>

                    {/* Chat header */}
                    <div style={{
                        padding: '0.85rem 1.2rem',
                        borderBottom: `1px solid ${accent}22`,
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        flexShrink: 0,
                    }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: `${accent}1a`, border: `1px solid ${accent}66`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 0 10px ${accent}44`,
                        }}>
                            <Brain size={16} color={accent} />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: accent, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                                Socratic Tutor
                            </p>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                Grounded in your study material
                            </p>
                        </div>
                    </div>

                    {/* Messages */}
                    <div style={{
                        flex: 1, overflowY: 'auto',
                        padding: '1rem 1.1rem',
                        display: 'flex', flexDirection: 'column', gap: '0.85rem',
                        scrollbarWidth: 'thin', scrollbarColor: `${accent}44 transparent`,
                    }}>
                        {messages.map((msg, i) => (
                            <Bubble key={i} msg={msg} accent={accent} />
                        ))}
                        {chatBusy && <TypingIndicator accent={accent} />}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input area */}
                    <div style={{
                        padding: '0.9rem 1rem',
                        borderTop: `1px solid ${accent}22`,
                        display: 'flex', gap: '0.6rem', alignItems: 'flex-end',
                        flexShrink: 0,
                        background: 'rgba(0,0,0,0.3)',
                    }}>
                        <textarea
                            ref={inputRef}
                            id="study-chat-input"
                            rows={2}
                            placeholder="Think aloud, ask, or answer the tutor…"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={chatBusy}
                            style={{
                                flex: 1,
                                background: 'rgba(255,255,255,0.05)',
                                border: `1px solid ${accent}44`,
                                borderRadius: '10px',
                                color: '#f1f5f9',
                                fontFamily: 'inherit',
                                fontSize: '0.88rem',
                                padding: '0.65rem 0.9rem',
                                resize: 'none',
                                outline: 'none',
                                lineHeight: 1.5,
                                transition: 'border-color 0.2s',
                                maxHeight: 120, overflow: 'auto',
                            }}
                            onFocus={e  => e.target.style.borderColor = accent}
                            onBlur={e   => e.target.style.borderColor = `${accent}44`}
                        />
                        <button
                            id="study-send-btn"
                            onClick={() => sendMessage()}
                            disabled={chatBusy || !input.trim()}
                            aria-label="Send message"
                            style={{
                                background: `linear-gradient(135deg, ${accent}, ${dim})`,
                                border: 'none', borderRadius: '10px',
                                color: '#fff', cursor: chatBusy || !input.trim() ? 'not-allowed' : 'pointer',
                                opacity: chatBusy || !input.trim() ? 0.45 : 1,
                                padding: '0.65rem 0.8rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'opacity 0.2s, transform 0.15s',
                                flexShrink: 0,
                                boxShadow: `0 0 12px ${accent}44`,
                            }}
                            onMouseEnter={e => { if (!chatBusy && input.trim()) e.currentTarget.style.transform = 'scale(1.08)'; }}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>

                {/* ── RIGHT PANEL: 3D MINIATURE (60%) ────────────────── */}
                <div style={{
                    flex: 1,
                    display: 'flex', flexDirection: 'column',
                    background: `radial-gradient(ellipse at 50% 40%, ${accent}0d 0%, transparent 70%), var(--bg-dark)`,
                    overflow: 'hidden',
                    position: 'relative',
                }}>
                    {/* 3D Canvas area */}
                    <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                        <ConceptMiniature concept={concept} theme={theme} />

                        {/* Anchor badge */}
                        <div style={{
                            position: 'absolute', top: '1rem', left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'rgba(0,0,0,0.6)',
                            border: `1px solid ${accent}44`,
                            borderRadius: '20px',
                            padding: '0.3rem 0.9rem',
                            fontSize: '0.7rem', color: accent,
                            fontWeight: 600, letterSpacing: '0.8px',
                            textTransform: 'uppercase',
                            backdropFilter: 'blur(8px)',
                            pointerEvents: 'none',
                        }}>
                            🧠 {concept.anchor_id?.replace(/_/g, ' ') || 'Knowledge Anchor'}
                        </div>

                        {/* Guide hint */}
                        <p style={{
                            position: 'absolute', bottom: '0.8rem', left: 0, right: 0,
                            textAlign: 'center', margin: 0,
                            fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)',
                            pointerEvents: 'none',
                        }}>
                            Visual memory anchor · {concept.label}
                        </p>
                    </div>

                    {/* ── Feynman Summary card ──────────────────────── */}
                    {concept.feynman_summary && (
                        <div style={{
                            flexShrink: 0,
                            margin: '0 1.2rem 1.2rem',
                            background: `${accent}0e`,
                            border: `1px solid ${accent}33`,
                            borderRadius: '12px',
                            overflow: 'hidden',
                        }}>
                            {/* Accordion header */}
                            <button
                                onClick={() => setFeynmanOpen(o => !o)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.65rem 1rem',
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    color: accent, fontFamily: 'inherit',
                                }}
                            >
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    📖 Feynman Summary
                                </span>
                                <ChevronDown
                                    size={15}
                                    style={{
                                        transform: feynmanOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.25s',
                                        color: accent,
                                    }}
                                />
                            </button>

                            {/* Collapsible body */}
                            {feynmanOpen && (
                                <p style={{
                                    margin: 0,
                                    padding: '0 1rem 0.85rem',
                                    fontSize: '0.85rem',
                                    color: 'rgba(255,255,255,0.72)',
                                    lineHeight: 1.7,
                                }}>
                                    {concept.feynman_summary}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Global keyframe injection ── */}
            <style>{`
                @keyframes studyFadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0);   }
                }
                @keyframes tkDot {
                    0%, 80%, 100% { transform: scale(0.55); opacity: 0.35; }
                    40%           { transform: scale(1);    opacity: 1;    }
                }
                @keyframes studySpin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

/* ── style helpers ──────────────────────────────────────────────────────── */
const fullCenter = {
    position: 'fixed', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-dark)',
    flexDirection: 'column',
};

const spinnerStyle = (accent) => ({
    width: 40, height: 40,
    border: `3px solid ${accent}33`,
    borderTop: `3px solid ${accent}`,
    borderRadius: '50%',
    animation: 'studySpin 0.9s linear infinite',
});
