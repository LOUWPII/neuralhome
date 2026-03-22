import React, { useState, useRef } from 'react';
import { AuthForm } from '../components/ui/AuthForms';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import HeroParticleCanvas from '../components/HeroParticleCanvas';

export default function LandingPage() {
    const { user } = useAuth();
    const [authMode, setAuthMode] = useState(null); // 'signin' or 'signup'
    const heroRef = useRef(null);

    // If already logged in, go to dashboard
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

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
                {/* Logo + Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img
                        src="/logo.png"
                        alt="NeuralHome Logo"
                        style={{
                            width: '34px',
                            height: '34px',
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 0 6px rgba(167, 139, 250, 0.7))',
                        }}
                    />
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', letterSpacing: '-0.01em' }}>
                        NeuralHome
                    </h1>
                </div>

                {/* Nav links */}
                <div className="nav-links">
                    <span style={{ cursor: 'pointer' }}>Infrastructure</span>
                    <span style={{ cursor: 'pointer' }}>Features</span>
                    <span style={{ cursor: 'pointer' }}>About Us</span>
                </div>

                <button
                    className="btn-outline"
                    onClick={() => setAuthMode('signin')}
                >
                    Start Exploring
                </button>
            </nav>

            {/* ── Main Content containing Hero and Assets ────────────── */}
            <main
                ref={heroRef}
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Particle mouse-trail canvas — scoped to main */}
                <HeroParticleCanvas containerRef={heroRef} />

                {/* ── Hero Section ───────────────────────────────────────── */}
                <section
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        paddingTop: '4rem',
                        paddingBottom: '4rem',
                        paddingLeft: '1.5rem',
                        paddingRight: '1.5rem',
                        position: 'relative',
                        zIndex: 2,
                    }}
                >
                    {/* Hero content sits above the canvas (z-index: 2) */}
                <div style={{ position: 'relative', zIndex: 2, maxWidth: '800px', width: '100%' }}>
                    <h1
                        className="heading-glow animate-float"
                        style={{
                            fontSize: 'clamp(3rem, 8vw, 5rem)',
                            fontWeight: 'bold',
                            lineHeight: 1.1,
                            marginBottom: '1.5rem',
                        }}
                    >
                        Step into the Future <br /> of Knowledge
                    </h1>

                    <p style={{
                        color: 'var(--text-muted)',
                        fontSize: '1.25rem',
                        maxWidth: '600px',
                        margin: '0 auto 3rem',
                    }}>
                        Maximize your potential with a powerful 3D Mental Palace built
                        to shape the future of digital learning.
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button className="btn-neon" onClick={() => setAuthMode('signup')}>
                            Sign Up for Free
                        </button>
                        <button className="btn-outline" onClick={() => alert('Live demo booting...')}>
                            Live Demo
                        </button>
                    </div>
                </div>

                {/* Auth Modal Overlay */}
                {authMode && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 50,
                        padding: '1rem',
                    }}>
                        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                            <button
                                onClick={() => setAuthMode(null)}
                                style={{
                                    position: 'absolute',
                                    top: '-40px',
                                    right: '0',
                                    background: 'none',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
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
            </section>

            {/* ── Decorative 3D assets ───────────────────────────────── */}
            <div style={{
                height: '300px',
                width: '100%',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10vw',
                zIndex: 2,
            }}>
                <div className="animate-float" style={{ fontSize: '8rem', color: 'var(--primary-glow)', opacity: 0.5, textShadow: '0 0 30px var(--primary-bright)', animationDelay: '0s' }}>⌬</div>
                <div className="animate-float" style={{ fontSize: '10rem', color: 'var(--primary-glow)', opacity: 0.8, textShadow: '0 0 40px var(--primary-bright)', animationDelay: '1s' }}>◆</div>
                <div className="animate-float" style={{ fontSize: '8rem', color: 'var(--primary-glow)', opacity: 0.5, textShadow: '0 0 30px var(--primary-bright)', animationDelay: '2s' }}>⎔</div>
            </div>
            
            </main>
        </div>
    );
}
