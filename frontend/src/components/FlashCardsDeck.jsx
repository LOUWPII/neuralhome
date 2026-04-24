import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, X, RotateCw, RefreshCw } from 'lucide-react';

export default function FlashCardsDeck({ conceptId, accent, onClose }) {
    const [flashcards, setFlashcards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    
    // Tracking
    const [correctCount, setCorrectCount] = useState(0);
    const [incorrectCount, setIncorrectCount] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    
    useEffect(() => {
        fetchFlashcards();
    }, [conceptId]);
    
    const fetchFlashcards = async () => {
        setLoading(true);
        setError(null);
        setFlashcards([]);
        setCurrentIndex(0);
        setFlipped(false);
        setCorrectCount(0);
        setIncorrectCount(0);
        setIsFinished(false);
        
        try {
            // Re-using the JWT token approach used in quiz/chat
            // Need supabase imported if we fetch session, but let's assume we can fetch without auth or we'll pass token.
            // Wait, we need to import supabase here to get token. Let's do it inline.
            const { supabase } = await import('../lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            
            const res = await fetch(`http://127.0.0.1:8001/api/flashcards/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    concept_id: conceptId,
                    user_id: session?.user?.id || 'anonymous'
                })
            });
            
            if (!res.ok) {
                throw new Error("Error generating flashcards");
            }
            
            const data = await res.json();
            if (data.flashcards && data.flashcards.length > 0) {
                setFlashcards(data.flashcards);
            } else {
                throw new Error("No flashcards returned from server.");
            }
        } catch (err) {
            console.error(err);
            setError("Failed to load flashcards. Please try again.");
        } finally {
            setLoading(false);
        }
    };
    
    const handleNext = () => {
        if (currentIndex < flashcards.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setFlipped(false);
        } else {
            setIsFinished(true);
        }
    };
    
    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setFlipped(false);
        }
    };
    
    const markCorrect = () => {
        setCorrectCount(prev => prev + 1);
        handleNext();
    };
    
    const markIncorrect = () => {
        setIncorrectCount(prev => prev + 1);
        handleNext();
    };
    
    if (loading) {
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <RefreshCw size={32} color={accent} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
                <p>Generating flashcards with AI...</p>
                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }
    
    if (error) {
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
                <button 
                    onClick={fetchFlashcards}
                    style={{ background: accent, border: 'none', padding: '0.8rem 1.5rem', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}
                >
                    Retry
                </button>
            </div>
        );
    }
    
    if (isFinished) {
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: accent }}>Resumen de Estudio</h2>
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', minWidth: '150px' }}>
                        <Check size={32} color="#10b981" style={{ marginBottom: '0.5rem' }} />
                        <h3 style={{ margin: 0, fontSize: '2rem', color: '#10b981' }}>{correctCount}</h3>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)' }}>Correctas</p>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', minWidth: '150px' }}>
                        <X size={32} color="#ef4444" style={{ marginBottom: '0.5rem' }} />
                        <h3 style={{ margin: 0, fontSize: '2rem', color: '#ef4444' }}>{incorrectCount}</h3>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)' }}>Incorrectas</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                        onClick={fetchFlashcards}
                        style={{ background: 'transparent', border: `1px solid ${accent}`, padding: '0.8rem 1.5rem', borderRadius: '8px', color: accent, cursor: 'pointer' }}
                    >
                        Reintentar con nuevas
                    </button>
                    <button 
                        onClick={onClose}
                        style={{ background: accent, border: 'none', padding: '0.8rem 1.5rem', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}
                    >
                        Terminar
                    </button>
                </div>
            </div>
        );
    }
    
    const card = flashcards[currentIndex];
    
    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                <span>{card.tipo === 'pregunta' ? 'Pregunta' : 'Completar'}</span>
                <span>Tarjeta {currentIndex + 1} de {flashcards.length}</span>
            </div>
            
            {/* Flashcard container with 3D perspective */}
            <div 
                style={{
                    perspective: '1000px',
                    width: '100%',
                    height: '300px',
                    marginBottom: '2rem',
                    cursor: 'pointer'
                }}
                onClick={() => setFlipped(!flipped)}
            >
                <div style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    transition: 'transform 0.6s',
                    transformStyle: 'preserve-3d',
                    transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}>
                    {/* Front */}
                    <div style={{
                        position: 'absolute', width: '100%', height: '100%',
                        backfaceVisibility: 'hidden',
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${accent}44`,
                        borderRadius: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '2rem', textAlign: 'center',
                        boxShadow: `0 10px 30px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,255,255,0.02)`
                    }}>
                        <h3 style={{ fontSize: '1.4rem', color: '#fff', lineHeight: 1.5, fontWeight: 500 }}>
                            {card.frente}
                        </h3>
                        <div style={{ position: 'absolute', bottom: '1rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <RotateCw size={14} /> Click para voltear
                        </div>
                    </div>
                    
                    {/* Back */}
                    <div style={{
                        position: 'absolute', width: '100%', height: '100%',
                        backfaceVisibility: 'hidden',
                        background: `${accent}11`,
                        border: `2px solid ${accent}`,
                        borderRadius: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '2rem', textAlign: 'center',
                        transform: 'rotateY(180deg)',
                        boxShadow: `0 10px 30px rgba(0,0,0,0.5), inset 0 0 40px ${accent}22`
                    }}>
                        <h3 style={{ fontSize: '1.6rem', color: '#fff', lineHeight: 1.5, fontWeight: 700 }}>
                            {card.reverso}
                        </h3>
                    </div>
                </div>
            </div>
            
            {/* Controls */}
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <button 
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: '0.8rem', borderRadius: '50%', color: '#fff', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', opacity: currentIndex === 0 ? 0.3 : 1 }}
                >
                    <ArrowLeft size={20} />
                </button>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                        onClick={markIncorrect}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '0.8rem 1.5rem', borderRadius: '8px', color: '#f87171', cursor: 'pointer', fontWeight: 600 }}
                    >
                        <X size={18} /> Incorrecta
                    </button>
                    <button 
                        onClick={markCorrect}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', padding: '0.8rem 1.5rem', borderRadius: '8px', color: '#34d399', cursor: 'pointer', fontWeight: 600 }}
                    >
                        <Check size={18} /> Correcta
                    </button>
                </div>
                
                <button 
                    onClick={handleNext}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: '0.8rem', borderRadius: '50%', color: '#fff', cursor: 'pointer' }}
                >
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
}
