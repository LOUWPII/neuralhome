import React, { useRef, Suspense } from 'react';
import * as THREE from 'three';
import { Stars, Html, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { usePlane, useBox, useCylinder } from '@react-three/cannon';
import { ROOM_ANCHORS } from './roomAnchors';

// ─────────────────────────────────────────
// Neon Dev Sub-components
// ─────────────────────────────────────────

/** Central holographic terminal (main_terminal anchor) */
function NeonHoloTerminal({ position }) {
    const glowRef = useRef();
    useFrame((state) => {
        if (glowRef.current) {
            glowRef.current.material.emissiveIntensity =
                0.6 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
        }
    });
    const [x, , z] = position;
    return (
        <group position={[x, 0, z]}>
            {/* Base cylinder */}
            <mesh position={[0, 0.15, 0]}>
                <cylinderGeometry args={[0.8, 1.0, 0.3, 32]} />
                <meshStandardMaterial color="#0a001a" metalness={0.9} roughness={0.1}
                    emissive="#7c3aed" emissiveIntensity={0.3} />
            </mesh>
            {/* Pillar */}
            <mesh position={[0, 0.9, 0]}>
                <cylinderGeometry args={[0.08, 0.08, 1.2, 16]} />
                <meshStandardMaterial color="#1a0040" metalness={0.95} roughness={0.05}
                    emissive="#c026d3" emissiveIntensity={0.5} />
            </mesh>
            {/* Hologram disc */}
            <mesh ref={glowRef} position={[0, 1.7, 0]} rotation={[0, 0, 0]}>
                <cylinderGeometry args={[0.9, 0.9, 0.04, 32]} />
                <meshStandardMaterial color="#c026d3" emissive="#c026d3"
                    emissiveIntensity={0.6} transparent opacity={0.7} />
            </mesh>
            {/* Hologram ring */}
            <mesh position={[0, 1.72, 0]}>
                <torusGeometry args={[0.92, 0.03, 8, 32]} />
                <meshStandardMaterial emissive="#e879f9" emissiveIntensity={2} color="black" />
            </mesh>
            <pointLight position={[0, 2.5, 0]} intensity={2.5} color="#c026d3" distance={8} />
        </group>
    );
}

/** Holographic wall panel (left_panel / right_panel anchors) */
function NeonHoloPanel({ position, color = '#22d3ee', label }) {
    const [x, , z] = position;
    return (
        <group position={[x, 0, z]}>
            {/* Frame */}
            <mesh position={[0, 4, 0]}>
                <boxGeometry args={[3.2, 5.2, 0.08]} />
                <meshStandardMaterial color="#0a001a" metalness={0.9} roughness={0.1}
                    emissive={color} emissiveIntensity={0.15} />
            </mesh>
            {/* Screen surface */}
            <mesh position={[0, 4, 0.05]}>
                <boxGeometry args={[2.8, 4.8, 0.02]} />
                <meshStandardMaterial color={color} emissive={color}
                    emissiveIntensity={0.35} transparent opacity={0.85} />
            </mesh>
            {/* Glowing border */}
            {[[0, 6.5, 0.08], [0, 1.5, 0.08]].map(([bx, by, bz], i) => (
                <mesh key={i} position={[bx, by, bz]}>
                    <boxGeometry args={[3.2, 0.06, 0.02]} />
                    <meshStandardMaterial emissive={color} emissiveIntensity={3} color="black" />
                </mesh>
            ))}
            {/* Floor stand */}
            <mesh position={[0, 0.5, 0]}>
                <boxGeometry args={[0.4, 1, 0.4]} />
                <meshStandardMaterial color="#050015" metalness={0.9} roughness={0.1}
                    emissive={color} emissiveIntensity={0.2} />
            </mesh>
            <pointLight position={[0, 4, 1]} intensity={1.5} color={color} distance={6} />
        </group>
    );
}

/** Server rack (server_rack_a / server_rack_b anchors) */
function NeonServerRack({ position, color = '#c026d3' }) {
    const [x, , z] = position;
    return (
        <group position={[x, 0, z]}>
            {/* Main cabinet */}
            <mesh position={[0, 3, 0]}>
                <boxGeometry args={[1.8, 6, 1.2]} />
                <meshStandardMaterial color="#050015" metalness={0.85} roughness={0.15} />
            </mesh>
            {/* Drive bays */}
            {[1, 2, 3, 4, 5].map((i) => (
                <mesh key={i} position={[0, i, -0.62]}>
                    <boxGeometry args={[1.6, 0.16, 0.04]} />
                    <meshStandardMaterial color="#0a001a" metalness={0.7} roughness={0.3} />
                </mesh>
            ))}
            {/* LED strips on bays */}
            {[1, 2.5, 4].map((y, i) => (
                <mesh key={`led-${i}`} position={[0.6, y, -0.6]}>
                    <boxGeometry args={[0.05, 0.06, 0.06]} />
                    <meshStandardMaterial
                        emissive={i === 0 ? '#22c55e' : i === 1 ? color : '#22d3ee'}
                        emissiveIntensity={3} color="black" />
                </mesh>
            ))}
            {/* Glowing front strip */}
            <mesh position={[0, 3, -0.65]}>
                <boxGeometry args={[1.7, 5.8, 0.02]} />
                <meshStandardMaterial emissive={color} emissiveIntensity={0.1}
                    color="black" transparent opacity={0.4} />
            </mesh>
            <pointLight position={[0, 4, -1.5]} intensity={1} color={color} distance={5} />
        </group>
    );
}

/** Floor zone indicator (floor grid anchors) */
function NeonFloorZone({ position, color = '#7c3aed' }) {
    const [x, , z] = position;
    const ringRef = useRef();
    useFrame((s) => {
        if (ringRef.current) {
            ringRef.current.material.emissiveIntensity = 0.4 + Math.sin(s.clock.elapsedTime * 1.5) * 0.15;
        }
    });
    return (
        <group position={[x, 0.01, z]}>
            <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.2, 0.06, 8, 32]} />
                <meshStandardMaterial emissive={color} emissiveIntensity={0.4} color="black" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[1.15, 32]} />
                <meshStandardMaterial
                    emissive={color} emissiveIntensity={0.08} color="black"
                    transparent opacity={0.3} />
            </mesh>
            <pointLight position={[0, 0.5, 0]} intensity={0.5} color={color} distance={4} />
        </group>
    );
}

