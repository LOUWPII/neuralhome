import React from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * StudyToolCard.jsx
 * 
 * A premium toolkit card with glassmorphism and hover effects.
 */
export default function StudyToolCard({ 
    title, 
    description, 
    icon: Icon, 
    accent, 
    active = false, 
    disabled = false,
    onClick 
}) {
    return (
        <div 
            onClick={!disabled ? onClick : undefined}
            style={{
                background: active ? `${accent}1a` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? accent : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '16px',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1.2rem',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                opacity: disabled ? 0.6 : 1,
            }}
            onMouseEnter={e => {
                if (!disabled) {
                    e.currentTarget.style.background = active ? `${accent}25` : 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.borderColor = active ? accent : `${accent}66`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                }
            }}
            onMouseLeave={e => {
                if (!disabled) {
                    e.currentTarget.style.background = active ? `${accent}1a` : 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = active ? accent : 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                }
            }}
        >
            {/* Active glow */}
            {active && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, bottom: 0, width: '3px',
                    background: accent,
                    boxShadow: `0 0 15px ${accent}`,
                }} />
            )}

            {/* Icon Container */}
            <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: active ? `${accent}22` : 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: active ? `1px solid ${accent}44` : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease',
            }}>
                <Icon size={24} color={active ? accent : 'rgba(255,255,255,0.6)'} />
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
                <h3 style={{ 
                    margin: '0 0 0.2rem 0', 
                    fontSize: '1rem', 
                    fontWeight: 600, 
                    color: active ? '#fff' : '#e2e8f0' 
                }}>
                    {title}
                </h3>
                <p style={{ 
                    margin: 0, 
                    fontSize: '0.8rem', 
                    color: 'rgba(255,255,255,0.45)',
                    lineHeight: 1.4
                }}>
                    {description}
                </p>
            </div>

            {/* Status / Action */}
            <div style={{ color: active ? accent : 'rgba(255,255,255,0.2)' }}>
                {active ? (
                    <span style={{ 
                        fontSize: '0.65rem', 
                        fontWeight: 700, 
                        textTransform: 'uppercase', 
                        letterSpacing: '1px' 
                    }}>
                        ACTIVE
                    </span>
                ) : (
                    <ChevronRight size={20} />
                )}
            </div>
        </div>
    );
}
