/**
 * ConceptMiniature.jsx
 *
 * Self-contained R3F canvas that renders a floating, animated 3D representation
 * of a Knowledge Object — used as the right-panel visual anchor in StudyToolkitView.
 *
 * Props:
 *   concept  { label, anchor_id, feynman_summary }
 *   theme    'neon_dev' | 'silicon_valley'
 */
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Environment } from '@react-three/drei';
import * as THREE from 'three';

/* ── colour palette ─────────────────────────────────────────────────────── */
const THEMES = {
    neon_dev: {
        core:    '#c026d3',
        wire:    '#7c3aed',
        glow:    '#a78bfa',
        ring:    '#d946ef',
        fog:     '#0a0014',
    },
    silicon_valley: {
        core:    '#2563eb',
        wire:    '#1d4ed8',
        glow:    '#60a5fa',
        ring:    '#3b82f6',
        fog:     '#000d1a',
    },
};

/* ── orbit particles ────────────────────────────────────────────────────── */
function OrbitParticles({ count = 12, radius = 2.2, color }) {
    const group = useRef();
    const offsets = useMemo(
        () => Array.from({ length: count }, (_, i) => (i / count) * Math.PI * 2),
        [count]
    );

    useFrame(({ clock }) => {
        if (!group.current) return;
        const t = clock.getElapsedTime();
        group.current.children.forEach((child, i) => {
            const angle = offsets[i] + t * 0.4;
            child.position.x = Math.cos(angle) * radius;
            child.position.z = Math.sin(angle) * radius;
            child.position.y = Math.sin(t * 0.6 + offsets[i] * 2) * 0.4;
        });
    });

    return (
        <group ref={group}>
            {offsets.map((_, i) => (
                <mesh key={i}>
                    <sphereGeometry args={[0.045, 8, 8]} />
                    <meshStandardMaterial
                        color={color}
                        emissive={color}
                        emissiveIntensity={1.4}
                    />
                </mesh>
            ))}
        </group>
    );
}

/* ── outer wireframe ring ───────────────────────────────────────────────── */
function SpinningRing({ color }) {
    const ref = useRef();
    useFrame(({ clock }) => {
        if (!ref.current) return;
        const t = clock.getElapsedTime();
        ref.current.rotation.x = t * 0.3;
        ref.current.rotation.z = t * 0.2;
    });
    return (
        <mesh ref={ref}>
            <torusGeometry args={[1.9, 0.012, 16, 80]} />
            <meshBasicMaterial color={color} transparent opacity={0.55} />
        </mesh>
    );
}

/* ── second counter-rotating ring ──────────────────────────────────────── */
function SpinningRing2({ color }) {
    const ref = useRef();
    useFrame(({ clock }) => {
        if (!ref.current) return;
        const t = clock.getElapsedTime();
        ref.current.rotation.y = t * 0.25;
        ref.current.rotation.x = Math.PI / 4 + t * 0.18;
    });
    return (
        <mesh ref={ref}>
            <torusGeometry args={[2.3, 0.008, 16, 80]} />
            <meshBasicMaterial color={color} transparent opacity={0.3} />
        </mesh>
    );
}

/* ── core holographic object ────────────────────────────────────────────── */
function CoreObject({ color, glowColor, label }) {
    const solidRef = useRef();
    const wireRef  = useRef();

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        if (solidRef.current) {
            solidRef.current.rotation.y = t * 0.55;
            solidRef.current.rotation.x = Math.sin(t * 0.3) * 0.4;
            solidRef.current.position.y = Math.sin(t * 0.8) * 0.18;
        }
        if (wireRef.current) {
            wireRef.current.rotation.y  = -t * 0.3;
            wireRef.current.rotation.z  = t * 0.2;
            wireRef.current.position.y  = Math.sin(t * 0.8) * 0.18;
        }
    });

    return (
        <>
            {/* Solid icosahedron */}
            <mesh ref={solidRef}>
                <icosahedronGeometry args={[1, 1]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.55}
                    roughness={0.15}
                    metalness={0.7}
                    transparent
                    opacity={0.88}
                />
            </mesh>

            {/* Wireframe overlay — slightly larger */}
            <mesh ref={wireRef}>
                <icosahedronGeometry args={[1.14, 1]} />
                <meshBasicMaterial
                    color={glowColor}
                    wireframe
                    transparent
                    opacity={0.22}
                />
            </mesh>

            {/* Floating label */}
            <Html position={[0, 2.1, 0]} center style={{ pointerEvents: 'none', userSelect: 'none' }}>
                <div style={{
                    background: 'rgba(0,0,0,0.7)',
                    border: `1px solid ${color}88`,
                    borderRadius: '8px',
                    padding: '5px 12px',
                    color: '#fff',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    letterSpacing: '1.4px',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    boxShadow: `0 0 16px ${color}55`,
                }}>
                    {label}
                </div>
            </Html>

            {/* Inner point glow */}
            <pointLight color={glowColor} intensity={3.5} distance={4} />
        </>
    );
}

/* ── scene ──────────────────────────────────────────────────────────────── */
function MiniatureScene({ concept, palette }) {
    return (
        <>
            <ambientLight intensity={0.25} />
            <pointLight position={[4, 4, 4]}   intensity={1.2} color={palette.glow} />
            <pointLight position={[-4, -3, -3]} intensity={0.6} color={palette.core} />

            <CoreObject
                color={palette.core}
                glowColor={palette.glow}
                label={concept.label}
            />
            <SpinningRing  color={palette.wire} />
            <SpinningRing2 color={palette.ring} />
            <OrbitParticles color={palette.glow} />
        </>
    );
}

/* ── exported component ─────────────────────────────────────────────────── */
export default function ConceptMiniature({ concept, theme = 'neon_dev' }) {
    const palette = THEMES[theme] ?? THEMES.neon_dev;

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Canvas
                camera={{ fov: 50, position: [0, 0, 6] }}
                gl={{ antialias: true, alpha: true }}
                style={{ background: 'transparent' }}
            >
                <fog attach="fog" args={[palette.fog, 8, 22]} />
                <MiniatureScene concept={concept} palette={palette} />
            </Canvas>
        </div>
    );
}
