import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const AuthForm = ({ mode = 'signin', onToggleMode }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            let result;
            if (mode === 'signup') {
                result = await signUp({ email, password });
                if (result.error) throw result.error;
                alert('Check your email for the login link!');
            } else {
                result = await signIn({ email, password });
                if (result.error) throw result.error;
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '400px' }}>
            <h2 className="heading-glow" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h2>

            {error && <p style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                    type="email"
                    placeholder="Email Address"
                    className="input-glass"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    className="input-glass"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit" className="btn-neon" disabled={loading} style={{ marginTop: '1rem' }}>
                    {loading ? 'Processing...' : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
                </button>
            </form>

            <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                <button
                    onClick={onToggleMode}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-bright)', cursor: 'pointer', fontWeight: 'bold' }}>
                    {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                </button>
            </p>
        </div>
    );
};
