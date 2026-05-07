/**
 * FirstPersonControls.jsx
 *
 * Physics-based first-person movement for NeuralHome.
 * - WASD + Arrow Keys.
 * - Smooth acceleration/deceleration via lerp.
 * - Sensible pointer sensitivity (0.35).
 * - Vertical look clamped to avoid flipping.
 */
import React, { useRef, useEffect } from 'react';
import { PointerLockControls } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useSphere } from '@react-three/cannon';

export function FirstPersonControls({ roomHalf = 5 }) {
    const { camera } = useThree();
    const controlsRef = useRef();

    // Comfortable walking speed — like a real person, ~1.5 m/s
    // The engine scale is 1 unit = 1 meter
    const WALK_SPEED = 4;
    const LERP_FACTOR = 0.18; // Smoothness — higher = snappier, lower = floatier

    // Spawn just inside the front wall, facing the room center
    const spawnZ = roomHalf - 0.3;

    // Physics body for the player
    const [ref, api] = useSphere(() => ({
        mass: 1,
        fixedRotation: true,
        type: 'Dynamic',
        position: [0, 1.8, spawnZ], // Spawn at the front wall of the 10×10 room
        args: [0.5],
    }));

    const velocity = useRef([0, 0, 0]);
    useEffect(() => {
        const unsub = api.velocity.subscribe((v) => { velocity.current = v; });
        return unsub;
    }, [api.velocity]);

    const pos = useRef([0, 1.8, spawnZ]);
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

    // Auto-lock pointer on mount
    useEffect(() => {
        const t = setTimeout(() => {
            if (controlsRef.current && !controlsRef.current.isLocked) controlsRef.current.lock();
        }, 400);
        return () => clearTimeout(t);
    }, []);

    useFrame(() => {
        const k = keys.current;
        const fwd = (k.w || k.ArrowUp)    ? 1 : 0;
        const bck = (k.s || k.ArrowDown)  ? 1 : 0;
        const lft = (k.a || k.ArrowLeft)  ? 1 : 0;
        const rgt = (k.d || k.ArrowRight) ? 1 : 0;

        const input = new Vector3(rgt - lft, 0, bck - fwd);
        if (input.lengthSq() > 0) {
            input.normalize().multiplyScalar(WALK_SPEED).applyEuler(camera.rotation);
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
            />
        </>
    );
}
