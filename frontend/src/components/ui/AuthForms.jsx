/**
 * AuthForms.jsx
 *
 * Fully internationalised sign-in / sign-up form.
 * - Language selector on sign-up updates AuthContext immediately so the
 *   entire app reflects the choice before the user even submits.
 * - All labels, placeholders, errors and buttons use the translation system.
 * - Inline validation with translated messages.
 */
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { translations } from '../../lib/translations';

/* ── language options ─────────────────────────────────────────────────── */
const LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
];

/* ── tiny t() helper — works without the hook (pre-auth context) ──────── */
function tx(lang, key) {
    return translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
}

/* ── password strength bar ────────────────────────────────────────────── */
function PasswordStrength({ password, lang }) {
    if (!password) return null;
    const len = password.length;
    const hasUpper = /[A-Z]/.test(password);
    const hasNum   = /\d/.test(password);
    const score    = (len >= 8 ? 1 : 0) + (len >= 12 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNum ? 1 : 0);
    const levels   = [
        { label: lang === 'es' ? 'Muy débil' : 'Very weak',  color: '#ef4444' },
        { label: lang === 'es' ? 'Débil'     : 'Weak',       color: '#f97316' },
        { label: lang === 'es' ? 'Regular'   : 'Fair',       color: '#eab308' },
        { label: lang === 'es' ? 'Fuerte'    : 'Strong',     color: '#22c55e' },
        { label: lang === 'es' ? 'Muy fuerte': 'Very strong',color: '#10b981' },
    ];
    const { label, color } = levels[Math.min(score, 4)];
    return (
        <div style={{ marginTop: '-0.25rem' }}>
            <div style={{ display: 'flex', gap: '3px', marginBottom: '4px' }}>
                {[0,1,2,3].map(i => (
                    <div key={i} style={{
                        flex: 1, height: '3px', borderRadius: '2px',
                        background: i < score ? color : 'rgba(255,255,255,0.1)',
                        transition: 'background 0.3s',
                    }} />
                ))}
            </div>
            <p style={{ margin: 0, fontSize: '0.7rem', color, letterSpacing: '0.3px' }}>{label}</p>
        </div>
    );
}