// ─────────────────────────────────────────
// Silicon Valley Sub-components
// ─────────────────────────────────────────

/** Main monitor setup (main_monitor anchor) */
function SVMonitorDesk({ position }) {
    const [x, , z] = position;
    return (
        <group position={[x, 0, z]}>
            {/* Desk surface */}
            <mesh position={[0, 1.05, 0]}>
                <boxGeometry args={[5, 0.08, 2]} />
                <meshStandardMaterial color="#dde8f0" metalness={0.3} roughness={0.4} />
            </mesh>
            {/* Desk legs */}
            {[[-2.2, -0.9], [2.2, -0.9], [-2.2, 0.9], [2.2, 0.9]].map(([dx, dz], i) => (
                <mesh key={i} position={[dx, 0.5, dz]}>
                    <boxGeometry args={[0.08, 1, 0.08]} />
                    <meshStandardMaterial color="#b0bdd0" metalness={0.9} roughness={0.1} />
                </mesh>
            ))}
            {/* Monitor (large, ultrawide) */}
            <mesh position={[0, 2.1, -0.75]}>
                <boxGeometry args={[3.6, 1.8, 0.06]} />
                <meshStandardMaterial color="#0a1628" emissive="#1e40af" emissiveIntensity={0.7} />
            </mesh>
            {/* Monitor bezel */}
            <mesh position={[0, 2.1, -0.74]}>
                <boxGeometry args={[3.65, 1.85, 0.04]} />
                <meshStandardMaterial color="#182030" metalness={0.7} roughness={0.2} />
            </mesh>
            {/* Monitor stand */}
            <mesh position={[0, 1.35, -0.72]}>
                <boxGeometry args={[0.1, 0.6, 0.1]} />
                <meshStandardMaterial color="#c0ccd8" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Keyboard */}
            <mesh position={[0, 1.1, 0.1]}>
                <boxGeometry args={[1.8, 0.04, 0.5]} />
                <meshStandardMaterial color="#e8eef8" metalness={0.2} roughness={0.6} />
            </mesh>
            {/* Monitor glow */}
            <pointLight position={[0, 2.1, -0.5]} intensity={2} color="#60a5fa" distance={5} />
        </group>
    );
}

