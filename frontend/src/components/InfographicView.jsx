/**
 * InfographicView.jsx — Professional Infographic Renderer v2
 *
 * Hybrid architecture: AI-generated visual background + HTML content overlay.
 * Designed to look like a real infographic: clear hierarchy, defined sections,
 * icons, data callouts, and a clean typographic system.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from '../contexts/useTranslation';

// ── Inline SVG icon system ────────────────────────────────────────────────
const ICONS = {
    circle: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z",
    arrow:  "M5 12h14M12 5l7 7-7 7",
    star:   "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    check:  "M20 6L9 17l-5-5",
    bolt:   "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    brain:  "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z",
    chart:  "M18 20V10M12 20V4M6 20v-6",
    lock:   "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
    leaf:   "M17 8C8 10 5.9 16.17 3.82 19.34L5.71 21l1-1.3A4.49 4.49 0 0 0 8 20c4 0 4-2 8-2s4 2 8 2V8z",
    gear:   "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4",
    default:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
};

// Section index → icon hint fallback cycle
const ICON_CYCLE = ['bolt', 'chart', 'check', 'star', 'leaf', 'gear', 'lock', 'brain'];

function SvgIcon({ hint, size = 18, color = '#fff', strokeWidth = 2 }) {
    const d = ICONS[hint] || ICONS.default;
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0 }}>
            <path d={d} />
        </svg>
    );
}

// ── Color palettes ────────────────────────────────────────────────────────
const DEFAULT_PALETTE = {
    primary: '#1a73e8', secondary: '#4285f4', accent: '#0d47a1',
    bg_light: '#e8f0fe', text_on_primary: '#ffffff', label: 'Blue',
};

// ── Layout badge labels ───────────────────────────────────────────────────
const LAYOUT_LABELS = {
    flow:       { en: 'Process Flow',   es: 'Flujo de Proceso' },
    comparison: { en: 'Comparison',     es: 'Comparación' },
    hierarchy:  { en: 'Hierarchy',      es: 'Jerarquía' },
    stats:      { en: 'Data & Stats',   es: 'Datos y Estadísticas' },
    process:    { en: 'Step by Step',   es: 'Paso a Paso' },
    concept:    { en: 'Concept Map',    es: 'Mapa Conceptual' },
};

// ── Metric card ───────────────────────────────────────────────────────────
function MetricCard({ dp, palette, index }) {
    return (
        <div style={{
            background: `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`,
            borderRadius: '16px',
            padding: '1.5rem 1.25rem',
            textAlign: 'center',
            boxShadow: `0 6px 20px ${palette.primary}44`,
            animation: `infUp 0.45s ease forwards ${index * 0.1}s`,
            opacity: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
        }}>
            <div style={{
                fontSize: '2.2rem', fontWeight: 900, color: '#fff',
                lineHeight: 1, letterSpacing: '-1.5px',
            }}>
                {dp.value}
                {dp.unit && (
                    <span style={{ fontSize: '1rem', fontWeight: 600, opacity: 0.8, marginLeft: '2px' }}>
                        {dp.unit}
                    </span>
                )}
            </div>
            <div style={{
                fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.75)',
                textTransform: 'uppercase', letterSpacing: '1.2px',
            }}>
                {dp.label}
            </div>
        </div>
    );
}

// ── Section card ──────────────────────────────────────────────────────────
function SectionCard({ section, palette, index, total, layoutType }) {
    const iconHint = section.icon_hint || ICON_CYCLE[index % ICON_CYCLE.length];
    const isFlow   = layoutType === 'flow' || layoutType === 'process';

    return (
        <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: `1px solid ${palette.primary}18`,
            boxShadow: `0 2px 16px rgba(0,0,0,0.07)`,
            overflow: 'hidden',
            animation: `infUp 0.45s ease forwards ${0.1 + index * 0.09}s`,
            opacity: 0,
            display: 'flex', flexDirection: 'column',
        }}>
            {/* Colored header strip */}
            <div style={{
                background: `linear-gradient(90deg, ${palette.primary}f2, ${palette.secondary}cc)`,
                padding: '0.85rem 1.25rem',
                display: 'flex', alignItems: 'center', gap: '0.65rem',
            }}>
                {/* Icon bubble */}
                <div style={{
                    width: 32, height: 32, borderRadius: '10px',
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <SvgIcon hint={iconHint} size={16} color="#fff" strokeWidth={2.2} />
                </div>

                <span style={{
                    fontSize: '0.78rem', fontWeight: 800,
                    color: '#fff', letterSpacing: '0.8px',
                    textTransform: 'uppercase', flex: 1,
                }}>
                    {section.heading}
                </span>

                {/* Step badge for flow/process */}
                {isFlow && (
                    <span style={{
                        fontSize: '0.65rem', fontWeight: 800,
                        color: 'rgba(255,255,255,0.85)',
                        background: 'rgba(255,255,255,0.18)',
                        padding: '2px 8px', borderRadius: '12px',
                        letterSpacing: '0.5px',
                    }}>
                        {index + 1}/{total}
                    </span>
                )}
            </div>

            {/* Body */}
            <div style={{ padding: '1.1rem 1.25rem', flex: 1 }}>
                <p style={{
                    margin: 0,
                    fontSize: '0.9rem',
                    lineHeight: 1.7,
                    color: '#334155',
                    fontWeight: 400,
                }}>
                    {/* Highlight keyword inline */}
                    {section.highlight && section.body?.includes(section.highlight)
                        ? section.body.split(section.highlight).map((part, i, arr) => (
                            <React.Fragment key={i}>
                                {part}
                                {i < arr.length - 1 && (
                                    <mark style={{
                                        background: `${palette.primary}20`,
                                        color: palette.accent,
                                        fontWeight: 700,
                                        borderRadius: '3px',
                                        padding: '0 2px',
                                    }}>
                                        {section.highlight}
                                    </mark>
                                )}
                            </React.Fragment>
                        ))
                        : section.body
                    }
                </p>

                {/* Highlight pill (if not found inline) */}
                {section.highlight && section.body && !section.body.includes(section.highlight) && (
                    <div style={{
                        marginTop: '0.75rem',
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.3rem 0.75rem',
                        background: `${palette.primary}12`,
                        border: `1px solid ${palette.primary}30`,
                        borderRadius: '20px',
                        fontSize: '0.75rem', fontWeight: 700,
                        color: palette.primary,
                    }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: palette.primary }} />
                        {section.highlight}
                    </div>
                )}
            </div>

            {/* Flow connector arrow */}
            {isFlow && index < total - 1 && (
                <div style={{
                    textAlign: 'center', padding: '0 0 0.5rem',
                    color: palette.secondary, fontSize: '1.1rem', opacity: 0.6,
                }}>
                    ↓
                </div>
            )}
        </div>
    );
}

