/**
 * FirstPersonControls.jsx
 *
 * REFACTORED: Now uses @react-three/cannon for physics-based movement.
 * - Collides with walls and objects.
 * - WASD + Arrow Keys movement.
 * - Auto-locks pointer on mount.
 */
import React, { useRef, useEffect } from 'react';
import { PointerLockControls } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useSphere } from '@react-three/cannon';

export function FirstPersonControls() {
    const { camera } = useThree();
    const controlsRef = useRef();
    const walkSpeed = 10; // meters per second

    // 1. Physical body for the player (a sphere at eye level)
    const [ref, api] = useSphere(() => ({
        mass: 1,
        fixedRotation: true,
        type: 'Dynamic',
        position: [0, 1.8, 8], // Initial spawn
        args: [0.6], // sphere radius
    }));

    // Local velocity track to sync camera
    const velocity = useRef([0, 0, 0]);
    useEffect(() => {
        const unsubscribe = api.velocity.subscribe((v) => (velocity.current = v));
        return unsubscribe;
    }, [api.velocity]);

    const pos = useRef([0, 1.8, 8]);
    useEffect(() => {
        const unsubscribe = api.position.subscribe((p) => (pos.current = p));
        return unsubscribe;
    }, [api.position]);

    // Track keys
    const keys = useRef({
        w: false, a: false, s: false, d: false,
        ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    });

    useEffect(() => {
        const handleKeyDown = (e) => {
            const key = e.key.toLowerCase();
            if (keys.current.hasOwnProperty(key)) keys.current[key] = true;
            if (keys.current.hasOwnProperty(e.key)) keys.current[e.key] = true;
        };
        const handleKeyUp = (e) => {
            const key = e.key.toLowerCase();
            if (keys.current.hasOwnProperty(key)) keys.current[key] = false;
            if (keys.current.hasOwnProperty(e.key)) keys.current[e.key] = false;
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Pointer lock on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            if (controlsRef.current && !controlsRef.current.isLocked) {
                controlsRef.current.lock();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    useFrame((_, delta) => {
        const k = keys.current;
        const fwd = (k.w || k.ArrowUp) ? 1 : 0;
        const bck = (k.s || k.ArrowDown) ? 1 : 0;
        const lft = (k.a || k.ArrowLeft) ? 1 : 0;
        const rgt = (k.d || k.ArrowRight) ? 1 : 0;

        const inputVelocity = new Vector3(rgt - lft, 0, bck - fwd);
        
        if (inputVelocity.lengthSq() > 0) {
            inputVelocity.normalize().multiplyScalar(walkSpeed).applyEuler(camera.rotation);
        } else {
            inputVelocity.set(0, 0, 0);
        }

        // Apply movement to physics body (keep current Y velocity for gravity)
        api.velocity.set(inputVelocity.x, velocity.current[1], inputVelocity.z);

        // Sync camera to physics body, adding an offset to reach eye level (1.7m)
        // Since sphere radius is 0.6, its center rests at y=0.6. 
        // 0.6 + 1.1 = 1.7m
        camera.position.set(pos.current[0], pos.current[1] + 1.1, pos.current[2]);
    });

    return (
        <>
            <group ref={ref} /> {/* Physical body anchor */}
            <PointerLockControls ref={controlsRef} />
        </>
    );
}