/** Large whiteboard (whiteboard anchor) */
function SVWhiteboard({ position }) {
    const [x, , z] = position;
    return (
        <group position={[x, 0, z]}>
            {/* Board surface */}
            <mesh position={[0, 5, 0.05]}>
                <boxGeometry args={[8, 4, 0.08]} />
                <meshStandardMaterial color="#f0f8ff" metalness={0.1} roughness={0.8} />
            </mesh>
            {/* Board frame */}
            <mesh position={[0, 5, 0]}>
                <boxGeometry args={[8.3, 4.3, 0.06]} />
                <meshStandardMaterial color="#c0ccdd" metalness={0.7} roughness={0.2} />
            </mesh>
            {/* Board legs */}
            {[[-3.8, 0], [3.8, 0]].map(([dx, dz], i) => (
                <mesh key={i} position={[dx, 1.5, dz]}>
                    <boxGeometry args={[0.1, 3, 0.1]} />
                    <meshStandardMaterial color="#b0bbc8" metalness={0.8} roughness={0.2} />
                </mesh>
            ))}
            {/* Drawn lines (decoration) */}
            {[[0, 5.5, 0.1], [1, 4.5, 0.1], [-1.5, 5, 0.1]].map(([bx, by, bz], i) => (
                <mesh key={`line-${i}`} position={[bx, by, bz]}>
                    <boxGeometry args={[i === 0 ? 3 : 2, 0.04, 0.01]} />
                    <meshStandardMaterial color="#93c5fd" emissive="#93c5fd" emissiveIntensity={0.4} />
                </mesh>
            ))}
            <pointLight position={[0, 6, 1]} intensity={1} color="#e0f0ff" distance={7} />
        </group>
    );
}

/** Server rack pair (server_a / server_b anchors) */
function SVServerRack({ position }) {
    const [x, , z] = position;
    return (
        <group position={[x, 0, z]}>
            {/* Cabinet body */}
            <mesh position={[0, 2.5, 0]}>
                <boxGeometry args={[2, 5, 1]} />
                <meshStandardMaterial color="#ddeeff" metalness={0.7} roughness={0.2} />
            </mesh>
            {/* Drive bays */}
            {[0.8, 1.5, 2.2, 2.9, 3.6].map((y, i) => (
                <mesh key={i} position={[0, y, -0.51]}>
                    <boxGeometry args={[1.8, 0.22, 0.04]} />
                    <meshStandardMaterial color="#c8daf0" metalness={0.5} roughness={0.4} />
                </mesh>
            ))}
            {/* LED indicators */}
            {[0.8, 1.5, 2.2, 2.9, 3.6].map((y, i) => (
                <mesh key={`led-${i}`} position={[0.8, y, -0.54]}>
                    <boxGeometry args={[0.06, 0.06, 0.02]} />
                    <meshStandardMaterial
                        emissive={[i % 3 === 0 ? '#22c55e' : i % 3 === 1 ? '#3b82f6' : '#f59e0b']}
                        emissiveIntensity={2} color="black" />
                </mesh>
            ))}
            <pointLight position={[0, 3, -1.5]} intensity={0.6} color="#a0c8f0" distance={5} />
        </group>
    );
}

/** Central presentation podium (central_podium anchor) */
function SVPodium({ position }) {
    const [x, , z] = position;
    return (
        <group position={[x, 0, z]}>
            <mesh position={[0, 0.6, 0]}>
                <cylinderGeometry args={[1.5, 1.8, 1.2, 32]} />
                <meshStandardMaterial color="#e8f4ff" metalness={0.5} roughness={0.05} />
            </mesh>
            <mesh position={[0, 1.21, 0]}>
                <cylinderGeometry args={[1.55, 1.55, 0.08, 32]} />
                <meshStandardMaterial color="#c8daf0" metalness={0.7} roughness={0.1} />
            </mesh>
            <pointLight position={[0, 0.5, 0]} intensity={1.5} color="#60a5fa" distance={5} />
        </group>
    );
}

/** Floor zone marker for SV (entrance / corner_meeting) */
function SVFloorZone({ position, color = '#3b82f6' }) {
    const [x, , z] = position;
    return (
        <group position={[x, 0.01, z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.2, 0.05, 8, 32]} />
                <meshStandardMaterial emissive={color} emissiveIntensity={0.6} color="white" />
            </mesh>
            <pointLight position={[0, 0.3, 0]} intensity={0.4} color={color} distance={4} />
        </group>
    );
}

