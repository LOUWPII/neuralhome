import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { getAnchorDisplayPosition } from './roomAnchors';

export default function KnowledgeObject({ concept, index = 0, theme = 'neon_dev' }) {
    const meshRef = useRef();
    const [hovered, setHovered] = useState(false);

    // Theme-based color palettes
    const colors = theme === 'silicon_valley'
        ? { base: '#3b82f6', hover: '#60a5fa', emissive: '#1d4ed8', outline: '#93c5fd' }
        : { base: '#c026d3', hover: '#e879f9', emissive: '#7c3aed', outline: '#d946ef' };

    // Resolve position from anchor ID, fall back to scatter if anchor not found
    const anchorId = concept.anchor_id;
    const position = getAnchorDisplayPosition(theme, anchorId, index);

    // Gentle float animation — each concept bobs at a unique rate
    useFrame((state) => {
        if (!meshRef.current) return;
        const t = state.clock.getElapsedTime();
        meshRef.current.position.y = position[1] + Math.sin(t * 1.2 + index * 1.3) * 0.14;
        if (concept.model_type !== 'sphere') {
            meshRef.current.rotation.y += 0.007;
        }
    });

    const color = hovered ? colors.hover : colors.base;

    return (
        <group position={position}>
            {/* Invisible Hitbox for Interactions */}
            <mesh
                ref={meshRef}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
                visible={false}
            >
                <sphereGeometry args={[1.5, 16, 16]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>

            {/* Subtle glow indicating active concept */}
            <pointLight intensity={hovered ? 2 : 0.8} distance={hovered ? 6 : 4} color={hovered ? colors.hover : colors.emissive} />
            
            {/* Pulsing ring indicator */}
            <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.2, 0]}>
                <ringGeometry args={[0.4, 0.45, 32]} />
                <meshBasicMaterial color={colors.emissive} transparent opacity={hovered ? 0.8 : 0.3} />
            </mesh>

            {/* Label — Always visible hovering over the physical object */}
            <Html position={[0, 0, 0]} center style={{ pointerEvents: 'none', userSelect: 'none' }}>
                <div style={{
                    background: hovered
                        ? (theme === 'silicon_valley' ? 'rgba(10,22,48,0.97)' : 'rgba(5,0,16,0.97)')
                        : 'rgba(0,0,0,0.45)',
                    border: `1px solid ${hovered ? colors.outline : 'rgba(255,255,255,0.12)'}`,
                    padding: hovered ? '7px 13px' : '3px 9px',
                    borderRadius: '7px',
                    color: hovered ? 'white' : 'rgba(255,255,255,0.5)',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontSize: hovered ? '0.78rem' : '0.68rem',
                    whiteSpace: 'nowrap',
                    textTransform: 'uppercase',
                    letterSpacing: '1.2px',
                    boxShadow: hovered ? `0 0 18px ${colors.outline}66` : 'none',
                    transition: 'all 0.2s ease',
                }}>
                    {concept.label}
                </div>
            </Html>

            {/* Feynman Summary Card — Appears on hover */}
            {hovered && concept.feynman_summary && (
                <Html position={[0, 1.2, 0]} center style={{ pointerEvents: 'none', width: '250px', zIndex: 100 }}>
                    <div style={{
                        background: theme === 'silicon_valley' ? 'rgba(10,22,48,0.98)' : 'rgba(5,0,16,0.98)',
                        border: `1px solid ${colors.outline}`,
                        padding: '12px 14px',
                        borderRadius: '10px',
                        color: 'rgba(255,255,255,0.9)',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.75rem',
                        lineHeight: '1.6',
                        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${colors.outline}44`,
                        textAlign: 'center',
                        animation: 'fadeIn 0.2s ease-out',
                    }}>
                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: colors.hover, marginBottom: '6px', fontWeight: 'bold' }}>
                            Feynman Summary
                        </div>
                        {concept.feynman_summary}
                    </div>
                </Html>
            )}
        </group>
    );
}
