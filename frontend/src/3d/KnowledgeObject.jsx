import React, { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { getAnchorDisplayPosition } from './roomAnchors';

// Realistic top-of-furniture heights in meters (matches TYPE_DEFAULTS in RoomEnvironment)
const FURNITURE_TOP_H = {
    bed:       0.55,
    desk:      0.75,
    chair:     0.9,
    bookshelf: 1.8,
    lamp:      1.5,
    plant:     0.8,
    window:    1.4,
};

export default function KnowledgeObject({ concept, index = 0, theme = 'neon_dev', onSelect, onHover, isRearranging, isSelectedForSwap }) {
    const [hovered, setHovered] = useState(false);

    // Theme-based color palettes
    const colors = { hover: '#e879f9', emissive: '#7c3aed', outline: '#d946ef' };

    // Resolve position — for dynamic rooms use real-meter coords from DB
    let position;
    if (theme === 'dynamic') {
        const px = concept.position_x || 0;
        const pz = concept.position_z || 0;

        // Extract type from anchor_id: "dynamic_bed_0" → "bed"
        const anchorParts = concept.anchor_id?.split('_') || [];
        const furnitureType = anchorParts.length >= 2 ? anchorParts[1] : 'desk';

        // Use the vision-estimated height if stored, otherwise use our reference table
        const visionH = concept.material_props?.dimensions?.height;
        const furnitureH = visionH || FURNITURE_TOP_H[furnitureType] || 0.9;

        // Place label at the top of the furniture + a small gap
        position = [px, furnitureH + 0.15, pz];
    } else {
        position = getAnchorDisplayPosition(theme, concept.anchor_id, index);
    }

    const outlineColor = isSelectedForSwap ? '#22d3ee' : (isRearranging ? '#f59e0b' : colors.outline);

    // Hitbox half-sizes based on furniture type
    const anchorParts = concept.anchor_id?.split('_') || [];
    const furnitureType = anchorParts.length >= 2 ? anchorParts[1] : 'desk';
    const hitW = concept.material_props?.dimensions?.width  || 1.0;
    const hitD = concept.material_props?.dimensions?.depth  || 1.0;
    const hitH = concept.material_props?.dimensions?.height || 0.9;

    return (
        <group position={position}>
            {/*
                Invisible hitbox box that matches the furniture footprint exactly.
                Positioned so it encloses the furniture (centered at furniture midpoint).
            */}
            <mesh
                position={[0, -(hitH / 2) - 0.15, 0]}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    setHovered(true);
                    document.body.style.cursor = 'pointer';
                    onHover?.(true);
                }}
                onPointerOut={(e) => {
                    e.stopPropagation();
                    setHovered(false);
                    document.body.style.cursor = 'auto';
                    onHover?.(false);
                }}
                onClick={(e) => { e.stopPropagation(); onSelect?.(concept); }}
                visible={false}
            >
                <boxGeometry args={[hitW + 0.2, hitH + 0.3, hitD + 0.2]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>

            {/* Concept label — sits right at position (top of furniture + gap) */}
            <Html position={[0, 0, 0]} center style={{ pointerEvents: 'none', userSelect: 'none' }}>
                <div style={{
                    background: hovered || isSelectedForSwap
                        ? (isSelectedForSwap ? 'rgba(34,211,238,0.95)' : 'rgba(139,0,180,0.92)')
                        : (isRearranging ? 'rgba(245,158,11,0.7)' : 'rgba(0,0,0,0.65)'),
                    border: `1.5px solid ${hovered || isSelectedForSwap ? '#fff' : 'rgba(255,255,255,0.2)'}`,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    color: 'white',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontSize: '0.68rem',
                    whiteSpace: 'nowrap',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    boxShadow: hovered || isSelectedForSwap ? `0 0 14px ${outlineColor}` : 'none',
                    transition: 'all 0.15s ease',
                }}>
                    {concept.label}
                </div>
            </Html>

            {/* Concept Summary Card — Appears on hover, just above the label */}
            {hovered && concept.context && (
                <Html position={[0, -height + 5, 0]} center style={{ pointerEvents: 'none', width: '260px', zIndex: 100 }}>
                    <div style={{
                        background: 'rgba(5,0,16,0.97)',
                        border: `1px solid ${colors.outline}`,
                        padding: '10px 14px',
                        borderRadius: '10px',
                        color: 'rgba(255,255,255,0.93)',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.72rem',
                        lineHeight: '1.55',
                        boxShadow: `0 6px 24px rgba(0,0,0,0.5), 0 0 20px ${colors.outline}44`,
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: colors.hover, marginBottom: '8px', fontWeight: 'bold', letterSpacing: '1px' }}>
                            Resumen
                        </div>
                        {concept.context.length > 180
                            ? concept.context.slice(0, 180).trimEnd() + '…'
                            : concept.context}
                    </div>
                </Html>
            )}
        </group>
    );
}