// ─────────────────────────────────────────
// TEMPLATE 1: Neon Dev Room
// ─────────────────────────────────────────
function NeonDevRoom() {
    const gridRef = useRef();
    useFrame((state) => {
        if (gridRef.current) {
            gridRef.current.material.emissiveIntensity =
                0.3 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
        }
    });

    const anchors = ROOM_ANCHORS.neon_dev;

    // ── Physical Boundaries ──
    // Floor
    usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], position: [0, 0, 0] }));
    // Ceiling
    usePlane(() => ({ rotation: [Math.PI / 2, 0, 0], position: [0, 14, 0] }));
    // Walls (approx 30x30 room for movement)
    usePlane(() => ({ rotation: [0, 0, 0], position: [0, 0, -20] })); // Back
    usePlane(() => ({ rotation: [0, Math.PI, 0], position: [0, 0, 20] })); // Front
    usePlane(() => ({ rotation: [0, Math.PI / 2, 0], position: [-20, 0, 0] })); // Left
    usePlane(() => ({ rotation: [0, -Math.PI / 2, 0], position: [20, 0, 0] })); // Right

    return (
        <>
            <color attach="background" args={['#020010']} />
            <fog attach="fog" args={['#020010', 22, 90]} />
            <Stars radius={80} depth={40} count={6000} factor={3} saturation={0.5} fade speed={0.5} />

            {/* Lighting */}
            <ambientLight intensity={0.12} color="#1a0040" />
            <pointLight position={[0, 14, 0]} intensity={4} color="#c026d3" distance={50} />
            <pointLight position={[12, 8, -10]} intensity={2.5} color="#22d3ee" distance={35} />
            <pointLight position={[-12, 8, 10]} intensity={2} color="#c026d3" distance={30} />

            {/* Neon Grid Floor */}
            <mesh ref={gridRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <planeGeometry args={[80, 80, 60, 60]} />
                <meshStandardMaterial color="#050015" wireframe emissive="#7c3aed"
                    emissiveIntensity={0.3} transparent opacity={0.7} />
            </mesh>
            {/* Solid floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
                <planeGeometry args={[80, 80]} />
                <meshStandardMaterial color="#050015" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Ceiling grid */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 14, 0]}>
                <planeGeometry args={[60, 60, 20, 20]} />
                <meshStandardMaterial color="#000010" wireframe emissive="#22d3ee"
                    emissiveIntensity={0.15} transparent opacity={0.35} />
            </mesh>

            {/* Neon floor strips */}
            {[-8, -4, 0, 4, 8].map((z, i) => (
                <mesh key={`strip-${i}`} position={[0, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[40, 0.05]} />
                    <meshStandardMaterial
                        emissive={i % 2 === 0 ? "#c026d3" : "#22d3ee"} emissiveIntensity={1.5} color="black" />
                </mesh>
            ))}

            {/* Corner structural pillars */}
            {[[-16, -16], [-16, 16], [16, -16], [16, 16]].map(([x, z], i) => (
                <group key={`pillar-${i}`} position={[x, 0, z]}>
                    <mesh position={[0, 5, 0]}>
                        <boxGeometry args={[1.2, 10, 1.2]} />
                        <meshStandardMaterial color="#0a001a" emissive={i % 2 === 0 ? "#c026d3" : "#22d3ee"}
                            emissiveIntensity={0.3} metalness={0.9} roughness={0.1} />
                    </mesh>
                    <pointLight position={[0, 9, 0]} intensity={0.8}
                        color={i % 2 === 0 ? "#c026d3" : "#22d3ee"} distance={6} />
                </group>
            ))}

            {/* ── ANCHOR OBJECTS ── */}
            {/* main_terminal — Central hologram */}
            <NeonHoloTerminal position={anchors.find(a => a.id === 'main_terminal').position} />

            {/* left_panel / right_panel — wall panels */}
            <NeonHoloPanel
                position={anchors.find(a => a.id === 'left_panel').position}
                color="#22d3ee" label="Left Panel" />
            <NeonHoloPanel
                position={anchors.find(a => a.id === 'right_panel').position}
                color="#c026d3" label="Right Panel" />

            {/* server racks */}
            <NeonServerRack position={anchors.find(a => a.id === 'server_rack_a').position} color="#c026d3" />
            <NeonServerRack position={anchors.find(a => a.id === 'server_rack_b').position} color="#22d3ee" />

            {/* floor zones */}
            <NeonFloorZone position={anchors.find(a => a.id === 'floor_grid_front').position} color="#7c3aed" />
            <NeonFloorZone position={anchors.find(a => a.id === 'floor_grid_left').position} color="#22d3ee" />
            <NeonFloorZone position={anchors.find(a => a.id === 'floor_grid_right').position} color="#c026d3" />
        </>
    );
}