// ── Key term pill ─────────────────────────────────────────────────────────
function TermPill({ term, palette, index }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.4rem 0.9rem',
            background: `${palette.primary}0e`,
            border: `1px solid ${palette.primary}2a`,
            borderRadius: '20px',
            fontSize: '0.8rem', fontWeight: 600,
            color: palette.accent,
            animation: `infUp 0.4s ease forwards ${0.35 + index * 0.05}s`,
            opacity: 0,
        }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: palette.primary, flexShrink: 0 }} />
            {term}
        </span>
    );
}

// ── Main component ────────────────────────────────────────────────────────
export default function InfographicView({ conceptId, language, accent }) {
    const { t } = useTranslation();
    const [data, setData]           = useState(null);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgError, setImgError]   = useState(false);

    const generate = useCallback(async () => {
        setLoading(true);
        setError(null);
        setImgLoaded(false);
        setImgError(false);
        try {
            const { supabase } = await import('../lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch('http://127.0.0.1:8001/api/infographic/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ concept_id: conceptId, language }),
            });

            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const result = await res.json();
            setData(result);
        } catch (err) {
            console.error('[InfographicView]', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [conceptId, language]);

    useEffect(() => { generate(); }, [conceptId]);

    // ── Loading ───────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div style={centerFlex}>
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem',
                    padding: '3rem 2.5rem',
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${accent}22`,
                    borderRadius: '20px',
                    maxWidth: '320px', textAlign: 'center',
                }}>
                    <div style={{ position: 'relative', width: 56, height: 56 }}>
                        <div style={{
                            position: 'absolute', inset: 0,
                            border: `3px solid ${accent}22`,
                            borderTop: `3px solid ${accent}`,
                            borderRadius: '50%',
                            animation: 'infSpin 1s linear infinite',
                        }} />
                        <div style={{
                            position: 'absolute', inset: 8,
                            border: `2px solid ${accent}15`,
                            borderBottom: `2px solid ${accent}88`,
                            borderRadius: '50%',
                            animation: 'infSpin 1.5s linear infinite reverse',
                        }} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                            {t('infographicGenerating')}
                        </p>
                        <p style={{ margin: '0.4rem 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                            {t('infographicGeneratingDesc')}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ── Error ─────────────────────────────────────────────────────────────
    if (error || !data) {
        return (
            <div style={centerFlex}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: '#ef4444', textAlign: 'center' }}>
                    <AlertCircle size={36} />
                    <p style={{ margin: 0, fontSize: '0.9rem', maxWidth: '260px', lineHeight: 1.5 }}>
                        {error || 'No se recibieron datos'}
                    </p>
                    <button onClick={generate} style={{
                        padding: '0.5rem 1.5rem', borderRadius: '8px',
                        border: `1px solid ${accent}`, color: accent,
                        background: 'transparent', cursor: 'pointer', fontSize: '0.85rem',
                        fontFamily: 'inherit',
                    }}>
                        {t('infographicRetry')}
                    </button>
                </div>
            </div>
        );
    }

    const palette      = data.palette || DEFAULT_PALETTE;
    const sections     = data.sections || [];
    const dataPoints   = data.data_points || [];
    const keyTerms     = data.key_terms || [];
    const layoutType   = data.layout_type || 'concept';
    const lang         = language || 'es';
    const layoutLabel  = LAYOUT_LABELS[layoutType]?.[lang] || layoutType;
    const isComparison = layoutType === 'comparison';
    const useGrid      = sections.length >= 3 && !isComparison && layoutType !== 'flow' && layoutType !== 'process';

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div style={{ height: '100%', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${palette.primary}44 transparent` }}>
            <div style={{
                margin: '0 auto',
                maxWidth: '880px',
                background: '#f8fafc',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
                fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
            }}>

                {/* ── HEADER ───────────────────────────────────────────── */}
                <div style={{
                    background: `linear-gradient(135deg, ${palette.primary} 0%, ${palette.accent} 100%)`,
                    padding: '2.25rem 2.5rem 2rem',
                    position: 'relative', overflow: 'hidden',
                }}>
                    {/* Decorative geometry */}
                    <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: -30, right: 80, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', top: 20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        {/* Layout type badge */}
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                            background: 'rgba(255,255,255,0.15)',
                            borderRadius: '20px', padding: '0.3rem 0.9rem',
                            marginBottom: '1rem',
                            fontSize: '0.65rem', fontWeight: 700,
                            color: 'rgba(255,255,255,0.9)',
                            textTransform: 'uppercase', letterSpacing: '1.5px',
                        }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.7)' }} />
                            {layoutLabel}
                        </div>

                        {/* Title */}
                        <h1 style={{
                            margin: 0,
                            fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
                            fontWeight: 900,
                            color: '#ffffff',
                            lineHeight: 1.15,
                            letterSpacing: '-0.5px',
                        }}>
                            {data.title}
                        </h1>

                        {/* Subtitle */}
                        {data.subtitle && (
                            <p style={{
                                margin: '0.85rem 0 0',
                                fontSize: '1rem',
                                color: 'rgba(255,255,255,0.78)',
                                lineHeight: 1.6,
                                maxWidth: '580px',
                                fontWeight: 400,
                            }}>
                                {data.subtitle}
                            </p>
                        )}
                    </div>
                </div>

                {/* ── BACKGROUND IMAGE STRIP ────────────────────────────── */}
                {data.image_url && !imgError && (
                    <div style={{
                        height: imgLoaded ? '200px' : '0',
                        overflow: 'hidden',
                        transition: 'height 0.5s ease',
                        position: 'relative',
                        background: palette.bg_light,
                    }}>
                        <img
                            src={data.image_url}
                            alt=""
                            aria-hidden="true"
                            onLoad={() => setImgLoaded(true)}
                            onError={() => setImgError(true)}
                            style={{
                                width: '100%', height: '100%',
                                objectFit: 'cover', objectPosition: 'center',
                                opacity: 0.45,
                            }}
                        />
                        {/* Fade to body bg */}
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            height: '90px',
                            background: 'linear-gradient(to bottom, transparent, #f8fafc)',
                        }} />
                    </div>
                )}

                {/* ── BODY ─────────────────────────────────────────────── */}
                <div style={{ padding: '2rem 2.5rem 2.5rem', background: '#f8fafc' }}>

                    {/* Data metrics row */}
                    {dataPoints.length > 0 && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${Math.min(dataPoints.length, 4)}, 1fr)`,
                            gap: '1rem',
                            marginBottom: '2rem',
                        }}>
                            {dataPoints.map((dp, i) => (
                                <MetricCard key={i} dp={dp} palette={palette} index={i} />
                            ))}
                        </div>
                    )}

                    {/* Section divider label */}
                    {sections.length > 0 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            marginBottom: '1.25rem',
                        }}>
                            <div style={{ flex: 1, height: '1px', background: `${palette.primary}20` }} />
                            <span style={{
                                fontSize: '0.65rem', fontWeight: 800,
                                color: palette.primary, textTransform: 'uppercase',
                                letterSpacing: '2px', opacity: 0.7,
                            }}>
                                {sections.length} {lang === 'es' ? 'secciones' : 'sections'}
                            </span>
                            <div style={{ flex: 1, height: '1px', background: `${palette.primary}20` }} />
                        </div>
                    )}

                    {/* Sections grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isComparison
                            ? '1fr 1fr'
                            : useGrid
                                ? 'repeat(2, 1fr)'
                                : '1fr',
                        gap: '1rem',
                        marginBottom: keyTerms.length > 0 || data.takeaway ? '2rem' : 0,
                    }}>
                        {sections.map((s, i) => (
                            <SectionCard
                                key={i}
                                section={s}
                                palette={palette}
                                index={i}
                                total={sections.length}
                                layoutType={layoutType}
                            />
                        ))}
                    </div>

                    {/* Key terms */}
                    {keyTerms.length > 0 && (
                        <div style={{ marginBottom: data.takeaway ? '1.75rem' : 0 }}>
                            <p style={{
                                margin: '0 0 0.75rem',
                                fontSize: '0.65rem', fontWeight: 800,
                                textTransform: 'uppercase', letterSpacing: '1.5px',
                                color: '#94a3b8',
                            }}>
                                {t('infographicKeyTerms')}
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {keyTerms.map((term, i) => (
                                    <TermPill key={i} term={term} palette={palette} index={i} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Takeaway callout */}
                    {data.takeaway && (
                        <div style={{
                            display: 'flex', alignItems: 'flex-start', gap: '1rem',
                            padding: '1.25rem 1.5rem',
                            background: '#ffffff',
                            border: `1px solid ${palette.primary}20`,
                            borderLeft: `4px solid ${palette.primary}`,
                            borderRadius: '0 14px 14px 0',
                            boxShadow: `0 2px 12px rgba(0,0,0,0.05)`,
                        }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: '10px',
                                background: `${palette.primary}15`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <span style={{ fontSize: '1.1rem' }}>💡</span>
                            </div>
                            <div>
                                <p style={{
                                    margin: '0 0 0.2rem',
                                    fontSize: '0.65rem', fontWeight: 800,
                                    textTransform: 'uppercase', letterSpacing: '1.5px',
                                    color: palette.primary, opacity: 0.8,
                                }}>
                                    {lang === 'es' ? 'Conclusión clave' : 'Key takeaway'}
                                </p>
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.92rem', fontWeight: 500,
                                    color: palette.accent, lineHeight: 1.6,
                                    fontStyle: 'italic',
                                }}>
                                    {data.takeaway}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── FOOTER ───────────────────────────────────────────── */}
                <div style={{
                    padding: '0.9rem 2.5rem',
                    background: '#ffffff',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
                        }} />
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>
                            {t('infographicFooter')}
                        </span>
                    </div>
                    <button
                        onClick={generate}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            background: 'transparent',
                            border: `1px solid ${palette.primary}33`,
                            borderRadius: '8px', padding: '0.35rem 0.9rem',
                            color: palette.primary, cursor: 'pointer',
                            fontSize: '0.75rem', fontWeight: 600,
                            fontFamily: 'inherit',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = `${palette.primary}0e`}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <RefreshCw size={12} />
                        {t('infographicRegenerate')}
                    </button>
                </div>
            </div>

            {/* Keyframes */}
            <style>{`
                @keyframes infUp {
                    from { opacity: 0; transform: translateY(14px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes infSpin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

const centerFlex = {
    height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
};
