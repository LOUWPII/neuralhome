/**
 * AuthForms.jsx
 *
 * Sign-up now includes a language selector (Spanish / English).
 * The choice is forwarded to signUp() which stores it in Supabase user_metadata.
 */
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

/* ── language option data ─────────────────────────────────────────────── */
const LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export const AuthForm = ({ mode = 'signin', onToggleMode }) => {
    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [lang,     setLang]     = useState('en');     // only used in signup
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState(null);
    const [signedUp, setSignedUp] = useState(false);   // shows email-check banner

    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (mode === 'signup') {
                const result = await signUp({ email, password, language: lang });
                if (result.error) throw result.error;
                setSignedUp(true);          // show confirmation banner instead of alert
            } else {
                const result = await signIn({ email, password });
                if (result.error) throw result.error;
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    /* ── email confirm banner ─────────────────────────────────────────── */
    if (signedUp) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📬</div>
                <h2 className="heading-glow" style={{ marginBottom: '0.75rem' }}>Check your email</h2>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    We sent a confirmation link to <strong style={{ color: 'var(--primary-bright)' }}>{email}</strong>.
                    Click it to activate your account.
                </p>
                <button className="btn-outline" onClick={onToggleMode}>Back to Sign In</button>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '400px' }}>
            <h2 className="heading-glow" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h2>

            {error && (
                <p style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
                    {error}
                </p>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                    type="email"
                    placeholder="Email Address"
                    className="input-glass"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    className="input-glass"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    required
                />

                {/* ── Language selector — only shown on signup ─────────── */}
                {mode === 'signup' && (
                    <div>
                        <p style={{
                            fontSize: '0.75rem', color: 'var(--text-muted)',
                            marginBottom: '0.5rem', letterSpacing: '0.5px', textTransform: 'uppercase',
                        }}>
                            Preferred Language
                        </p>
                        <div style={{ display: 'flex', gap: '0.6rem' }}>
                            {LANGUAGES.map(({ code, label, flag }) => {
                                const selected = lang === code;
                                return (
                                    <button
                                        key={code}
                                        type="button"
                                        id={`lang-${code}`}
                                        onClick={() => setLang(code)}
                                        style={{
                                            flex: 1,
                                            padding: '0.6rem',
                                            borderRadius: '8px',
                                            border: selected
                                                ? '2px solid var(--primary-bright)'
                                                : '1px solid var(--border-neon)',
                                            background: selected
                                                ? 'rgba(124, 58, 237, 0.2)'
                                                : 'rgba(0,0,0,0.2)',
                                            color: selected ? 'var(--primary-bright)' : 'var(--text-muted)',
                                            cursor: 'pointer',
                                            fontFamily: 'inherit',
                                            fontWeight: selected ? 700 : 400,
                                            fontSize: '0.88rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.4rem',
                                            transition: 'all 0.2s',
                                            boxShadow: selected ? '0 0 12px rgba(124,58,237,0.4)' : 'none',
                                        }}
                                    >
                                        <span>{flag}</span> {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    className="btn-neon"
                    id="auth-submit-btn"
                    disabled={loading}
                    style={{ marginTop: '0.5rem' }}
                >
                    {loading ? 'Processing…' : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
                </button>
            </form>

            <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                <button
                    onClick={onToggleMode}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-bright)', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                </button>
            </p>
        </div>
    );
};
