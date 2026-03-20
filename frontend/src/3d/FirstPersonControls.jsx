import React from 'react';
import { PointerLockControls } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';

// Uses simple math to walk on the X/Z plane (no gravity/cannon needed for MVP)
export function FirstPersonControls() {
    const { camera } = useThree();
    const speed = 5.0;

    // Track key presses
    const keys = React.useRef({
        w: false, a: false, s: false, d: false
    });

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (keys.current.hasOwnProperty(e.key.toLowerCase())) {
                keys.current[e.key.toLowerCase()] = true;
            }
        };
        const handleKeyUp = (e) => {
            if (keys.current.hasOwnProperty(e.key.toLowerCase())) {
                keys.current[e.key.toLowerCase()] = false;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    useFrame((state, delta) => {
        const direction = new Vector3();
        const frontVector = new Vector3(0, 0, (keys.current.s ? 1 : 0) - (keys.current.w ? 1 : 0));
        const sideVector = new Vector3((keys.current.a ? 1 : 0) - (keys.current.d ? 1 : 0), 0, 0);

        direction
            .subVectors(frontVector, sideVector)
            .normalize()
            .multiplyScalar(speed * delta)
            .applyEuler(camera.rotation);

        // Lock Y to 1.7 (average human height) to simulate walking, not flying
        camera.position.add(direction);
        camera.position.y = 1.7;

        // Simple boundary box (room is approx 20x20)
        camera.position.x = Math.max(-10, Math.min(10, camera.position.x));
        camera.position.z = Math.max(-10, Math.min(10, camera.position.z));
    });

    return <PointerLockControls />;
}
