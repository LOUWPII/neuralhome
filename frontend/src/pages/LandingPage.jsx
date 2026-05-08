import React, { useState, useRef } from 'react';
import { AuthForm } from '../components/ui/AuthForms';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import HeroParticleCanvas from '../components/HeroParticleCanvas';
import { useTranslation } from '../contexts/useTranslation';

export default function LandingPage() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [authMode, setAuthMode] = useState(null); // 'signin' | 'signup'
    const heroRef = useRef(null);

    if (user) return <Navigate to="/dashboard" replace />;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>

            {/* ── Navbar ─────────────────────────────────────────────── */}
            <nav style={{
                padding: '1.5rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative',
                zIndex: 10,
                maxWidth: '1200px',
                margin: '0 auto',
                width: '100%',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img
                        src="/logo.png"
                        alt="NeuralHome Logo"
                        style={{
                            width: '34px', height: '34px', objectFit: 'contain',
                            filter: 'drop-shadow(0 0 6px rgba(167,139,250,0.7))',
                        }}
                    />
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', letterSpacing: '-0.01em' }}>
                        NeuralHome
                    </h1>
                </div>

                <div className="nav-links">
                    <span style={{ cursor: 'pointer' }}>{t('landingNavInfrastructure')}</span>
                    <span style={{ cursor: 'pointer' }}>{t('landingNavFeatures')}</span>
                    <span style={{ cursor: 'pointer' }}>{t('landingNavAbout')}</span>
                </div>

                <button className="btn-outline" onClick={() => setAuthMode('signin')}>
                    {t('landingStartExploring')}
                </button>
            </nav>

            {/* ── Main ───────────────────────────────────────────────── */}
            <main
                ref={heroRef}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
            >
                <HeroParticleCanvas containerRef={heroRef} />

                {/* ── Hero ───────────────────────────────────────────── */}
                <section style={{
                    flex: 1,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    textAlign: 'center',
                    padding: '4rem 1.5rem',
                    position: 'relative', zIndex: 2,
                }}>
                    <div style={{ position: 'relative', zIndex: 2, maxWidth: '800px', width: '100%' }}>
                        <h1
                            className="heading-glow animate-float"
                            style={{
                                fontSize: 'clamp(2.8rem, 8vw, 5rem)',
                                fontWeight: 'bold',
                                lineHeight: 1.1,
                                marginBottom: '1.5rem',
                            }}
                        >
                            {t('landingHeroTitle')}
                        </h1>

                        <p style={{
                            color: 'var(--text-muted)',
                            fontSize: '1.2rem',
                            maxWidth: '600px',
                            margin: '0 auto 3rem',
                            lineHeight: 1.65,
                        }}>
                            {t('landingHeroSubtitle')}
                        </p>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button className="btn-neon" onClick={() => setAuthMode('signup')}>
                                {t('landingSignUpFree')}
                            </button>
                            <button className="btn-outline" onClick={() => alert('Live demo booting...')}>
                                {t('landingLiveDemo')}
                            </button>
                        </div>
                    </div>
                </section>

                {/* ── Decorative 3D assets ───────────────────────────── */}
                <div style={{
                    height: '300px', width: '100%', position: 'relative',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '10vw', zIndex: 2,
                }}>
                    <div className="animate-float" style={{ fontSize: '8rem', color: 'var(--primary-glow)', opacity: 0.5, textShadow: '0 0 30px var(--primary-bright)', animationDelay: '0s' }}>⌬</div>
                    <div className="animate-float" style={{ fontSize: '10rem', color: 'var(--primary-glow)', opacity: 0.8, textShadow: '0 0 40px var(--primary-bright)', animationDelay: '1s' }}>◆</div>
                    <div className="animate-float" style={{ fontSize: '8rem', color: 'var(--primary-glow)', opacity: 0.5, textShadow: '0 0 30px var(--primary-bright)', animationDelay: '2s' }}>⎔</div>
                </div>
            </main>

            {/* ── Auth Modal ─────────────────────────────────────────── */}
            {authMode && (
                <div style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999, padding: '1.5rem',
                }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
                        <button
                            id="close-auth-modal"
                            onClick={() => setAuthMode(null)}
                            style={{
                                position: 'absolute', top: '-48px', right: '0',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '50%', width: '36px', height: '36px',
                                color: 'white', fontSize: '1.2rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            &times;
                        </button>
                        <AuthForm
                            mode={authMode}
                            onToggleMode={() => setAuthMode(m => m === 'signin' ? 'signup' : 'signin')}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