/* ── main component ───────────────────────────────────────────────────── */
export const AuthForm = ({ mode = 'signin', onToggleMode }) => {
    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState(null);
    const [signedUp, setSignedUp] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    const { signIn, signUp, language, updateLanguage } = useAuth();
    const navigate = useNavigate();
    const lang = language; // shorthand

    /* ── language toggle (updates context + localStorage immediately) ─── */
    const handleLangChange = (code) => {
        updateLanguage(code);
    };

    /* ── inline validation ────────────────────────────────────────────── */
    const validate = () => {
        const errs = {};
        if (!email.includes('@') || !email.includes('.')) {
            errs.email = tx(lang, 'authInvalidEmail');
        }
        if (password.length < 8) {
            errs.password = tx(lang, 'authPasswordTooShort');
        }
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    /* ── submit ───────────────────────────────────────────────────────── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!validate()) return;

        setLoading(true);
        try {
            if (mode === 'signup') {
                const result = await signUp({ email, password, language: lang });
                if (result.error) throw result.error;
                setSignedUp(true);
            } else {
                const result = await signIn({ email, password });
                if (result.error) throw result.error;
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.message ?? tx(lang, 'authError'));
        } finally {
            setLoading(false);
        }
    };

    /* ── email confirm banner ─────────────────────────────────────────── */
    if (signedUp) {
        return (
            <div className="glass-panel" style={{ padding: '2.5rem 2rem', width: '100%', maxWidth: '420px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>📬</div>
                <h2 className="heading-glow" style={{ marginBottom: '0.75rem', fontSize: '1.4rem' }}>
                    {tx(lang, 'authCheckEmail')}
                </h2>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                    {tx(lang, 'authCheckEmailDesc')}{' '}
                    <strong style={{ color: 'var(--primary-bright)' }}>{email}</strong>.
                </p>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '2rem', fontSize: '0.95rem' }}>
                    {tx(lang, 'authCheckEmailAction')}
                </p>
                <button className="btn-outline" onClick={onToggleMode}>
                    {tx(lang, 'authBackToSignIn')}
                </button>
            </div>
        );
    }

    /* ── form ─────────────────────────────────────────────────────────── */
    return (
        <div className="glass-panel" style={{ padding: '2.5rem 2rem', width: '100%', maxWidth: '420px' }}>

            {/* ── Language toggle — always visible ──────────────────── */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: '1.75rem',
            }}>
                {LANGUAGES.map(({ code, label, flag }) => {
                    const active = lang === code;
                    return (
                        <button
                            key={code}
                            type="button"
                            onClick={() => handleLangChange(code)}
                            style={{
                                padding: '0.35rem 1rem',
                                borderRadius: '20px',
                                border: active
                                    ? '1.5px solid var(--primary-bright)'
                                    : '1px solid rgba(255,255,255,0.12)',
                                background: active
                                    ? 'rgba(124,58,237,0.18)'
                                    : 'rgba(255,255,255,0.04)',
                                color: active ? 'var(--primary-bright)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                fontWeight: active ? 700 : 400,
                                fontSize: '0.82rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                transition: 'all 0.2s',
                                boxShadow: active ? '0 0 10px rgba(124,58,237,0.3)' : 'none',
                            }}
                        >
                            <span style={{ fontSize: '1rem' }}>{flag}</span>
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* ── Title ─────────────────────────────────────────────── */}
            <h2 className="heading-glow" style={{ marginBottom: '1.75rem', textAlign: 'center', fontSize: '1.5rem' }}>
                {mode === 'signin' ? tx(lang, 'authWelcomeBack') : tx(lang, 'authCreateAccount')}
            </h2>

            {/* ── Global error ──────────────────────────────────────── */}
            {error && (
                <div style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#fca5a5',
                    marginBottom: '1.25rem',
                    fontSize: '0.88rem',
                    lineHeight: 1.5,
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

                {/* Email */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <input
                        type="email"
                        placeholder={tx(lang, 'authEmailPlaceholder')}
                        className="input-glass"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: null })); }}
                        autoComplete="email"
                        required
                        style={fieldErrors.email ? { borderColor: '#ef4444' } : {}}
                    />
                    {fieldErrors.email && (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#f87171' }}>{fieldErrors.email}</p>
                    )}
                </div>

                {/* Password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <input
                        type="password"
                        placeholder={tx(lang, 'authPasswordPlaceholder')}
                        className="input-glass"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: null })); }}
                        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                        required
                        style={fieldErrors.password ? { borderColor: '#ef4444' } : {}}
                    />
                    {fieldErrors.password && (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#f87171' }}>{fieldErrors.password}</p>
                    )}
                    {mode === 'signup' && (
                        <PasswordStrength password={password} lang={lang} />
                    )}
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    className="btn-neon"
                    id="auth-submit-btn"
                    disabled={loading}
                    style={{ marginTop: '0.5rem', position: 'relative' }}
                >
                    {loading ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <span style={{
                                width: 14, height: 14,
                                border: '2px solid rgba(255,255,255,0.3)',
                                borderTop: '2px solid #fff',
                                borderRadius: '50%',
                                animation: 'authSpin 0.8s linear infinite',
                                display: 'inline-block',
                            }} />
                            {tx(lang, 'authProcessing')}
                        </span>
                    ) : (
                        mode === 'signin' ? tx(lang, 'authSignIn') : tx(lang, 'authSignUp')
                    )}
                </button>
            </form>

            {/* ── Toggle mode ───────────────────────────────────────── */}
            <p style={{ marginTop: '1.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {mode === 'signin' ? tx(lang, 'authNoAccount') : tx(lang, 'authHaveAccount')}{' '}
                <button
                    onClick={onToggleMode}
                    style={{
                        background: 'none', border: 'none',
                        color: 'var(--primary-bright)', cursor: 'pointer',
                        fontWeight: 700, fontSize: '0.9rem', fontFamily: 'inherit',
                        padding: 0,
                    }}
                >
                    {mode === 'signin' ? tx(lang, 'authSignUp') : tx(lang, 'authSignIn')}
                </button>
            </p>

            <style>{`
                @keyframes authSpin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};
