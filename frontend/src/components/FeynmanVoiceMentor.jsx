/**
 * FeynmanVoiceMentor.jsx  — v3 (bullet-proof STT)
 *
 * Key fix: SpeechRecognition is created FRESH on each mic click,
 * eliminating all stale closure and lifecycle bugs.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Volume2, VolumeX, Brain, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

const API_BASE = 'http://localhost:8001';

/* ── TTS Voice picker ──────────────────────────────────────────────────── */
function pickBestVoice() {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const scored = voices
        .filter(v => v.lang.startsWith('es'))
        .map(v => {
            let s = 0;
            const n = v.name.toLowerCase();
            if (n.includes('natural')) s += 100;
            if (n.includes('google'))  s += 80;
            if (n.includes('online')) s += 60;
            if (n.includes('espeak') || n.includes('mbrola')) s -= 50;
            return { voice: v, score: s };
        })
        .sort((a, b) => b.score - a.score);
    return scored[0]?.voice || voices.find(v => v.lang.startsWith('es')) || voices[0];
}

/* ── TTS Queue (speaks sentences one by one) ───────────────────────────── */
class TTSQueue {
    constructor() { this.queue = []; this.speaking = false; this.onStateChange = null; }
    enqueue(text, voice) {
        if (!text.trim()) return;
        this.queue.push({ text, voice });
        if (!this.speaking) this._next();
    }
    _next() {
        if (!this.queue.length) { this.speaking = false; this.onStateChange?.(false); return; }
        this.speaking = true; this.onStateChange?.(true);
        const { text, voice } = this.queue.shift();
        const u = new SpeechSynthesisUtterance(text);
        u.voice = voice; u.lang = 'es-ES'; u.rate = 0.95; u.pitch = 1.0;
        u.onend = () => this._next();
        u.onerror = () => this._next();
        window.speechSynthesis.speak(u);
    }
    cancel() { this.queue = []; this.speaking = false; window.speechSynthesis.cancel(); this.onStateChange?.(false); }
}

