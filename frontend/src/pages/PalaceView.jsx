import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { RoomEnvironment } from '../3d/RoomEnvironment';
import KnowledgeObject from '../3d/KnowledgeObject';
import { FirstPersonControls } from '../3d/FirstPersonControls';
import { ArrowLeft } from 'lucide-react';

export default function PalaceView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [palace, setPalace] = useState(null);
    const [concepts, setConcepts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRearranging, setIsRearranging] = useState(false);
    const [selectedForSwap, setSelectedForSwap] = useState(null);
    const [hoveredConceptId, setHoveredConceptId] = useState(null);

    useEffect(() => {
        async function loadPalaceData() {
            try {
                const { data: palaceData, error: palaceError } = await supabase
                    .from('palaces')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (palaceError) throw palaceError;

                if (palaceData) {
                    setPalace(palaceData);
                    const { data: conceptData, error: conceptError } = await supabase
                        .from('concepts')
                        .select('*')
                        .eq('palace_id', id);

                    if (conceptError) throw conceptError;
                    if (conceptData) setConcepts(conceptData);
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

    const handleSelectConcept = useCallback(async (concept) => {
        document.body.style.cursor = 'auto';
        
        if (!isRearranging) {
            navigate(`/study/${id}/${concept.id}`);
            return;
        }

        // --- Rearrange Mode Logic ---
        if (!selectedForSwap) {
            setSelectedForSwap(concept);
        } else {
            // Do the swap!
            if (selectedForSwap.id === concept.id) {
                setSelectedForSwap(null); // Deselect if same
                return;
            }

            const c1 = selectedForSwap;
            const c2 = concept;

            // Optimistic UI update
            setConcepts(prev => prev.map(c => {
                if (c.id === c1.id) return { ...c, position_x: c2.position_x, position_y: c2.position_y, position_z: c2.position_z, anchor_id: c2.anchor_id, glb_model: c2.glb_model, hex_color: c2.hex_color, material_props: c2.material_props };
                if (c.id === c2.id) return { ...c, position_x: c1.position_x, position_y: c1.position_y, position_z: c1.position_z, anchor_id: c1.anchor_id, glb_model: c1.glb_model, hex_color: c1.hex_color, material_props: c1.material_props };
                return c;
            }));

            setSelectedForSwap(null);

            // Supabase DB update
            try {
                // Update C1 with C2's physical properties
                await supabase.from('concepts').update({
                    position_x: c2.position_x, position_y: c2.position_y, position_z: c2.position_z,
                    anchor_id: c2.anchor_id, glb_model: c2.glb_model, hex_color: c2.hex_color, material_props: c2.material_props
                }).eq('id', c1.id);

                // Update C2 with C1's physical properties
                await supabase.from('concepts').update({
                    position_x: c1.position_x, position_y: c1.position_y, position_z: c1.position_z,
                    anchor_id: c1.anchor_id, glb_model: c1.glb_model, hex_color: c1.hex_color, material_props: c1.material_props
                }).eq('id', c2.id);
            } catch (err) {
                console.error("Failed to swap:", err);
                // In a real app, we'd revert the optimistic update here
            }
        }
    }, [navigate, id, isRearranging, selectedForSwap]);

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '100vh', background: 'var(--bg-dark)' }}>
                <h2 className="heading-glow animate-float">Initializing Spatial Interface...</h2>
            </div>
        );
    }

    if (!palace) {
        return (
            <div className="flex-center" style={{ height: '100vh', flexDirection: 'column', gap: '1rem' }}>
                <h2 style={{ color: '#ef4444' }}>Palace Not Found</h2>
                <button className="btn-outline" onClick={() => navigate('/dashboard')}>Return to Library</button>
            </div>
        );
    }

    // Theme comes from the description field
    const theme = palace.description || 'neon_dev';

    // Room dimensions: AI-detected via vision (saved in dynamic_config)
    // or sensible defaults. The vision_service already clamps these to 3-15m.
    const rawDims = palace.dynamic_config || {};
    const roomDimensions = {
        width:      Math.max(3, Math.min(parseFloat(rawDims.width)  || 5, 15)),
        height:     Math.max(2.2, Math.min(parseFloat(rawDims.height) || 2.5, 4)),
        depth:      Math.max(3, Math.min(parseFloat(rawDims.depth)  || 5, 15)),
        // Aesthetics from vision AI — pass through as-is (already validated on backend)
        aesthetics: rawDims.aesthetics || {},
    };
    const roomHalf = Math.max(roomDimensions.width, roomDimensions.depth) / 2;

    // Enforce 1 concept per anchor — keep the first one assigned to each anchor_id
    const seenAnchors = new Set();
    const uniqueConcepts = concepts.filter(c => {
        const aid = c.anchor_id || c.id;
        if (seenAnchors.has(aid)) return false;
        seenAnchors.add(aid);
        return true;
    });

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#000000' }}>

            {/* HUD overlay layer */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '1.5rem', zIndex: 10, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
                <div>
                    <button
                        className="btn-outline"
                        style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '0.5rem', pointerEvents: 'auto', background: 'rgba(5,0,11,0.5)', backdropFilter: 'blur(5px)' }}
                        onClick={() => navigate('/dashboard')}
                    >
                        <ArrowLeft size={16} /> Library
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
                        {isRearranging 
                            ? (selectedForSwap ? "Select target object to swap with" : "Select an object to move") 
                            : "Click an object to enter Study Mode · ESC to pause"}
                    </p>
                    <button
                        className="btn-outline"
                        style={{ 
                            marginTop: '0.5rem', 
                            padding: '4px 12px', 
                            fontSize: '0.75rem', 
                            pointerEvents: 'auto',
                            borderColor: isRearranging ? '#22d3ee' : '',
                            color: isRearranging ? '#22d3ee' : ''
                        }}
                        onClick={() => {
                            setIsRearranging(!isRearranging);
                            setSelectedForSwap(null);
                        }}
                    >
                        {isRearranging ? "Cancel Rearrange" : "Rearrange Objects"}
                    </button>
                </div>
            </div>

            {/* R3F Canvas — fills the entire viewport behind the HUD */}
            <Canvas
                style={{ position: 'absolute', inset: 0 }}
                camera={{ fov: 75, near: 0.1, far: 200, position: [0, 1.8, roomHalf - 0.2] }}
                shadows
            >
                <Physics gravity={[0, -9.8, 0]}>
                    <RoomEnvironment 
                        theme={theme} 
                        concepts={uniqueConcepts} 
                        roomDimensions={roomDimensions} 
                        hoveredConceptId={hoveredConceptId}
                        selectedForSwapId={selectedForSwap?.id}
                    />
                    {uniqueConcepts.map((concept, index) => (
                        <KnowledgeObject
                            key={concept.id}
                            concept={concept}
                            index={index}
                            theme={theme}
                            onSelect={handleSelectConcept}
                            onHover={(isHovered) => setHoveredConceptId(isHovered ? concept.id : null)}
                            isRearranging={isRearranging}
                            isSelectedForSwap={selectedForSwap?.id === concept.id}
                        />
                    ))}
                    <FirstPersonControls roomHalf={roomHalf} />
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

