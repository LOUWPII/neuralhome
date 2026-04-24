import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { getAnchorDisplayPosition } from './roomAnchors';

export default function KnowledgeObject({ concept, index = 0, theme = 'neon_dev', onSelect }) {
    const meshRef = useRef();
    const [hovered, setHovered] = useState(false);

    // Theme-based color palettes
    const colors = theme === 'silicon_valley'
        ? { base: '#3b82f6', hover: '#60a5fa', emissive: '#1d4ed8', outline: '#93c5fd' }
        : { base: '#c026d3', hover: '#e879f9', emissive: '#7c3aed', outline: '#d946ef' };

    // Resolve position from anchor ID, fall back to scatter if anchor not found
    const anchorId = concept.anchor_id;
    const position = getAnchorDisplayPosition(theme, anchorId, index);

    // The height from floor to the display offset
    const height = position[1];

    // Gentle float animation — each concept bobs at a unique rate
    useFrame((state) => {
        if (!meshRef.current) return;
        const t = state.clock.getElapsedTime();
        // Only animate the label ring, not the hitbox
        meshRef.current.material.emissiveIntensity = 
            0.3 + Math.sin(t * 1.5 + index * 1.3) * 0.15;
    });

    return (
        <group position={position}>
            {/* 
                INVISIBLE hitbox cylinder stretching from the physical object 
                up to the label. Completely invisible — no wireframe, no material.
                It only serves as a click/hover target.
            */}
            <mesh
                position={[0, -height / 2, 0]}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true);  document.body.style.cursor = 'pointer'; }}
                onPointerOut={(e)  => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
                onClick={(e)      => { e.stopPropagation(); onSelect?.(concept); }}
                visible={false}
            >
                <cylinderGeometry args={[2.5, 2.5, height + 1, 8]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>

            {/* 
                GLOW LIGHT — Only activates on hover.
                Positioned at the physical object (floor level) to illuminate it.
            */}
            <pointLight 
                position={[0, -height + 1, 0]}
                intensity={hovered ? 12 : 0} 
                distance={hovered ? 10 : 0} 
                color={colors.hover} 
            />
            <pointLight 
                position={[0, -height + 3, 2]}
                intensity={hovered ? 8 : 0} 
                distance={hovered ? 8 : 0} 
                color={colors.hover} 
            />

            {/* Ambient indicator light (subtle, always on) */}
            <pointLight 
                position={[0, -height + 2, 0]}
                intensity={0.8} 
                distance={4} 
                color={colors.emissive} 
            />
            
            {/* Pulsing ring on the floor near the object */}
            <mesh ref={meshRef} rotation={[-Math.PI/2, 0, 0]} position={[0, -height + 0.05, 0]}>
                <ringGeometry args={[1.8, 2.0, 32]} />
                <meshStandardMaterial 
                    color={colors.emissive} 
                    emissive={colors.emissive}
                    emissiveIntensity={hovered ? 1.5 : 0.3}
                    transparent 
                    opacity={hovered ? 0.9 : 0.25} 
                />
            </mesh>

            {/* Label — positioned just above the physical object */}
            <Html position={[0, -height + 3.5, 0]} center style={{ pointerEvents: 'none', userSelect: 'none' }}>
                <div style={{
                    background: hovered
                        ? (theme === 'silicon_valley' ? 'rgba(59, 130, 246, 0.95)' : 'rgba(192, 38, 211, 0.95)')
                        : 'rgba(0,0,0,0.6)',
                    border: `1px solid ${hovered ? '#fff' : 'rgba(255,255,255,0.15)'}`,
                    padding: hovered ? '6px 14px' : '4px 8px',
                    borderRadius: '8px',
                    color: 'white',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 800,
                    fontSize: hovered ? '0.8rem' : '0.65rem',
                    whiteSpace: 'nowrap',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    boxShadow: hovered ? `0 0 20px ${colors.outline}` : 'none',
                    transition: 'all 0.2s ease',
                }}>
                    {concept.label}
                </div>
            </Html>

            {/* Feynman Summary Card — Appears on hover, just above the label */}
            {hovered && concept.feynman_summary && (
                <Html position={[0, -height + 5, 0]} center style={{ pointerEvents: 'none', width: '260px', zIndex: 100 }}>
                    <div style={{
                        background: theme === 'silicon_valley' ? 'rgba(10,22,48,0.98)' : 'rgba(5,0,16,0.98)',
                        border: `1px solid ${colors.outline}`,
                        padding: '12px 16px',
                        borderRadius: '10px',
                        color: 'rgba(255,255,255,0.95)',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.75rem',
                        lineHeight: '1.6',
                        boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 25px ${colors.outline}55`,
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: colors.hover, marginBottom: '8px', fontWeight: 'bold', letterSpacing: '1px' }}>
                            Feynman Summary
                        </div>
                        {concept.feynman_summary}
                    </div>
                </Html>
            )}
        </group>
    );
}
