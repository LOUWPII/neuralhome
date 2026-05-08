/**
 * useTranslation.js
 * 
 * Hook to access translations based on user's language preference.
 */
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../lib/translations';

export const useTranslation = () => {
    const { language } = useAuth();
    
    const t = (key, params = {}) => {
        let text = translations[language]?.[key] || translations['en']?.[key] || key;
        
        // Replace parameters like {current} or {total}
        Object.keys(params).forEach(param => {
            text = text.replace(`{${param}}`, params[param]);
        });
        
        return text;
    };
    
    return { t, language };
};