// ─────────────────────────────────────────
// TEMPLATE 2: Silicon Valley Lab
// ─────────────────────────────────────────
function SiliconValleyRoom() {
    const anchors = ROOM_ANCHORS.silicon_valley;

    // ── Physical Boundaries ──
    // Floor
    usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], position: [0, 0, 0] }));
    // Ceiling
    usePlane(() => ({ rotation: [Math.PI / 2, 0, 0], position: [0, 12, 0] }));
    // Walls
    usePlane(() => ({ rotation: [0, 0, 0], position: [0, 0, -22] })); // Back
    usePlane(() => ({ rotation: [0, Math.PI, 0], position: [0, 0, 22] })); // Front
    usePlane(() => ({ rotation: [0, Math.PI / 2, 0], position: [-22, 0, 0] })); // Left
    usePlane(() => ({ rotation: [0, -Math.PI / 2, 0], position: [22, 0, 0] })); // Right

    return (
        <>
            <color attach="background" args={['#e8f4fd']} />
            <fog attach="fog" args={['#c8e8fa', 25, 100]} />

            {/* Lighting */}
            <ambientLight intensity={1.2} color="#f0f8ff" />
            <directionalLight position={[10, 20, 5]} intensity={2.5} color="#ffffff" castShadow />
            <directionalLight position={[-10, 15, -5]} intensity={1.5} color="#e0f0ff" />
            <pointLight position={[0, 10, 0]} intensity={2} color="#a0c8f0" distance={50} />

            {/* Polished white floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[80, 80]} />
                <meshStandardMaterial color="#f5faff" metalness={0.4} roughness={0.1} />
            </mesh>
            {/* Subtle floor grid */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <planeGeometry args={[80, 80, 40, 40]} />
                <meshStandardMaterial color="white" wireframe emissive="#a0c8f0"
                    emissiveIntensity={0.08} transparent opacity={0.2} />
            </mesh>
            {/* Ceiling */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 12, 0]}>
                <planeGeometry args={[80, 80]} />
                <meshStandardMaterial color="#f0f8ff" />
            </mesh>

            {/* Ceiling light panels */}
            {[[-8, 0], [0, 0], [8, 0], [0, -8], [0, 8]].map(([lx, lz], i) => (
                <group key={`light-${i}`}>
                    <mesh position={[lx, 11.9, lz]} rotation={[Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[3, 0.7]} />
                        <meshStandardMaterial emissive="#cce8ff" emissiveIntensity={2} color="white" />
                    </mesh>
                    <pointLight position={[lx, 10.5, lz]} intensity={2} color="#d0eeff" distance={12} />
                </group>
            ))}

            {/* Glass side walls */}
            {[[-22, 6, 0, [0, Math.PI / 2, 0]], [22, 6, 0, [0, -Math.PI / 2, 0]]].map(([wx, wy, wz, rot], i) => (
                <mesh key={`wall-${i}`} position={[wx, wy, wz]} rotation={rot}>
                    <planeGeometry args={[50, 12]} />
                    <meshStandardMaterial color="#c8e8ff" transparent opacity={0.15}
                        metalness={0.6} roughness={0} />
                </mesh>
            ))}

            {/* ── ANCHOR OBJECTS ── */}
            {/* main_monitor — desk + big monitor */}
            <SVMonitorDesk position={anchors.find(a => a.id === 'main_monitor').position} />

            {/* whiteboard */}
            <SVWhiteboard position={anchors.find(a => a.id === 'whiteboard').position} />

            {/* server racks */}
            <SVServerRack position={anchors.find(a => a.id === 'server_a').position} />
            <SVServerRack position={anchors.find(a => a.id === 'server_b').position} />

            {/* central podium */}
            <SVPodium position={anchors.find(a => a.id === 'central_podium').position} />

            {/* desk area (secondary desk) */}
            <SVMonitorDesk position={anchors.find(a => a.id === 'desk_area').position} />

            {/* floor zones */}
            <SVFloorZone position={anchors.find(a => a.id === 'entrance').position} color="#3b82f6" />
            <SVFloorZone position={anchors.find(a => a.id === 'corner_meeting').position} color="#7c3aed" />
        </>
    );
}

// ─────────────────────────────────────────
// TEMPLATE 3: Dynamic Room (from photo)
// ─────────────────────────────────────────

/**
 * Loads a real .glb model and scales it per-axis to match vision AI dimensions.
 * Uses Box3 to measure the raw GLB, then applies independent x/y/z scale factors.
 */
