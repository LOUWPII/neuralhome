/**
 * AuthContext.jsx
 *
 * Extends auth with:
 *  - language preference ('es' | 'en'), stored in Supabase user_metadata
 *    AND in localStorage so it persists before/after login.
 *  - updateLanguage(lang) helper
 *  - language is exposed to all consumers via context
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext({});

const LANG_STORAGE_KEY = 'neuralhome_lang';
const VALID_LANGS = ['en', 'es'];

function getStoredLang() {
    try {
        const stored = localStorage.getItem(LANG_STORAGE_KEY);
        return VALID_LANGS.includes(stored) ? stored : 'en';
    } catch {
        return 'en';
    }
}

function storeLang(lang) {
    try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch {}
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    // Initialize from localStorage so language is available immediately,
    // even before the user is authenticated.
    const [language, setLanguage] = useState(getStoredLang);
    const [loading, setLoading] = useState(true);

    /* ── derive language from user_metadata whenever user changes ── */
    function applyLanguageFromUser(u) {
        const lang = u?.user_metadata?.language;
        if (VALID_LANGS.includes(lang)) {
            setLanguage(lang);
            storeLang(lang);
        }
    }

    useEffect(() => {
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

    /* ── update language preference ── */
    const updateLanguage = async (lang) => {
        if (!VALID_LANGS.includes(lang)) return;
        // Always update locally first for instant UI response
        setLanguage(lang);
        storeLang(lang);
        // Persist to Supabase if logged in
        if (user) {
            const { error } = await supabase.auth.updateUser({ data: { language: lang } });
            return error;
        }
    };

    /* ── sign-up wraps language into metadata ── */
    const signUp = ({ email, password, language: lang = 'en' }) => {
        storeLang(lang);
        return supabase.auth.signUp({
            email,
            password,
            options: { data: { language: lang } },
        });
    };

    const value = {
        signUp,
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
