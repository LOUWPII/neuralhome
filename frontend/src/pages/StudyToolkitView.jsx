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
import {
    ArrowLeft, Send, Brain, BookOpen, ChevronDown,
    Mic, HelpCircle, Layers, FileBarChart, FileText,
    MessageSquare, History, Sparkles
} from 'lucide-react';
import StudyToolCard from '../components/StudyToolCard';
import FeynmanVoiceMentor from '../components/FeynmanVoiceMentor';
import FlashCardsDeck from '../components/FlashCardsDeck';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ConceptMiniature from '../3d/ConceptMiniature';

const API_BASE = 'http://127.0.0.1:8001';

/* ── colour helpers ─────────────────────────────────────────────────────── */
const themeAccent = (t) => '#a78bfa';
const themeDim = (t) => '#7c3aed';

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
    const navigate = useNavigate();
    const { language } = useAuth();  // 'en' | 'es'

    /* data */
    const [concept, setConcept] = useState(null);
    const [palace, setPalace] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchErr, setFetchErr] = useState(null);

    /* chat */
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [chatBusy, setChatBusy] = useState(false);
    const [started, setStarted] = useState(false);

    /* ui */
    const [activeTool, setActiveTool] = useState('menu'); // 'menu' | 'miniature' | 'feynman' | 'cuestionario' | 'flashcards' | 'infografia' | 'feynman_summary'

    /* quiz state */
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [quizLoading, setQuizLoading] = useState(false);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizResults, setQuizResults] = useState(null);
    const [quizMode, setQuizMode] = useState('menu'); // 'menu' | 'active'
    const [lastQuizData, setLastQuizData] = useState(null);

    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    const accent = themeAccent(palace?.description);
    const dim = themeDim(palace?.description);

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

    /* ── quiz logic ─────────────────────────────────────────────────── */
    useEffect(() => {
        if (activeTool === 'cuestionario' && quizMode === 'menu') {
            checkLastQuiz();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTool]);

    async function checkLastQuiz() {
        setQuizLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) return;

            const res = await fetch(`${API_BASE}/api/quiz/last?concept_id=${conceptId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.cuestionario && data.cuestionario.length > 0) {
                setLastQuizData(data);
            } else {
                generateQuiz();
            }
        } catch (err) {
            console.error('[Quiz] Check last error:', err);
            generateQuiz();
        } finally {
            setQuizLoading(false);
        }
    }

    async function generateQuiz() {
        setQuizMode('active');
        setQuizQuestions([]);
        setQuizAnswers({});
        setQuizResults(null);
        setQuizLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('No auth session');

            const res = await fetch(`${API_BASE}/api/quiz/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ concept_id: conceptId })
            });
            if (!res.ok) throw new Error("Failed to generate quiz");
            const data = await res.json();
            setQuizQuestions(data.cuestionario || []);
        } catch (err) {
            console.error('[Quiz] Error:', err);
        } finally {
            setQuizLoading(false);
        }
    }

    function reuseQuiz() {
        if (!lastQuizData) return;
        setQuizQuestions(lastQuizData.cuestionario);
        setQuizAnswers({});
        setQuizResults(null);
        setQuizMode('active');
    }

    async function evaluateQuiz() {
        setQuizLoading(true);
        const results = {};
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            for (let q of quizQuestions) {
                const userAns = quizAnswers[q.id] || "";
                if (q.tipo === 'abierta') {
                    const res = await fetch(`${API_BASE}/api/quiz/evaluate/open`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ concept_id: conceptId, pregunta: q.enunciado, respuesta_usuario: userAns })
                    });
                    results[q.id] = await res.json();
                } else {
                    const isCorrect = userAns.trim().toLowerCase() === (q.respuesta_correcta || "").trim().toLowerCase();
                    results[q.id] = { correcta: isCorrect };
                }
            }
            setQuizResults(results);
        } catch (err) {
            console.error('[Quiz Evaluate] Error:', err);
        } finally {
            setQuizLoading(false);
        }
    }

    /* ── send message ───────────────────────────────────────────────── */
    const sendMessage = useCallback(async (override) => {
        const text = (override ?? input).trim();
        if (!text || chatBusy) return;

        const isHidden = !!override;
        const nextMsgs = isHidden
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

                {/* ── LEFT COLUMN: INTERACTION (60%) ─────────────────── */}
                <div style={{
                    width: '60%',
                    display: 'flex', flexDirection: 'column',
                    borderRight: `1px solid ${accent}22`,
                    background: 'rgba(5,0,14,0.55)',
                    overflow: 'hidden',
                }}>
                    {activeTool !== 'cuestionario' ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
                                    onFocus={e => e.target.style.borderColor = accent}
                                    onBlur={e => e.target.style.borderColor = `${accent}44`}
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
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(5,0,14,0.7)', padding: '2rem', overflowY: 'auto' }}>
                            <h2 style={{ fontSize: '1.4rem', marginBottom: '2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <History size={24} color={accent} /> Historial de Evaluaciones
                            </h2>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', marginBottom: '1rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '1rem', fontWeight: 600, color: accent }}>Simulacro #{i}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>Hace {i * 2} días</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Dominio: <span style={{ color: '#fff' }}>{(90 - i * 5)}%</span></p>
                                        <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                                            <div style={{ width: `${90 - i * 5}%`, height: '100%', background: accent, borderRadius: '2px' }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── RIGHT COLUMN: TOOLS & STUDIO (40%) ──────────────── */}
                <div style={{
                    width: '40%',
                    display: 'flex', flexDirection: 'column',
                    background: 'rgba(5,0,14,0.3)',
                    overflow: 'hidden',
                }}>
                    {activeTool === 'menu' ? (
                        /* Studio Selection (Full height) */
                        <div style={{
                            flex: 1,
                            padding: '2rem',
                            overflowY: 'auto',
                            background: 'rgba(5,0,14,0.6)',
                            backdropFilter: 'blur(10px)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>Studio Tools</h2>
                                <Sparkles size={20} color={accent} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <StudyToolCard
                                    title="Feynman Tutor"
                                    description="Enséñale a la IA por voz"
                                    icon={Mic}
                                    accent={accent}
                                    active={false}
                                    onClick={() => setActiveTool('feynman')}
                                />
                                <StudyToolCard
                                    title="Cuestionario"
                                    description="Evalúa tu retención"
                                    icon={HelpCircle}
                                    accent={accent}
                                    active={false}
                                    onClick={() => setActiveTool('cuestionario')}
                                />
                                <StudyToolCard
                                    title="FlashCards"
                                    description="Repaso espaciado activo"
                                    icon={Layers}
                                    accent={accent}
                                    active={false}
                                    onClick={() => setActiveTool('flashcards')}
                                />
                                <StudyToolCard
                                    title="Infografía"
                                    description="Mapa mental dinámico"
                                    icon={FileBarChart}
                                    accent={accent}
                                    active={false}
                                    onClick={() => setActiveTool('infografia')}
                                />
                                <StudyToolCard
                                    title="Resumen"
                                    description="Síntesis ejecutiva"
                                    icon={Sparkles}
                                    accent={accent}
                                    active={false}
                                    onClick={() => setActiveTool('feynman_summary')}
                                />
                            </div>
                        </div>
                    ) : (
                        /* Tool Content Area (Full height) */
                        <div style={{
                            flex: 1,
                            display: 'flex', flexDirection: 'column',
                            background: `radial-gradient(ellipse at 50% 40%, ${accent}0d 0%, transparent 70%)`,
                            overflow: 'hidden',
                            position: 'relative',
                        }}>
                            <button
                                onClick={() => {
                                    if (quizMode === 'active' && activeTool === 'cuestionario') {
                                        setQuizMode('menu');
                                    } else {
                                        setActiveTool('menu');
                                    }
                                }}
                                style={{
                                    position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 10,
                                    background: 'rgba(0,0,0,0.5)', border: `1px solid ${accent}44`,
                                    borderRadius: '8px', padding: '0.5rem 1rem',
                                    color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    cursor: 'pointer', backdropFilter: 'blur(4px)', fontSize: '0.85rem',
                                    transition: 'all 0.2s', fontWeight: 600
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                            >
                                <ArrowLeft size={16} /> {quizMode === 'active' && activeTool === 'cuestionario' ? "Menú" : "Volver"}
                            </button>

                            {activeTool === 'miniature' && (
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <ConceptMiniature concept={concept} theme={theme} />
                                </div>
                            )}

                            {activeTool === 'feynman' && (
                                <div style={{ flex: 1, padding: '5rem 2rem 3rem', overflowY: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ width: '100%', maxWidth: '85%', height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {/* Header Card */}
                                        <StudyToolCard
                                            title="Feynman Tutor"
                                            description="Voice-powered learning. Explain concepts out loud and the tutor will guide you."
                                            icon={Mic}
                                            accent={accent}
                                            active={true}
                                        />

                                        {/* Active Module */}
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <FeynmanVoiceMentor
                                                conceptId={conceptId}
                                                language={language}
                                                accent={accent}
                                                onClose={() => setActiveTool('menu')}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTool === 'cuestionario' && (
                                <div style={{ flex: 1, padding: '5rem 3rem 3rem', overflowY: 'auto' }}>
                                    <h2 style={{ fontSize: '1.6rem', color: '#fff', marginBottom: '2rem' }}>Evaluación Rápida</h2>

                                    {quizMode === 'menu' && !quizLoading && lastQuizData && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', alignItems: 'center', marginTop: '3rem' }}>
                                            <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontSize: '1rem', marginBottom: '1rem' }}>
                                                Ya tienes un cuestionario guardado para este concepto. ¿Qué deseas hacer?
                                            </p>
                                            <button className="btn-primary" onClick={reuseQuiz} style={{ width: '100%', maxWidth: '320px', padding: '1rem', borderRadius: '12px', background: accent, border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                                                Volver a tomar el último
                                            </button>
                                            <button className="btn-outline" onClick={generateQuiz} style={{ width: '100%', maxWidth: '320px', padding: '1rem', borderRadius: '12px', background: 'transparent', border: `2px solid ${accent}66`, color: '#fff', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                                                Generar nuevo cuestionario
                                            </button>
                                        </div>
                                    )}

                                    {quizLoading && <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: accent }}><div style={spinnerStyle(accent)} /> Cargando cuestionario...</div>}

                                    {quizMode === 'active' && !quizLoading && quizQuestions.map((q, idx) => (
                                        <div key={q.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                                            <p style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: '#f1f5f9' }}>{idx + 1}. {q.enunciado}</p>

                                            {q.tipo === 'abierta' ? (
                                                <textarea
                                                    value={quizAnswers[q.id] || ''}
                                                    onChange={e => setQuizAnswers({ ...quizAnswers, [q.id]: e.target.value })}
                                                    placeholder="Escribe tu respuesta..."
                                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: `1px solid rgba(255,255,255,0.1)`, color: '#fff', minHeight: '80px', fontFamily: 'inherit' }}
                                                    disabled={!!quizResults}
                                                />
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                                    {q.opciones?.map((opt, oIdx) => {
                                                        const isSelected = quizAnswers[q.id] === opt;
                                                        let borderColor = isSelected ? accent : 'rgba(255,255,255,0.1)';
                                                        let bgColor = isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)';

                                                        // Show correct/incorrect if evaluated
                                                        if (quizResults) {
                                                            const isCorrectAnswer = opt.trim().toLowerCase() === (q.respuesta_correcta || "").trim().toLowerCase();
                                                            if (isCorrectAnswer) {
                                                                borderColor = '#10b981'; // green
                                                                bgColor = 'rgba(16, 185, 129, 0.1)';
                                                            } else if (isSelected && !quizResults[q.id].correcta) {
                                                                borderColor = '#ef4444'; // red
                                                                bgColor = 'rgba(239, 68, 68, 0.1)';
                                                            }
                                                        }

                                                        return (
                                                            <button
                                                                key={oIdx}
                                                                onClick={() => !quizResults && setQuizAnswers({ ...quizAnswers, [q.id]: opt })}
                                                                style={{ textAlign: 'left', padding: '0.8rem 1.2rem', background: bgColor, border: `1px solid ${borderColor}`, borderRadius: '10px', color: 'rgba(255,255,255,0.7)', cursor: quizResults ? 'default' : 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}
                                                            >
                                                                {opt}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            )}

                                            {/* Feedback for open questions */}
                                            {quizResults && q.tipo === 'abierta' && (
                                                <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', background: quizResults[q.id].correcta ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${quizResults[q.id].correcta ? '#10b981' : '#ef4444'}` }}>
                                                    <p style={{ margin: 0, fontSize: '0.9rem', color: quizResults[q.id].correcta ? '#34d399' : '#f87171' }}>
                                                        <strong>Puntuación: {quizResults[q.id].puntuacion}/100</strong><br />
                                                        {quizResults[q.id].feedback}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {quizMode === 'active' && !quizLoading && quizQuestions.length > 0 && !quizResults && (
                                        <button className="btn-primary" onClick={evaluateQuiz} style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: accent, border: 'none', color: '#fff', fontWeight: 700, marginTop: '1rem', cursor: 'pointer' }}>
                                            Finalizar y Evaluar Cuestionario
                                        </button>
                                    )}

                                    {quizMode === 'active' && quizResults && (
                                        <button className="btn-primary" onClick={() => setQuizMode('menu')} style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, marginTop: '1rem', cursor: 'pointer' }}>
                                            Finalizar (Volver al Menú)
                                        </button>
                                    )}
                                </div>
                            )}

                            {activeTool === 'flashcards' && (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
                                    <div style={{ padding: '5rem 1.5rem 0 1.5rem', flexShrink: 0 }}>
                                        <StudyToolCard
                                            title="FlashCards"
                                            description="Repaso espaciado activo"
                                            icon={Layers}
                                            accent={accent}
                                            active={true}
                                        />
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                                        <FlashCardsDeck 
                                            conceptId={conceptId} 
                                            accent={accent} 
                                            onClose={() => setActiveTool('menu')} 
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTool === 'feynman_summary' && (
                                <div style={{ flex: 1, padding: '5rem 3rem 3rem', overflowY: 'auto' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                                        <Sparkles size={28} color={accent} />
                                        <h2 style={{ margin: 0, color: '#fff', fontSize: '1.6rem' }}>Resumen Feynman</h2>
                                    </div>
                                    <div style={{ padding: '2rem', background: `${accent}0e`, border: `1px solid ${accent}33`, borderRadius: '20px', lineHeight: 1.8, color: 'rgba(255,255,255,0.85)', fontSize: '1.05rem' }}>
                                        {concept.feynman_summary || "Generando síntesis simplificada..."}
                                    </div>
                                </div>
                            )}

                            {activeTool === 'infografia' && (
                                <div style={{ flex: 1, padding: '5rem 3rem 3rem', overflowY: 'auto' }}>
                                    <div style={{ maxWidth: '800px', margin: '0 auto', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '3rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                                            <FileBarChart size={32} color={accent} />
                                            <h2 style={{ margin: 0, color: '#fff' }}>Mapa de Conocimiento Visual</h2>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} style={{ height: '150px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)' }}>
                                                    [Visual Asset {i}]
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
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
