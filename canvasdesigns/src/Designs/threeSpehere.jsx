import React, { useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Image, Html, Line, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import imageData from '../data/images.json';

const SPHERE_RADIUS = 2; // Control the spacing between images (radius of the sphere)
const CONNECTION_DIST_FACTOR = 1; // Factor to determine line connection distance relative to radius

function SphereImages({ setPopupData }) {
    const count = imageData.length;
    const radius = SPHERE_RADIUS;

    const images = useMemo(() => {
        const temp = [];
        const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle

        for (let i = 0; i < count; i++) {
            const y = (1 - (i / (count - 1)) * 2) * 0.6; // y goes from 0.6 to -0.6 (avoiding poles)
            const r = Math.sqrt(1 - y * y); // radius at y
            const theta = phi * i; // golden angle increment

            const x = Math.cos(theta) * r;
            const z = Math.sin(theta) * r;

            const position = new THREE.Vector3(x, y, z).multiplyScalar(radius);
            const rotation = new THREE.Euler(0, -theta, 0); // Look at center - simplified

            // Better rotation to face outwards:
            const dummy = new THREE.Object3D();
            dummy.position.copy(position);
            dummy.lookAt(new THREE.Vector3(0, 0, 0)); // Look at center

            // We want to look AWAY from center. 
            // lookAt(0,0,0) makes +Z point to center.
            // We want +Z to point away. 
            // We can just rotate 180 degrees around Y axis after looking at center?
            // Or look at a point 2*radius away.
            dummy.lookAt(position.clone().multiplyScalar(2));

            temp.push({
                position,
                rotation: dummy.rotation,
                data: imageData[i]
            });
        }
        return temp;
    }, [count, radius]);

    return (
        <group>
            <Lines images={images} />
            {/* Opaque inner sphere to block view through the other side */}
            {/* <mesh>
                <sphereGeometry args={[SPHERE_RADIUS, 35, 35]} />
                <meshBasicMaterial color="black" />
            </mesh> */}
            {images.map((img, index) => (
                <CircularImage
                    key={img.data.id}
                    data={img.data}
                    position={img.position}
                    rotation={img.rotation}
                    setPopupData={setPopupData}
                />
            ))}
        </group>
    );
}

function CircularImage({ data, position, rotation, setPopupData }) {
    const texture = useTexture(data.url);

    return (
        <mesh
            position={position}
            rotation={rotation}
            onClick={(e) => {
                e.stopPropagation();
                setPopupData(data);
            }}
            onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'auto';
            }}
        >
            <circleGeometry args={[0.5, 32]} />
            <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
        </mesh>
    );
}

function Lines({ images }) {
    const lines = useMemo(() => {
        const points = [];
        const threshold = SPHERE_RADIUS * CONNECTION_DIST_FACTOR;
        for (let i = 0; i < images.length; i++) {
            for (let j = i + 1; j < images.length; j++) {
                const dist = images[i].position.distanceTo(images[j].position);
                if (dist < threshold) {
                    points.push(images[i].position);
                    points.push(images[j].position);
                }
            }
        }
        return points;
    }, [images]);

    if (lines.length === 0) return null;

    return (
        <lineSegments>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={lines.length}
                    array={new Float32Array(lines.flatMap(v => [v.x, v.y, v.z]))}
                    itemSize={3}
                />
            </bufferGeometry>
            <lineBasicMaterial color="white" transparent opacity={0.2} />
        </lineSegments>
    );
}

function Popup({ data, onClose }) {
    if (!data) return null;

    return (
        <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            zIndex: 1000,
            maxWidth: '300px',
            textAlign: 'center',
            backdropFilter: 'blur(5px)'
        }}>
            <button
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: '5px',
                    right: '10px',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '20px',
                    cursor: 'pointer'
                }}
            >
                &times;
            </button>
            <img
                src={data.url}
                alt={data.title}
                style={{ width: '100%', borderRadius: '5px', marginBottom: '10px' }}
            />
            <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{data.title}</h3>
            <p style={{ margin: '0', color: '#666' }}>{data.description}</p>
        </div>
    );
}

export default function ThreeSphere() {
    const [popupData, setPopupData] = useState(null);

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#111' }}>
            <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <SphereImages setPopupData={setPopupData} />
                <OrbitControls
                    enablePan={false}
                    enableZoom={true}
                    autoRotate={true}
                    autoRotateSpeed={0.5}
                    minPolarAngle={Math.PI / 2}
                    maxPolarAngle={Math.PI / 2}
                    minDistance={SPHERE_RADIUS * 1.5}
                    maxDistance={SPHERE_RADIUS * 10}
                />
            </Canvas>

            {popupData && (
                <Popup data={popupData} onClose={() => setPopupData(null)} />
            )}

            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                color: 'white',
                pointerEvents: 'none'
            }}>
                <p>Drag to rotate. Click image for details.</p>
            </div>
        </div>
    );
}