/* ── Component ─────────────────────────────────────────────────────────── */
export default function FeynmanVoiceMentor({ conceptId, language = 'es', accent = '#a78bfa', onClose }) {
    const [messages, setMessages] = useState([]);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [textInput, setTextInput] = useState('');
    const [sttStatus, setSttStatus] = useState(''); // visible debug status

    const voiceRef = useRef(null);
    const ttsQ = useRef(new TTSQueue());
    const bottomRef = useRef(null);
    const activeRecognition = useRef(null); // current live recognition instance
    const pendingMsg = useRef(null);
    const silenceTimerRef = useRef(null);
    const accumulatedTextRef = useRef('');
    const messagesRef = useRef(messages);
    const processingRef = useRef(false);

    useEffect(() => { messagesRef.current = messages; }, [messages]);
    useEffect(() => { processingRef.current = isProcessing; }, [isProcessing]);

    // TTS state sync
    useEffect(() => {
        ttsQ.current.onStateChange = s => setIsSpeaking(s);
        return () => ttsQ.current.cancel();
    }, []);

    // Load voices
    useEffect(() => {
        const load = () => { const v = pickBestVoice(); if (v) voiceRef.current = v; };
        load();
        window.speechSynthesis.onvoiceschanged = load;
        return () => { window.speechSynthesis.onvoiceschanged = null; };
    }, []);

    // Auto-scroll
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, currentTranscript]);

    /* ── Send to backend (SSE stream) ──────────────────────────────────── */
    const sendMessage = useCallback(async (text) => {
        if (!text.trim()) return;
        if (processingRef.current) {
            pendingMsg.current = text;
            setSttStatus('⏳ Mensaje en cola...');
            return;
        }

        const userMsg = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setIsProcessing(true);
        setSttStatus('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('No auth session');

            const hist = [...messagesRef.current, userMsg].slice(-10).map(m => ({ role: m.role, content: m.content }));

            const res = await fetch(`${API_BASE}/api/chat/feynman-voice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ concept_id: conceptId, message: text, language: 'es', history: hist }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let full = '', sentBuf = '', sseBuf = '';

            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                sseBuf += decoder.decode(value, { stream: true });
                const lines = sseBuf.split('\n');
                sseBuf = lines.pop() || '';
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const d = line.slice(6).trim();
                    if (d === '[DONE]' || d.startsWith('[ERROR]')) continue;
                    try {
                        const tok = JSON.parse(d).token || '';
                        full += tok; sentBuf += tok;
                        setMessages(prev => { const c = [...prev]; c[c.length-1] = { role: 'assistant', content: full }; return c; });
                        if (ttsEnabled && /[.!?]\s*$/.test(sentBuf)) {
                            ttsQ.current.enqueue(sentBuf.trim(), voiceRef.current);
                            sentBuf = '';
                        }
                    } catch {}
                }
            }
            if (ttsEnabled && sentBuf.trim()) ttsQ.current.enqueue(sentBuf.trim(), voiceRef.current);

        } catch (err) {
            console.error('[Voice] Error:', err);
            setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Error de conexión. Intenta de nuevo.' }]);
        } finally {
            setIsProcessing(false);
            if (pendingMsg.current) {
                const p = pendingMsg.current; pendingMsg.current = null;
                setTimeout(() => sendMessageRef.current(p), 300);
            }
        }
    }, [conceptId, ttsEnabled]);

    const sendMessageRef = useRef(sendMessage);
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    // Auto-greeting
    useEffect(() => {
        if (conceptId) sendMessageRef.current('Hola, quiero empezar a estudiar este concepto.');
    }, [conceptId]);

    /* ── MIC: Create fresh recognition on EACH click ───────────────────── */
    const triggerSend = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        const text = accumulatedTextRef.current.trim();
        accumulatedTextRef.current = '';

        if (activeRecognition.current) {
            try { activeRecognition.current.stop(); } catch {}
            activeRecognition.current = null;
        }

        if (text) {
            setSttStatus('✅ Mensaje capturado!');
            setCurrentTranscript('');
            sendMessageRef.current(text);
        } else {
            setIsListening(false);
            setSttStatus('✓ Listo');
        }
    };

    function startListening() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { setSttStatus('❌ Tu navegador no soporta reconocimiento de voz'); return; }

        // Stop TTS (barge-in)
        ttsQ.current.cancel();

        // Kill any previous instance & clear timers
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        accumulatedTextRef.current = '';

        if (activeRecognition.current) {
            try { activeRecognition.current.abort(); } catch {}
            activeRecognition.current = null;
        }

        const rec = new SR();
        rec.lang = 'es-ES';
        rec.continuous = true;
        rec.interimResults = true;

        rec.onstart = () => {
            setSttStatus('🎤 Micrófono activo — habla ahora');
            setIsListening(true);
            setCurrentTranscript('');
        };

        rec.onresult = (event) => {
            let interim = '', final = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
                else interim += event.results[i][0].transcript;
            }

            if (final) {
                accumulatedTextRef.current += final;
            }

            const currentDisplay = accumulatedTextRef.current + interim;
            setCurrentTranscript(currentDisplay);

            if (currentDisplay.trim()) {
                setSttStatus(`🎤 Escuchando... (se enviará en 3s)`);
                
                // Reset the 3-second timer
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = setTimeout(() => {
                    triggerSend();
                }, 3000);
            }
        };

        rec.onerror = (e) => {
            const msg = {
                'not-allowed': '❌ Permiso denegado. Haz clic en el candado en la barra de direcciones.',
                'no-speech': '🔇 No se detectó voz.',
                'audio-capture': '❌ No se encontró micrófono.',
            }[e.error] || `❌ Error: ${e.error}`;
            setSttStatus(msg);
            console.error('[STT] Error:', e.error);
        };

        rec.onend = () => {
            if (accumulatedTextRef.current.trim()) {
                triggerSend();
            } else {
                setIsListening(false);
            }
        };

        activeRecognition.current = rec;

        try {
            rec.start();
        } catch (err) {
            setSttStatus(`❌ Error al iniciar micro: ${err.message}`);
            setIsListening(false);
        }
    }

    function stopListening() {
        triggerSend();
    }

    /* ── Render ────────────────────────────────────────────────────────── */
    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            height: '100%', background: 'rgba(5,0,14,0.95)',
            borderRadius: '16px', overflow: 'hidden',
            border: `1px solid ${accent}22`,
        }}>
            {/* Header */}
            <div style={{
                padding: '0.6rem 1rem', borderBottom: `1px solid ${accent}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: `${accent}08`,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: `${accent}22`, border: `1px solid ${accent}55`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: isSpeaking ? `0 0 12px ${accent}66` : 'none',
                    }}>
                        <Brain size={13} color={accent} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                            Feynman Voice Tutor
                        </p>
                        <p style={{ margin: 0, fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)' }}>
                            {isSpeaking ? '🔊 Hablando...' : isListening ? '🎤 Escuchando...' : isProcessing ? '💭 Pensando...' : '✓ Listo'}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button onClick={() => { if (ttsEnabled) ttsQ.current.cancel(); setTtsEnabled(!ttsEnabled); }}
                        style={{ background: 'transparent', border: `1px solid ${accent}33`, borderRadius: '6px', padding: '0.3rem', cursor: 'pointer', color: ttsEnabled ? accent : 'rgba(255,255,255,0.3)' }}>
                        {ttsEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                    </button>
                    {onClose && <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${accent}33`, borderRadius: '6px', padding: '0.3rem 0.5rem', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>✕</button>}
                </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', scrollbarWidth: 'thin' }}>
                {messages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        {msg.role === 'assistant' && (
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${accent}22`, border: `1px solid ${accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: '0.3rem', alignSelf: 'flex-end' }}>
                                <Brain size={9} color={accent} />
                            </div>
                        )}
                        <div style={{
                            maxWidth: '82%', padding: '0.5rem 0.8rem',
                            borderRadius: msg.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                            background: msg.role === 'user' ? `linear-gradient(135deg, ${accent}cc, ${accent}88)` : 'rgba(255,255,255,0.06)',
                            border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                            color: '#f1f5f9', fontSize: '0.82rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                            {msg.content || <span style={{ display: 'flex', gap: '0.25rem', opacity: 0.5 }}>{[0,1,2].map(d => <span key={d} style={{ width: 5, height: 5, borderRadius: '50%', background: accent, animation: `fvmDot 1.3s ease-in-out ${d*0.2}s infinite` }} />)}</span>}
                        </div>
                    </div>
                ))}

                {currentTranscript && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ maxWidth: '82%', padding: '0.45rem 0.8rem', borderRadius: '12px 12px 3px 12px', background: `${accent}22`, border: `1px dashed ${accent}44`, color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', fontStyle: 'italic' }}>
                            {currentTranscript}…
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* STT Status Bar — visible debug */}
            {sttStatus && (
                <div style={{
                    padding: '0.3rem 0.8rem', fontSize: '0.68rem',
                    color: sttStatus.startsWith('❌') ? '#f87171' : sttStatus.startsWith('✅') ? '#4ade80' : '#fbbf24',
                    background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.05)',
                    textAlign: 'center',
                }}>
                    {sttStatus}
                </div>
            )}

            {/* Bottom: Mic + Text */}
            <div style={{ padding: '0.6rem 0.8rem', borderTop: `1px solid ${accent}22`, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.3)' }}>
                <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={isProcessing}
                    style={{
                        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${isListening ? '#ef4444' : accent}`,
                        background: isListening ? 'rgba(239,68,68,0.2)' : `${accent}15`,
                        color: isListening ? '#ef4444' : accent,
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: isProcessing ? 0.35 : 1,
                        boxShadow: isListening ? '0 0 16px rgba(239,68,68,0.35)' : `0 0 10px ${accent}22`,
                        animation: isListening ? 'fvmPulse 1.4s ease-in-out infinite' : 'none',
                        transition: 'all 0.25s',
                    }}
                >
                    {isListening ? <Square size={18} /> : <Mic size={18} />}
                </button>

                <input type="text" value={textInput} onChange={e => setTextInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && textInput.trim() && !isProcessing) { e.preventDefault(); sendMessage(textInput.trim()); setTextInput(''); } }}
                    disabled={isProcessing} placeholder={isListening ? 'Escuchando...' : 'O escribe aquí...'}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${accent}33`, borderRadius: '10px', color: '#f1f5f9', fontFamily: 'inherit', fontSize: '0.82rem', padding: '0.55rem 0.75rem', outline: 'none' }}
                />

                <button onClick={() => { if (textInput.trim() && !isProcessing) { sendMessage(textInput.trim()); setTextInput(''); } }}
                    disabled={isProcessing || !textInput.trim()}
                    style={{ width: 36, height: 36, borderRadius: '10px', flexShrink: 0, background: `linear-gradient(135deg, ${accent}, ${accent}88)`, border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isProcessing || !textInput.trim() ? 0.3 : 1 }}>
                    <Send size={16} />
                </button>
            </div>

            <style>{`
                @keyframes fvmPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
                @keyframes fvmDot { 0%, 80%, 100% { transform: scale(0.5); opacity: 0.3; } 40% { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
}
