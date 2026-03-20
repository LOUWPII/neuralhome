import React, { useState } from 'react';
import { AuthForm } from '../components/ui/AuthForms';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function LandingPage() {
    const { user } = useAuth();
    const [authMode, setAuthMode] = useState(null); // 'signin' or 'signup'

    // If already logged in, go to dashboard
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Navbar mock */}
            <nav style={{ padding: '2rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-bright), var(--primary-glow))' }}></div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>NeuralHome</h1>
                </div>

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

            {/* Main Hero */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingTop: '4rem', paddingBottom: '4rem' }}>

                <h1 className="heading-glow animate-float" style={{ fontSize: 'clamp(3rem, 8vw, 5rem)', fontWeight: 'bold', lineHeight: 1.1, marginBottom: '1.5rem', maxWidth: '800px' }}>
                    Step into the Future <br /> of Knowledge
                </h1>

                <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem', maxWidth: '600px', marginBottom: '3rem' }}>
                    Maximize your potential with a powerful 3D Mental Palace built to shape the future of digital learning.
                </p>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-neon" onClick={() => setAuthMode('signup')}>
                        Sign Up for Free
                    </button>
                    <button className="btn-outline" onClick={() => alert('Live demo booting...')}>
                        Live Demo
                    </button>
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
                        padding: '1rem'
                    }}>
                        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                            <button
                                onClick={() => setAuthMode(null)}
                                style={{ position: 'absolute', top: '-40px', right: '0', background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}
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
            </main>

            {/* 3D decorative assets representation */}
            <div style={{ height: '300px', width: '100%', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10vw' }}>
                <div className="animate-float" style={{ fontSize: '8rem', color: 'var(--primary-glow)', opacity: 0.5, textShadow: '0 0 30px var(--primary-bright)', animationDelay: '0s' }}>⌬</div>
                <div className="animate-float" style={{ fontSize: '10rem', color: 'var(--primary-glow)', opacity: 0.8, textShadow: '0 0 40px var(--primary-bright)', animationDelay: '1s' }}>◆</div>
                <div className="animate-float" style={{ fontSize: '8rem', color: 'var(--primary-glow)', opacity: 0.5, textShadow: '0 0 30px var(--primary-bright)', animationDelay: '2s' }}>⎔</div>
            </div>
        </div>
    );
}