function GLBFurniture({ glbPath, color = '#8B4513', position, type, dimensions, isHovered, isSelected, rotation = 0 }) {
    const { scene } = useGLTF(glbPath);

    const cloned = React.useMemo(() => {
        const c = scene.clone(true);

        c.traverse((child) => {
            if (child.isMesh && child.material) {
                // Safely handle both single material and array of materials
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                
                const clonedMaterials = materials.map(mat => {
                    const m = mat.clone();
                    
                    // Only tint if it has a color property
                    if (color && color !== '#FFFFFF' && m.color) {
                        m.color.set(color);
                    }
                    
                    // Hover/select: brighten the emissive so it glows
                    if (isSelected || isHovered) {
                        if (m.emissive) {
                            m.emissive = new THREE.Color(isSelected ? '#22d3ee' : '#ffffff');
                            m.emissiveIntensity = isSelected ? 0.55 : 0.2;
                        }
                    }
                    return m;
                });

                child.material = Array.isArray(child.material) ? clonedMaterials : clonedMaterials[0];
            }
        });

        // Measure raw GLB size
        const rawBox = new THREE.Box3().setFromObject(c);
        const rawSize = rawBox.getSize(new THREE.Vector3());

        if (rawSize.x > 0 && rawSize.y > 0 && rawSize.z > 0) {
            // Target dimensions: use vision-estimated dims, else fallback per type
            const fallback = TYPE_DEFAULTS[type] || { w: 1.0, h: 1.0, d: 1.0 };
            const tW = dimensions?.width  || fallback.w;
            const tH = dimensions?.height || fallback.h;
            const tD = dimensions?.depth  || fallback.d;

            // Per-axis scale so the object exactly matches real-world size
            c.scale.set(
                tW / rawSize.x,
                tH / rawSize.y,
                tD / rawSize.z
            );

            // Re-seat on floor (y=0)
            const scaledBox = new THREE.Box3().setFromObject(c);
            c.position.y = -scaledBox.min.y;
        }

        return c;
    }, [scene, type, dimensions, isHovered, isSelected]);

    return (
        <group position={[position.x || 0, 0, position.z || 0]} rotation={[0, rotation, 0]}>
            <primitive object={cloned} />
            {(isHovered || isSelected) && (
                <pointLight position={[0, 1.0, 0]} intensity={isSelected ? 3 : 1.5} color={isSelected ? '#22d3ee' : '#ffffff'} distance={3} />
            )}
        </group>
    );
}

/**
 * Fallback box furniture for types without a .glb model.
 * Uses per-axis dimensions from vision AI or type defaults.
 */
function BoxFurniture({ type = 'desk', color = '#8B4513', position, dimensions, isHovered, isSelected, rotation = 0 }) {
    const fallback = TYPE_DEFAULTS[type] || { w: 1.0, h: 1.0, d: 1.0 };
    const w = dimensions?.width  || fallback.w;
    const h = dimensions?.height || fallback.h;
    const d = dimensions?.depth  || fallback.d;
    const yOff = h / 2;
    const emissiveColor = isSelected ? '#22d3ee' : (isHovered ? '#ffffff' : color);

    return (
        <group position={[position.x || 0, 0, position.z || 0]} rotation={[0, rotation, 0]}>
            <mesh position={[0, yOff, 0]}>
                <boxGeometry args={[w, h, d]} />
                <meshStandardMaterial
                    color={color}
                    emissive={emissiveColor}
                    emissiveIntensity={isHovered || isSelected ? 0.5 : 0.06}
                    roughness={0.7}
                />
            </mesh>
            {(isHovered || isSelected) && (
                <pointLight position={[0, yOff + 0.5, 0]} intensity={3} color={isSelected ? '#22d3ee' : '#ffffff'} distance={3} />
            )}
        </group>
    );
}

// We no longer need GLB_MAP since we dynamically load whatever the backend matched.

// Reference bounding boxes per type (w, h, d) in metres — used when vision dims are missing
const TYPE_DEFAULTS = {
    bed:       { w: 2.0,  h: 0.55, d: 2.0  },
    desk:      { w: 1.2,  h: 0.75, d: 0.6  },
    chair:     { w: 0.6,  h: 0.9,  d: 0.6  },
    bookshelf: { w: 1.2,  h: 1.8,  d: 0.4  },
    lamp:      { w: 0.3,  h: 1.5,  d: 0.3  },
    plant:     { w: 0.5,  h: 0.8,  d: 0.5  },
};

