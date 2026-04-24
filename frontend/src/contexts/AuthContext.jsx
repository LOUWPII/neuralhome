/**
 * AuthContext.jsx
 *
 * Extends auth with:
 *  - language preference ('es' | 'en'), stored in Supabase user_metadata
 *  - updateLanguage(lang) helper
 *  - language is exposed to all consumers via context
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [language, setLanguage] = useState('en');   // 'en' | 'es'
    const [loading, setLoading] = useState(true);

    /* ── derive language from user_metadata whenever user changes ── */
    function applyLanguageFromUser(u) {
        const lang = u?.user_metadata?.language;
        if (lang === 'es' || lang === 'en') setLanguage(lang);
    }

    useEffect(() => {
        // Check active session
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                const u = session?.user ?? null;
                setUser(u);
                applyLanguageFromUser(u);
            })
            .catch(err => {
                console.error("Supabase Session Error:", err);
                setUser(null);
            })
            .finally(() => setLoading(false));

        // Listen to auth changes
        let subscription;
        try {
            const result = supabase.auth.onAuthStateChange((_event, session) => {
                const u = session?.user ?? null;
                setUser(u);
                applyLanguageFromUser(u);
            });
            subscription = result?.data?.subscription;
        } catch (e) {
            console.warn("Could not start auth subscription:", e);
        }

        return () => { if (subscription) subscription.unsubscribe(); };
    }, []);

    /* ── update language preference in Supabase metadata ── */
    const updateLanguage = async (lang) => {
        const { error } = await supabase.auth.updateUser({
            data: { language: lang }
        });
        if (!error) setLanguage(lang);
        return error;
    };

    /* ── sign-up wraps language into metadata ── */
    const signUp = ({ email, password, language: lang = 'en' }) =>
        supabase.auth.signUp({
            email,
            password,
            options: { data: { language: lang } },
        });

    const value = {
        signUp: (data) => supabase.auth.signUp({
            ...data,
            options: {
                emailRedirectTo: window.location.origin
            }
        }),
        signIn: (data) => supabase.auth.signInWithPassword(data),
        signOut: () => supabase.auth.signOut(),
        updateLanguage,
        user,
        language,
        loading,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
