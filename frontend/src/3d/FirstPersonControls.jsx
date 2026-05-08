/**
 * FirstPersonControls.jsx
 *
 * Physics-based first-person movement for NeuralHome.
 * - WASD + Arrow Keys.
 * - Smooth acceleration/deceleration via lerp.
 * - Sensible pointer sensitivity (0.35).
 * - Vertical look clamped to avoid flipping.
 */
import React, { useRef, useEffect, useState } from 'react';
import { PointerLockControls, Html } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3, Euler } from 'three';
import { useSphere } from '@react-three/cannon';

export function FirstPersonControls({ roomHalf = 5 }) {
    const { camera } = useThree();
    const controlsRef = useRef();
    const [locked, setLocked] = useState(false);
    const initializedRef = useRef(false);

    // Comfortable walking speed — like a real person, ~1.5 m/s
    // The engine scale is 1 unit = 1 meter
    const WALK_SPEED = 4;
    const LERP_FACTOR = 0.18; // Smoothness — higher = snappier, lower = floatier

    // Spawn safely inside the room, avoiding intersecting the front wall physics plane
    const spawnZ = roomHalf - 0.8;

    // Physics body for the player
    const [ref, api] = useSphere(() => ({
        mass: 1,
        fixedRotation: true,
        type: 'Dynamic',
        position: [0, 1.5, spawnZ], // Spawn lower to avoid hitting a 2.2m ceiling
        args: [0.3], // Smaller radius prevents clipping into walls/ceiling
    }));

    const velocity = useRef([0, 0, 0]);
    useEffect(() => {
        const unsub = api.velocity.subscribe((v) => { velocity.current = v; });
        return unsub;
    }, [api.velocity]);

    const pos = useRef([0, 1.5, spawnZ]);
    useEffect(() => {
        const unsub = api.position.subscribe((p) => { pos.current = p; });
        return unsub;
    }, [api.position]);

    // Desired velocity computed from key state — applied smoothly via lerp
    const targetVel = useRef(new Vector3());

    const keys = useRef({
        w: false, a: false, s: false, d: false,
        ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    });

    useEffect(() => {
        const down = (e) => {
            const k = e.key.toLowerCase();
            if (k in keys.current) keys.current[k] = true;
            if (e.key in keys.current) keys.current[e.key] = true;
        };
        const up = (e) => {
            const k = e.key.toLowerCase();
            if (k in keys.current) keys.current[k] = false;
            if (e.key in keys.current) keys.current[e.key] = false;
        };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
    }, []);

    // Auto-lock pointer on mount — REMOVED: browsers block Pointer Lock unless
    // triggered by a direct user gesture. The click-to-start overlay in PalaceView
    // calls controlsRef.current.lock() instead.

    useFrame(() => {
        // On the very first frame, point the camera toward the room interior (-Z)
        if (!initializedRef.current) {
            camera.lookAt(0, 1.8, 0);
            initializedRef.current = true;
        }

        const k = keys.current;
        const fwd = (k.w || k.ArrowUp)    ? 1 : 0;
        const bck = (k.s || k.ArrowDown)  ? 1 : 0;
        const lft = (k.a || k.ArrowLeft)  ? 1 : 0;
        const rgt = (k.d || k.ArrowRight) ? 1 : 0;

        const input = new Vector3(rgt - lft, 0, bck - fwd);
        if (input.lengthSq() > 0) {
            // Only apply yaw (Y-axis rotation) so looking down doesn't slow you down
            const euler = new Euler(0, camera.rotation.y, 0, 'YXZ');
            input.normalize().multiplyScalar(WALK_SPEED).applyEuler(euler);
        }

        // Lerp towards the target velocity for smooth start/stop
        targetVel.current.lerp(input, LERP_FACTOR);
        api.velocity.set(targetVel.current.x, velocity.current[1], targetVel.current.z);

        // Place camera at eye level
        camera.position.set(pos.current[0], pos.current[1] + 1.2, pos.current[2]);
    });

    return (
        <>
            <group ref={ref} />
            <PointerLockControls
                ref={controlsRef}
                pointerSpeed={0.35}
                minPolarAngle={Math.PI * 0.15}
                maxPolarAngle={Math.PI * 0.82}
                onLock={() => setLocked(true)}
                onUnlock={() => setLocked(false)}
            />
            {/* Click-to-start overlay — shown when pointer is not locked */}
            {!locked && (
                <Html fullscreen style={{ pointerEvents: 'none' }}>
                    <div
                        onClick={() => controlsRef.current?.lock()}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0,0,0,0.55)',
                            backdropFilter: 'blur(4px)',
                            cursor: 'pointer',
                            pointerEvents: 'auto',
                            zIndex: 20,
                        }}
                    >
                        <div style={{
                            border: '1.5px solid rgba(192,38,211,0.7)',
                            borderRadius: '12px',
                            padding: '2rem 3rem',
                            textAlign: 'center',
                            background: 'rgba(5,0,22,0.85)',
                            boxShadow: '0 0 40px rgba(192,38,211,0.3)',
                        }}>
                            <p style={{ color: '#e879f9', fontFamily: 'Inter, sans-serif', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                                Click to enter the palace
                            </p>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                                WASD to move · Mouse to look · ESC to pause
                            </p>
                        </div>
                    </div>
                </Html>
            )}
        </>
    );
}
