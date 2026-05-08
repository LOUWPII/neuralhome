import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { RoomEnvironment } from '../3d/RoomEnvironment';
import KnowledgeObject from '../3d/KnowledgeObject';
import { FirstPersonControls } from '../3d/FirstPersonControls';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '../contexts/useTranslation';

export default function PalaceView() {
    const { id } = useParams();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [palace, setPalace] = useState(null);
    const [concepts, setConcepts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadPalaceData() {
            try {
                const [palaceResp, conceptsResp] = await Promise.all([
                    supabase.from('palaces').select('*').eq('id', id).single(),
                    supabase.from('concepts').select('*').eq('palace_id', id)
                ]);

                if (palaceResp.error) throw palaceResp.error;
                if (conceptsResp.error) throw conceptsResp.error;

                if (palaceResp.data) {
                    setPalace(palaceResp.data);
                    if (conceptsResp.data) setConcepts(conceptsResp.data);
                }
            } catch (err) {
                console.error("Error loading palace:", err);
                setPalace(null); // Force not found state
            } finally {
                setLoading(false);
            }
        }
        loadPalaceData();
    }, [id]);

    // Navigate to the full split-screen Study Toolkit instead of an inline overlay
    const handleSelectConcept = useCallback((concept) => {
        document.body.style.cursor = 'auto';
        navigate(`/study/${id}/${concept.id}`);
    }, [navigate, id]);

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '100vh', background: 'var(--bg-dark)' }}>
                <h2 className="heading-glow animate-float">{t('initializingSpatial')}</h2>
            </div>
        );
    }

    if (!palace) {
        return (
            <div className="flex-center" style={{ height: '100vh', flexDirection: 'column', gap: '1rem' }}>
                <h2 style={{ color: '#ef4444' }}>{t('palaceNotFound')}</h2>
                <button className="btn-outline" onClick={() => navigate('/dashboard')}>{t('returnToLibrary')}</button>
            </div>
        );
    }

    // The theme is stored in the "description" field as either "neon_dev" or "silicon_valley"
    const theme = palace.description || 'neon_dev';

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>

            {/* HUD overlay layer */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '1.5rem', zIndex: 10, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
                <div>
                    <button
                        className="btn-outline"
                        style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '0.5rem', pointerEvents: 'auto', background: 'rgba(5,0,11,0.5)', backdropFilter: 'blur(5px)' }}
                        onClick={() => navigate('/dashboard')}
                    >
                        <ArrowLeft size={16} /> {t('library')}
                    </button>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <h1 className="heading-glow" style={{ margin: 0, fontSize: '1.5rem', textShadow: '0 0 20px rgba(124, 58, 237, 0.8)' }}>
                        {palace.title}
                    </h1>
                    {palace.subject && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                            {palace.subject}
                        </p>
                    )}
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {t('studyModeHint')}
                    </p>
                </div>
            </div>

            {/* R3F Canvas — pointer-events stay enabled so the user keeps control */}
            <Canvas camera={{ fov: 75, near: 0.1, far: 200, position: [0, 1.8, 8] }} shadows>
                <Physics gravity={[0, -9.8, 0]}>
                    <RoomEnvironment theme={theme} />
                    {concepts.map((concept, index) => (
                        <KnowledgeObject
                            key={concept.id}
                            concept={concept}
                            index={index}
                            theme={theme}
                            onSelect={handleSelectConcept}
                        />
                    ))}
                    <FirstPersonControls />
                </Physics>
            </Canvas>

            {/* Crosshair */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '6px', height: '6px', background: 'rgba(255,255,255,0.7)', borderRadius: '50%',
                pointerEvents: 'none', zIndex: 5, boxShadow: '0 0 4px white'
            }} />
        </div>
    );
}

