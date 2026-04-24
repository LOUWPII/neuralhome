/**
 * FirstPersonControls.jsx
 *
 * - WASD + Arrow Keys movement (both work simultaneously)
 * - Auto-locks pointer on mount so user enters the room immediately
 *   (no extra click needed — fixes UX issue #3)
 */
import React, { useRef, useEffect } from 'react';
import { PointerLockControls } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';

export function FirstPersonControls() {
    const { camera, gl } = useThree();
    const controlsRef = useRef();
    const speed = 5.0;

    // Track every key we care about — WASD + Arrow keys
    const keys = useRef({
        w: false, a: false, s: false, d: false,
        ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    });

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (Object.prototype.hasOwnProperty.call(keys.current, e.key)) {
                keys.current[e.key] = true;
            }
            // also map lowercase for WASD
            if (Object.prototype.hasOwnProperty.call(keys.current, e.key.toLowerCase())) {
                keys.current[e.key.toLowerCase()] = true;
            }
        };
        const handleKeyUp = (e) => {
            if (Object.prototype.hasOwnProperty.call(keys.current, e.key)) {
                keys.current[e.key] = false;
            }
            if (Object.prototype.hasOwnProperty.call(keys.current, e.key.toLowerCase())) {
                keys.current[e.key.toLowerCase()] = false;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup',   handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup',   handleKeyUp);
        };
    }, []);

    // Auto-lock pointer on mount so the user is immediately inside the room
    useEffect(() => {
        const timer = setTimeout(() => {
            if (controlsRef.current && !controlsRef.current.isLocked) {
                controlsRef.current.lock();
            }
        }, 120);   // small delay to let the canvas finish rendering
        return () => clearTimeout(timer);
    }, []);

    useFrame((_, delta) => {
        const k = keys.current;

        // Forward/back: W / ArrowUp  →  S / ArrowDown
        const fwd  = (k.w || k.ArrowUp)    ? 1 : 0;
        const back = (k.s || k.ArrowDown)  ? 1 : 0;
        // Strafe: A / ArrowLeft  →  D / ArrowRight
        const left  = (k.a || k.ArrowLeft)  ? 1 : 0;
        const right = (k.d || k.ArrowRight) ? 1 : 0;

        const frontVector = new Vector3(0, 0, back - fwd);
        const sideVector  = new Vector3(left - right, 0, 0);

        const direction = new Vector3()
            .subVectors(frontVector, sideVector)
            .normalize()
            .multiplyScalar(speed * delta)
            .applyEuler(camera.rotation);

        camera.position.add(direction);

        // Lock Y to eye-height (1.7 m) — no flying
        camera.position.y = 1.7;

        // Room boundary (approx 20×20 units)
        camera.position.x = Math.max(-10, Math.min(10, camera.position.x));
        camera.position.z = Math.max(-10, Math.min(10, camera.position.z));
    });

    return <PointerLockControls ref={controlsRef} />;
}
