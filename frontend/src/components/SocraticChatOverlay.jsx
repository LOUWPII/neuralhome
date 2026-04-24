/**
 * SocraticChatOverlay.jsx  —  CU-003 Study Toolkit
 *
 * Renders as an absolute overlay on top of the R3F canvas.
 * Opened when the user clicks a KnowledgeObject in PalaceView.
 *
 * Props:
 *   concept  — full concept row from Supabase { id, label, feynman_summary, anchor_id, ... }
 *   onClose  — callback to dismiss the overlay
 */
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Brain } from 'lucide-react';
import { supabase } from '../lib/supabase';

const API_BASE = 'http://localhost:8001';

/* ─── tiny helpers ─────────────────────────────────────────────────────── */
const getThemeColor = (theme) =>
    theme === 'silicon_valley' ? '#3b82f6' : '#a78bfa';

/* ─── component ─────────────────────────────────────────────────────────── */
export default function SocraticChatOverlay({ concept, theme = 'neon_dev', onClose }) {
    const [messages, setMessages] = useState([]);   // { role, content }[]
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [anchorLabel, setAnchorLabel] = useState('');
    const [sessionStarted, setSessionStarted] = useState(false);
    const bottomRef = useRef(null);
    const inputRef  = useRef(null);

    const accent = getThemeColor(theme);

    /* ── auto-scroll on new message ───────────────────────────────────── */
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    /* ── focus input when overlay opens ──────────────────────────────── */
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    /* ── kick off the session with a tutor opening question ──────────── */
    useEffect(() => {
        if (!sessionStarted && concept?.id) {
            setSessionStarted(true);
            sendMessage('Hello — I want to start studying this concept.');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [concept]);

    /* ── core send function ───────────────────────────────────────────── */
    async function sendMessage(overrideText) {
        const text = (overrideText ?? input).trim();
        if (!text || loading) return;

        // Show user message immediately (unless it's the hidden opener)
        const isHidden = !!overrideText;
        const nextMessages = isHidden
            ? messages
            : [...messages, { role: 'user', content: text }];

        if (!isHidden) {
            setMessages(nextMessages);
            setInput('');
        }

        setLoading(true);

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
                    concept_id: concept.id,
                    message: text,
                    // send only the last 10 exchanges to keep tokens low
                    history: nextMessages.slice(-10).map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Tutor unavailable');
            }

            const data = await res.json();
            setAnchorLabel(data.anchor_label);
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        } catch (err) {
            console.error('[SocraticChat]', err);
            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: '⚠️ The tutor is temporarily unavailable. Check your connection and try again.',
                },
            ]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    }

    /* ── keyboard shortcut: Enter to send, Shift+Enter for newline ────── */
    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    /* ─── render ───────────────────────────────────────────────────────── */
    return (
        <div
            id="socratic-overlay"
            role="dialog"
            aria-label="Socratic Tutor Chat"
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 50,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'flex-end',
                padding: '1.5rem',
                pointerEvents: 'none',      // let clicks pass through to the 3D canvas
            }}
        >
            {/* ─── Panel ─────────────────────────────────────────────────── */}
            <div
                style={{
                    pointerEvents: 'auto',
                    width: 'min(420px, 92vw)',
                    height: 'min(580px, 80vh)',
                    background: 'rgba(5, 0, 14, 0.88)',
                    backdropFilter: 'blur(18px)',
                    WebkitBackdropFilter: 'blur(18px)',
                    border: `1px solid ${accent}55`,
                    borderRadius: '16px',
                    boxShadow: `0 8px 48px rgba(0,0,0,0.7), 0 0 32px ${accent}22`,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'socraticSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
            >

                {/* ── Header ────────────────────────────────────────────── */}
                <div style={{
                    padding: '1rem 1.2rem',
                    borderBottom: `1px solid ${accent}33`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexShrink: 0,
                }}>
                    {/* Brain icon with accent pulse */}
                    <div style={{
                        width: 36, height: 36,
                        borderRadius: '50%',
                        background: `${accent}22`,
                        border: `1px solid ${accent}66`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: `0 0 12px ${accent}44`,
                    }}>
                        <Brain size={18} color={accent} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                            margin: 0,
                            fontSize: '0.72rem',
                            color: accent,
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            fontWeight: 600,
                        }}>
                            Socratic Tutor · {anchorLabel || concept.anchor_id}
                        </p>
                        <p style={{
                            margin: 0,
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            color: '#f8fafc',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>
                            {concept.label}
                        </p>
                    </div>

                    <button
                        id="socratic-close-btn"
                        onClick={onClose}
                        aria-label="Close tutor"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255,255,255,0.4)',
                            cursor: 'pointer',
                            padding: '0.3rem',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'color 0.2s',
                            flexShrink: 0,
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── Feynman summary chip ──────────────────────────────── */}
                {concept.feynman_summary && (
                    <div style={{
                        margin: '0.75rem 1rem 0',
                        padding: '0.6rem 0.85rem',
                        background: `${accent}14`,
                        border: `1px solid ${accent}33`,
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.65)',
                        lineHeight: 1.55,
                        flexShrink: 0,
                    }}>
                        <span style={{ color: accent, fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                            Feynman hint ·&nbsp;
                        </span>
                        {concept.feynman_summary}
                    </div>
                )}

                {/* ── Messages ──────────────────────────────────────────── */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.9rem',
                    scrollbarWidth: 'thin',
                    scrollbarColor: `${accent}44 transparent`,
                }}>
                    {messages.map((msg, i) => (
                        <MessageBubble key={i} msg={msg} accent={accent} />
                    ))}

                    {/* Typing indicator */}
                    {loading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {[0, 1, 2].map(d => (
                                <span key={d} style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: accent,
                                    animation: `socraticDot 1.2s ease-in-out ${d * 0.2}s infinite`,
                                }} />
                            ))}
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* ── Input ────────────────────────────────────────────── */}
                <div style={{
                    padding: '0.85rem 1rem',
                    borderTop: `1px solid ${accent}33`,
                    display: 'flex',
                    gap: '0.6rem',
                    alignItems: 'flex-end',
                    flexShrink: 0,
                }}>
                    <textarea
                        ref={inputRef}
                        id="socratic-input"
                        rows={1}
                        placeholder="Think aloud, ask or answer..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={loading}
                        style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.05)',
                            border: `1px solid ${accent}44`,
                            borderRadius: '8px',
                            color: '#f8fafc',
                            fontFamily: 'inherit',
                            fontSize: '0.9rem',
                            padding: '0.6rem 0.85rem',
                            resize: 'none',
                            outline: 'none',
                            lineHeight: 1.5,
                            maxHeight: '100px',
                            overflow: 'auto',
                            transition: 'border-color 0.2s',
                        }}
                        onFocus={e  => e.target.style.borderColor = accent}
                        onBlur={e   => e.target.style.borderColor = `${accent}44`}
                    />
                    <button
                        id="socratic-send-btn"
                        onClick={() => sendMessage()}
                        disabled={loading || !input.trim()}
                        aria-label="Send message"
                        style={{
                            background: accent,
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                            opacity: loading || !input.trim() ? 0.5 : 1,
                            padding: '0.6rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'opacity 0.2s, transform 0.15s',
                            flexShrink: 0,
                        }}
                        onMouseEnter={e => { if (!loading && input.trim()) e.currentTarget.style.transform = 'scale(1.08)'; }}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <Send size={18} />
                    </button>
                </div>

            </div>

            {/* ── Keyframe style injection ─────────────────────────────── */}
            <style>{`
                @keyframes socraticSlideIn {
                    from { opacity: 0; transform: translateY(24px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0)   scale(1);    }
                }
                @keyframes socraticDot {
                    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
                    40%           { transform: scale(1);   opacity: 1;   }
                }
            `}</style>
        </div>
    );
}

/* ─── MessageBubble ─────────────────────────────────────────────────────── */
function MessageBubble({ msg, accent }) {
    const isUser = msg.role === 'user';
    return (
        <div style={{
            display: 'flex',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
        }}>
            <div style={{
                maxWidth: '88%',
                padding: '0.6rem 0.9rem',
                borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: isUser
                    ? `linear-gradient(135deg, ${accent}cc, ${accent}99)`
                    : 'rgba(255,255,255,0.07)',
                border: isUser ? 'none' : '1px solid rgba(255,255,255,0.1)',
                color: '#f8fafc',
                fontSize: '0.88rem',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
            }}>
                {msg.content}
            </div>
        </div>
    );
}
