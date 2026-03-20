import React from 'react';
import { Sky, Stars } from '@react-three/drei';

export function Environment() {
    return (
        <>
            <ambientLight intensity={0.2} color="#4c1d95" />
            <pointLight position={[0, 10, 0]} intensity={1.5} color="#c084fc" distance={50} />

            {/* Dark futuristic sky / space */}
            <color attach="background" args={['#05000b']} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

            {/* The Data Grid Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial
                    color="#0f0518"
                    wireframe={true}
                    transparent
                    opacity={0.2}
                    emissive="#7c3aed"
                    emissiveIntensity={0.5}
                />
            </mesh>

            {/* Solid Floor beneath the grid */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial color="#020005" />
            </mesh>
        </>
    );
}
