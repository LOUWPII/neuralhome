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
    MessageSquare, History, Sparkles, Plus
} from 'lucide-react';
import StudyToolCard from '../components/StudyToolCard';
import FeynmanVoiceMentor from '../components/FeynmanVoiceMentor';
import FlashCardsDeck from '../components/FlashCardsDeck';
import { useTranslation } from '../contexts/useTranslation';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ConceptMiniature from '../3d/ConceptMiniature';
import InfographicView from '../components/InfographicView';

const API_BASE = 'http://127.0.0.1:8001';

/* ── style helpers ──────────────────────────────────────────────────────── */
const spinnerStyle = (accent) => ({
    width: '18px',
    height: '18px',
    border: `2px solid ${accent}33`,
    borderTop: `2px solid ${accent}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
});

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
    const { language, t } = useTranslation(); // 'en' | 'es'

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
    const [quizError, setQuizError] = useState(null);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizResults, setQuizResults] = useState(null);
    const [quizMode, setQuizMode] = useState('menu'); // 'menu' | 'active'
    const [lastQuizData, setLastQuizData] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);

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
            const initialMsg = language === 'es' 
                ? 'Hola — quiero empezar a estudiar este concepto.' 
                : 'Hello — I want to start studying this concept.';
            sendMessage(initialMsg);
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

    /* ── auto-generate Feynman Summary when concept loads ───────────────── */
    useEffect(() => {
        if (!concept || summaryLoading) return;
        // Auto-generate if there's no valid structured JSON summary yet
        let hasJson = false;
        try { hasJson = !!JSON.parse(concept.feynman_summary)?.intro; } catch {}
        if (!hasJson) generateDetailedSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [concept?.id]);

    async function checkLastQuiz() {
        setQuizLoading(true);
        setQuizError(null);
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
                setQuizLoading(false);
            } else {
                // generateQuiz manages its own loading state
                setQuizLoading(false);
                await generateQuiz();
            }
        } catch (err) {
            console.error('[Quiz] Check last error:', err);
            setQuizLoading(false);
            await generateQuiz();
        }
    }

    async function generateQuiz() {
        setQuizMode('active');
        setQuizQuestions([]);
        setQuizAnswers({});
        setQuizResults(null);
        setQuizError(null);
        setQuizLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('No auth session');

            const res = await fetch(`${API_BASE}/api/quiz/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    concept_id: conceptId,
                    language: language 
                })
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || `Server error ${res.status}`);
            }
            const data = await res.json();
            const questions = data.cuestionario || [];
            if (questions.length === 0) throw new Error('El servidor no devolvió preguntas.');
            setQuizQuestions(questions);
        } catch (err) {
            console.error('[Quiz] Error:', err);
            setQuizError(err.message || 'Error al generar el cuestionario.');
            setQuizMode('menu');
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
                        body: JSON.stringify({ 
                            concept_id: conceptId, 
                            pregunta: q.enunciado, 
                            respuesta_usuario: userAns,
                            language: language
                        })
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

    async function generateDetailedSummary() {
        setSummaryLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            
            const res = await fetch(`${API_BASE}/api/chat/generate-feynman-summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ concept_id: conceptId, language: language })
            });
            if (!res.ok) throw new Error("Failed to generate detailed summary");
            const data = await res.json();
            setConcept(prev => ({ ...prev, feynman_summary: data.summary }));
        } catch (err) {
            console.error('[Summary] Error:', err);
        } finally {
            setSummaryLoading(false);
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
                    {t('loading')}
                </p>
            </div>
        );
    }

    if (fetchErr || !concept || !palace) {
        return (
            <div style={{ ...fullCenter, flexDirection: 'column', gap: '1rem' }}>
                <p style={{ color: '#ef4444', fontSize: '1rem' }}>{fetchErr ?? t('conceptNotFound')}</p>
                <button className="btn-outline" onClick={() => navigate(`/palace/${palaceId}`)}>
                    {t('backToPalace')}
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
                    onClick={() => navigate(`/palace/${palaceId}`)}
                    style={{
                        background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '10px',
                        color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem',
                        padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: 600,
                        transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                >
                    <ArrowLeft size={16} /> {t('back')}
                </button>

                {/* Centre: concept label */}
                <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: accent, textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 800, marginBottom: '0.1rem' }}>
                        {t('studyMode')}
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
                    <BookOpen size={13} /> {t('socraticSession')}
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
                                        {t('socraticTutor')}
                                    </p>
                                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        {t('groundedMaterial')}
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
                                    placeholder={t('thinkAloudPlaceholder')}
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
                                <History size={24} color={accent} /> {t('evaluationHistory')}
                            </h2>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', marginBottom: '1rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '1rem', fontWeight: 600, color: accent }}>{t('mockTest')} #{i}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{i * 2} {t('daysAgo')}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>{t('mastery')}: <span style={{ color: '#fff' }}>{(90 - i * 5)}%</span></p>
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
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('studioTools')}</h2>
                                <Sparkles size={20} color={accent} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <StudyToolCard
                                    title={t('feynmanTutor')}
                                    description={t('feynmanTutorDesc')}
                                    icon={Mic}
                                    accent={accent}
                                    active={false}
                                    onClick={() => setActiveTool('feynman')}
                                />
                                <StudyToolCard
                                    title={t('quiz')}
                                    description={t('quizDesc')}
                                    icon={HelpCircle}
                                    accent={accent}
                                    active={false}
                                    onClick={() => setActiveTool('cuestionario')}
                                />
                                <StudyToolCard
                                    title={t('flashcards')}
                                    description={t('flashcardsDesc')}
                                    icon={Layers}
                                    accent={accent}
                                    active={false}
                                    onClick={() => setActiveTool('flashcards')}
                                />
                                <StudyToolCard
                                    title={t('infographic')}
                                    description={t('infographicDesc')}
                                    icon={FileBarChart}
                                    accent={accent}
                                    active={false}
                                    onClick={() => setActiveTool('infografia')}
                                />
                                <StudyToolCard
                                    title={t('feynmanSummary')}
                                    description={t('feynmanSummaryDesc')}
                                    icon={FileText}
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
                                <ArrowLeft size={16} /> {quizMode === 'active' && activeTool === 'cuestionario' ? t('menu') : t('back')}
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
                                            title={t('feynmanTutor')}
                                            description={t('feynmanTutorDesc')}
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1rem' }}>
                                        <HelpCircle size={24} color={accent} />
                                        <h2 style={{ margin: 0, color: '#fff', fontSize: '1.4rem' }}>{t('quickEvaluation')}</h2>
                                    </div>

                                    {quizMode === 'menu' && !quizLoading && (
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
                                            {lastQuizData && (
                                                <button
                                                    onClick={reuseQuiz}
                                                    style={{
                                                        background: 'rgba(255,255,255,0.05)',
                                                        border: `1px solid ${accent}44`,
                                                        borderRadius: '16px',
                                                        padding: '1.5rem',
                                                        color: '#fff',
                                                        textAlign: 'left',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                >
                                                    <h3 style={{ margin: '0 0 0.5rem', color: accent }}>{t('retakeQuiz')}</h3>
                                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                                                        {lastQuizData.cuestionario.length} {t('questions')} · {t('lastScore')}: {lastQuizData.score || 'N/A'}
                                                    </p>
                                                </button>
                                            )}

                                            <button
                                                onClick={generateQuiz}
                                                style={{
                                                    background: `linear-gradient(135deg, ${accent}22, ${dim}22)`,
                                                    border: `1px solid ${accent}88`,
                                                    borderRadius: '16px',
                                                    padding: '2rem',
                                                    color: '#fff',
                                                    textAlign: 'center',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                            >
                                                <Plus size={32} color={accent} style={{ marginBottom: '1rem' }} />
                                                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem' }}>{t('generateNewQuiz')}</h3>
                                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                                                    {t('noQuizGenerated')}
                                                </p>
                                            </button>
                                        </div>
                                    )}

                                    {quizLoading && <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: accent }}><div style={spinnerStyle(accent)} /> {t('loading')}...</div>}

                                    {quizError && !quizLoading && (
                                        <div style={{ margin: '1rem 0', padding: '1rem 1.5rem', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#fca5a5' }}>
                                            <p style={{ margin: '0 0 0.75rem', fontWeight: 600 }}>⚠️ Error al generar el cuestionario</p>
                                            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', opacity: 0.8 }}>{quizError}</p>
                                            <button
                                                onClick={generateQuiz}
                                                style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', borderRadius: '8px', padding: '0.5rem 1.25rem', color: '#fca5a5', cursor: 'pointer', fontWeight: 600 }}
                                            >
                                                Reintentar
                                            </button>
                                        </div>
                                    )}

                                    {quizMode === 'active' && !quizLoading && quizQuestions.map((q, idx) => (
                                        <div key={q.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                                            <p style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: '#f1f5f9' }}>{idx + 1}. {q.enunciado}</p>

                                            {q.tipo === 'abierta' ? (
                                                <textarea
                                                    value={quizAnswers[q.id] || ''}
                                                    onChange={e => setQuizAnswers({ ...quizAnswers, [q.id]: e.target.value })}
                                                    placeholder={t('writeAnswer')}
                                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: `1px solid rgba(255,255,255,0.1)`, color: '#fff', minHeight: '80px', fontFamily: 'inherit' }}
                                                    disabled={!!quizResults}
                                                />
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                                    {q.opciones?.map((opt, oIdx) => {
                                                        const isSelected = quizAnswers[q.id] === opt;
                                                        let borderColor = isSelected ? accent : 'rgba(255,255,255,0.1)';
                                                        let bgColor = isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)';

                                                        if (quizResults) {
                                                            const isCorrectAnswer = opt.trim().toLowerCase() === (q.respuesta_correcta || "").trim().toLowerCase();
                                                            if (isCorrectAnswer) {
                                                                borderColor = '#10b981';
                                                                bgColor = 'rgba(16, 185, 129, 0.1)';
                                                            } else if (isSelected && !quizResults[q.id].correcta) {
                                                                borderColor = '#ef4444';
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

                                            {quizResults && q.tipo === 'abierta' && (
                                                <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', background: quizResults[q.id].correcta ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${quizResults[q.id].correcta ? '#10b981' : '#ef4444'}` }}>
                                                    <p style={{ margin: 0, fontSize: '0.9rem', color: quizResults[q.id].correcta ? '#34d399' : '#f87171' }}>
                                                        <strong>{t('score')}: {quizResults[q.id].puntuacion}/100</strong><br />
                                                        {quizResults[q.id].feedback}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {quizMode === 'active' && !quizLoading && quizQuestions.length > 0 && !quizResults && (
                                        <button className="btn-primary" onClick={evaluateQuiz} style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: accent, border: 'none', color: '#fff', fontWeight: 700, marginTop: '1rem', cursor: 'pointer' }}>
                                            {t('finishEvaluate')}
                                        </button>
                                    )}

                                    {quizMode === 'active' && quizResults && (
                                        <button className="btn-primary" onClick={() => setQuizMode('menu')} style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, marginTop: '1rem', cursor: 'pointer' }}>
                                            {t('finishReturn')}
                                        </button>
                                    )}
                                </div>
                            )}

                            {activeTool === 'flashcards' && (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
                                    <div style={{ padding: '5rem 1.5rem 0 1.5rem', flexShrink: 0 }}>
                                        <StudyToolCard
                                            title={t('flashcards')}
                                            description={t('flashcardsDesc')}
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
                                        <h2 style={{ margin: 0, color: '#fff', fontSize: '1.6rem' }}>{t('feynmanSummary')}</h2>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {summaryLoading ? (
                                            /* Loading skeleton */
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                <div style={{ padding: '1.5rem 2rem', background: `linear-gradient(135deg, ${accent}12, ${accent}06)`, border: `1px solid ${accent}22`, borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{ ...spinnerStyle(accent), flexShrink: 0 }} />
                                                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>
                                                        {t('generating')}…
                                                    </p>
                                                </div>
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} style={{ height: '100px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', animation: 'pulse 1.8s ease-in-out infinite' }} />
                                                ))}
                                            </div>
                                        ) : (() => {
                                            // Parse JSON summary or fall back to plain text
                                            let s = null;
                                            if (concept.feynman_summary) {
                                                try { s = JSON.parse(concept.feynman_summary); } catch {}
                                            }

                                            if (!s) {
                                                return (
                                                    <div style={{ padding: '3rem', background: `rgba(255,255,255,0.04)`, border: `1px solid ${accent}33`, borderRadius: '20px', color: 'rgba(255,255,255,0.5)', fontSize: '1rem', lineHeight: 1.8, textAlign: 'center' }}>
                                                        El resumen se está preparando…
                                                    </div>
                                                );
                                            }

                                            const sectionStyle = {
                                                padding: '1.8rem 2rem',
                                                background: 'rgba(255,255,255,0.04)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '18px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '1rem',
                                            };
                                            const titleStyle = {
                                                margin: 0,
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                letterSpacing: '2px',
                                                textTransform: 'uppercase',
                                                color: accent,
                                                opacity: 0.9,
                                            };
                                            const bulletStyle = {
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '0.75rem',
                                                color: 'rgba(255,255,255,0.85)',
                                                fontSize: '0.97rem',
                                                lineHeight: 1.65,
                                            };
                                            const dotStyle = {
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                background: accent,
                                                flexShrink: 0,
                                                marginTop: '0.55rem',
                                            };

                                            return (
                                                <>
                                                    {/* Intro banner */}
                                                    {s.intro && (
                                                        <div style={{ padding: '1.5rem 2rem', background: `linear-gradient(135deg, ${accent}22, ${accent}08)`, border: `1px solid ${accent}44`, borderRadius: '18px', color: '#fff', fontSize: '1.1rem', fontWeight: 500, lineHeight: 1.6, fontStyle: 'italic' }}>
                                                            "{s.intro}"
                                                        </div>
                                                    )}

                                                    {/* Two-column grid for What is + How it works */}
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                                        {s.what_is && (
                                                            <div style={sectionStyle}>
                                                                <p style={titleStyle}>{s.what_is.title || '¿Qué es?'}</p>
                                                                {(s.what_is.bullets || []).map((b, i) => (
                                                                    <div key={i} style={bulletStyle}><div style={dotStyle} /><span>{b}</span></div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {s.how_it_works && (
                                                            <div style={sectionStyle}>
                                                                <p style={titleStyle}>{s.how_it_works.title || '¿Cómo funciona?'}</p>
                                                                {(s.how_it_works.bullets || []).map((b, i) => (
                                                                    <div key={i} style={bulletStyle}><div style={dotStyle} /><span>{b}</span></div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Why it matters */}
                                                    {s.why_it_matters && (
                                                        <div style={sectionStyle}>
                                                            <p style={titleStyle}>{s.why_it_matters.title || '¿Por qué importa?'}</p>
                                                            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                                                {(s.why_it_matters.bullets || []).map((b, i) => (
                                                                    <div key={i} style={{ flex: '1 1 200px', padding: '1rem 1.25rem', background: `${accent}10`, borderRadius: '12px', border: `1px solid ${accent}20`, color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', lineHeight: 1.6 }}>{b}</div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Analogy */}
                                                    {s.analogy && (
                                                        <div style={{ padding: '1.8rem 2rem', background: 'rgba(255,255,255,0.03)', border: `1px solid ${accent}30`, borderLeft: `4px solid ${accent}`, borderRadius: '18px' }}>
                                                            <p style={{ ...titleStyle, marginBottom: '0.75rem' }}>{s.analogy.title || 'Analogía'}</p>
                                                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '1rem', lineHeight: 1.75, fontStyle: 'italic' }}>{s.analogy.text}</p>
                                                        </div>
                                                    )}

                                                    {/* Key points */}
                                                    {s.key_points && s.key_points.length > 0 && (
                                                        <div style={sectionStyle}>
                                                            <p style={titleStyle}>Puntos Clave</p>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                                                {s.key_points.map((kp, i) => (
                                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: accent, background: `${accent}22`, padding: '2px 7px', borderRadius: '6px' }}>{i + 1}</span>
                                                                        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.5 }}>{kp}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Mini summary footer */}
                                                    {s.mini_summary && (
                                                        <div style={{ padding: '1.25rem 1.75rem', background: `${accent}18`, borderRadius: '14px', color: '#fff', fontSize: '0.95rem', fontWeight: 600, textAlign: 'center', letterSpacing: '0.3px' }}>
                                                            {s.mini_summary}
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

                            {activeTool === 'infografia' && (
                                <div style={{ flex: 1, padding: '5rem 3rem 3rem', overflowY: 'auto' }}>
                                    <InfographicView 
                                        conceptId={conceptId} 
                                        language={language} 
                                        accent={accent} 
                                    />
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
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.4; }
                    50%      { opacity: 0.7; }
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