// DynamicRoom: all colors driven by aesthetics from the vision AI.
function DynamicRoom({ concepts = [], roomDimensions, hoveredConceptId, selectedForSwapId }) {
    const roomW  = roomDimensions?.width  || 5;
    const roomD  = roomDimensions?.depth  || 5;
    const roomH  = roomDimensions?.height || 2.5;
    const halfW  = roomW / 2;
    const halfD  = roomD / 2;
    const maxHalf = Math.max(halfW, halfD);

    // Extract aesthetics — these come from vision AI via dynamic_config.aesthetics
    const a = roomDimensions?.aesthetics || {};
    const wallColor     = a.wall_color     || '#d9cbb8';
    const floorColor    = a.floor_color    || '#7a4f28';
    const floorMat      = a.floor_material || 'wood';
    const ceilingColor  = a.ceiling_color  || '#f2ede4';
    const lightMood     = a.ambient_light  || 'warm';

    // Fog/background: use a darkened version of the wall color so the room
    // feels immersive and the background never clashes with the walls.
    const fogColor = React.useMemo(() => {
        try {
            return '#' + new THREE.Color(wallColor).multiplyScalar(0.25).getHexString();
        } catch { return '#111111'; }
    }, [wallColor]);

    // Ambient light colors based on mood — for dark/neon rooms use the wall
    // color itself as the light tint so LEDs actually illuminate the surfaces.
    const lightColors = {
        warm:    { ambient: '#fff5e6', ceiling: '#fffde8', fill: '#c8dfff' },
        cool:    { ambient: '#e6f0ff', ceiling: '#e8f4ff', fill: '#ffd8c8' },
        neutral: { ambient: '#f5f5f5', ceiling: '#ffffff', fill: '#d0d0ff' },
        // Dark rooms (e.g. LED/neon bedrooms): use wall color as the light source
        dark:    { ambient: wallColor,  ceiling: wallColor,  fill: wallColor  },
    };
    const lc = lightColors[lightMood] || lightColors.warm;

    // For dark/neon rooms boost ambient so the wall color actually shows up
    const ambientIntensity = lightMood === 'dark' ? 0.9 : 0.65;
    const ceilingLightIntensity = lightMood === 'dark' ? 3.0 : 4.0;

    // Physics walls
    usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], position: [0, 0, 0] }));
    usePlane(() => ({ rotation: [Math.PI / 2, 0, 0],  position: [0, roomH, 0] }));
    usePlane(() => ({ rotation: [0, 0, 0],             position: [0, 0, -halfD] }));
    usePlane(() => ({ rotation: [0, Math.PI, 0],       position: [0, 0, halfD] }));
    usePlane(() => ({ rotation: [0, Math.PI / 2, 0],   position: [-halfW, 0, 0] }));
    usePlane(() => ({ rotation: [0, -Math.PI / 2, 0],  position: [halfW, 0, 0] }));

    return (
        <>
            <color attach="background" args={[fogColor]} />
            <fog attach="fog" args={[fogColor, maxHalf * 2, maxHalf * 6]} />

            {/* ── LIGHTING ── */}
            <ambientLight intensity={ambientIntensity} color={lc.ambient} />
            <pointLight position={[0, roomH - 0.15, 0]} intensity={ceilingLightIntensity} color={lc.ceiling} distance={maxHalf * 3} />
            <directionalLight position={[halfW * 0.5, roomH, -halfD * 0.5]} intensity={lightMood === 'dark' ? 0.4 : 1.2} color={lc.ceiling} castShadow />
            <pointLight position={[halfW - 0.5, roomH * 0.6, halfD - 0.5]}  intensity={0.5} color={lc.fill}    distance={maxHalf * 2} />

            {/* ── FLOOR ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[roomW, roomD]} />
                <meshStandardMaterial
                    color={floorColor}
                    roughness={floorMat === 'carpet' ? 1.0 : floorMat === 'tile' ? 0.3 : 0.82}
                    metalness={floorMat === 'tile' ? 0.15 : 0.01}
                />
            </mesh>

            {/* Floor detail lines — wood planks or tile grid */}
            {floorMat === 'wood' && Array.from(
                { length: Math.floor(roomD / 1.2) },
                (_, i) => (i - Math.floor(roomD / 2.4)) * 1.2
            ).map((z, i) => (
                <mesh key={`pk-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, z]}>
                    <planeGeometry args={[roomW, 0.012]} />
                    <meshStandardMaterial color={new THREE.Color(floorColor).multiplyScalar(0.75)} roughness={1} />
                </mesh>
            ))}

            {floorMat === 'tile' && [
                ...Array.from({ length: Math.floor(roomD / 0.6) }, (_, i) => (i - Math.floor(roomD / 1.2)) * 0.6).map((z, i) => (
                    <mesh key={`tg-z-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, z]}>
                        <planeGeometry args={[roomW, 0.008]} />
                        <meshStandardMaterial color={new THREE.Color(floorColor).multiplyScalar(0.8)} />
                    </mesh>
                )),
                ...Array.from({ length: Math.floor(roomW / 0.6) }, (_, i) => (i - Math.floor(roomW / 1.2)) * 0.6).map((x, i) => (
                    <mesh key={`tg-x-${i}`} rotation={[-Math.PI / 2, Math.PI / 2, 0]} position={[x, 0.005, 0]}>
                        <planeGeometry args={[roomD, 0.008]} />
                        <meshStandardMaterial color={new THREE.Color(floorColor).multiplyScalar(0.8)} />
                    </mesh>
                ))
            ]}

            {/* ── CEILING ── */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, roomH, 0]}>
                <planeGeometry args={[roomW, roomD]} />
                <meshStandardMaterial
                    color={ceilingColor}
                    emissive={lightMood === 'dark' ? wallColor : '#000000'}
                    emissiveIntensity={lightMood === 'dark' ? 0.4 : 0}
                    roughness={1}
                />
            </mesh>
            {/* Ceiling pendant */}
            <mesh position={[0, roomH - 0.05, 0]}>
                <cylinderGeometry args={[0.18, 0.12, 0.1, 16]} />
                <meshStandardMaterial color={ceilingColor} emissive={lc.ceiling} emissiveIntensity={1.5} />
            </mesh>
            <mesh position={[0, roomH - 0.25, 0]}>
                <cylinderGeometry args={[0.01, 0.01, 0.3, 6]} />
                <meshStandardMaterial color="#444" roughness={1} />
            </mesh>

            {/* ── WALLS — all 4 in wall_color ── */}
            {[
                { pos: [0, roomH / 2, -halfD],  rot: [0, 0, 0],           w: roomW, h: roomH },
                { pos: [0, roomH / 2,  halfD],  rot: [0, Math.PI, 0],     w: roomW, h: roomH },
                { pos: [-halfW, roomH / 2, 0],  rot: [0,  Math.PI / 2, 0], w: roomD, h: roomH },
                { pos: [ halfW, roomH / 2, 0],  rot: [0, -Math.PI / 2, 0], w: roomD, h: roomH },
            ].map((wall, i) => (
                <mesh key={`wall-${i}`} position={wall.pos} rotation={wall.rot} receiveShadow>
                    <planeGeometry args={[wall.w, wall.h]} />
                    <meshStandardMaterial
                        color={wallColor}
                        emissive={lightMood === 'dark' ? wallColor : '#000000'}
                        emissiveIntensity={lightMood === 'dark' ? 0.25 : 0}
                        roughness={0.95}
                    />
                </mesh>
            ))}

            {/* A simple door on the front wall so the user knows it's a room and not a purple screen */}
            <mesh position={[0, 1.0, halfD - 0.01]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[0.9, 2.0]} />
                <meshStandardMaterial color="#333333" roughness={0.8} />
            </mesh>

            {/* Baseboard strips in a slightly darker wall tone */}
            {[
                { pos: [0, 0.06, -halfD + 0.01], rot: [0, 0, 0],             w: roomW },
                { pos: [0, 0.06,  halfD - 0.01], rot: [0, Math.PI, 0],       w: roomW },
                { pos: [-halfW + 0.01, 0.06, 0], rot: [0,  Math.PI / 2, 0],  w: roomD },
                { pos: [ halfW - 0.01, 0.06, 0], rot: [0, -Math.PI / 2, 0],  w: roomD },
            ].map((b, i) => (
                <mesh key={`bb-${i}`} position={b.pos} rotation={b.rot}>
                    <planeGeometry args={[b.w, 0.12]} />
                    <meshStandardMaterial color={new THREE.Color(wallColor).multiplyScalar(0.7)} roughness={0.95} />
                </mesh>
            ))}

            {/* ── FURNITURE ── */}
            {concepts.map((concept, i) => {
                const type = concept.material_props?.glb_type
                    || concept.anchor_id?.split('_')?.[1]
                    || 'desk';
                const color      = concept.hex_color || '#c8b89a';
                const pos        = { x: concept.position_x || 0, z: concept.position_z || 0 };
                const dimensions = concept.material_props?.dimensions;
                const rotY       = (concept.material_props?.rotation_y || 0) * (Math.PI / 180);
                
                // Dynamically point to the model chosen by the LLM
                const glbPath    = `/models/${type}.glb`;
                
                const isHovered  = hoveredConceptId === concept.id;
                const isSelected = selectedForSwapId === concept.id;

                return (
                    <Suspense key={concept.id || i} fallback={
                        <BoxFurniture type={type} color={color} position={pos} dimensions={dimensions} isHovered={isHovered} isSelected={isSelected} rotation={rotY} />
                    }>
                        <GLBFurniture glbPath={glbPath} color={color} position={pos} type={type} dimensions={dimensions} isHovered={isHovered} isSelected={isSelected} rotation={rotY} />
                    </Suspense>
                );
            })}
        </>
    );
}

// ─────────────────────────────────────────
// Main export
// ─────────────────────────────────────────
export function RoomEnvironment({ theme = 'neon_dev', concepts = [], roomDimensions, hoveredConceptId, selectedForSwapId }) {
    // Default dimensions — a normal bedroom
    const defaultDims = { width: 5, height: 2.5, depth: 5 };
    const dims = roomDimensions || defaultDims;
    if (theme === 'dynamic') return <DynamicRoom concepts={concepts} roomDimensions={dims} hoveredConceptId={hoveredConceptId} selectedForSwapId={selectedForSwapId} />;
    if (theme === 'silicon_valley') return <SiliconValleyRoom />;
    return <NeonDevRoom />;
}
