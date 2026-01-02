import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import Proton from 'three.proton.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';

const base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAJkSURBVHjaxJeJbusgEEW94S1L//83X18M2MSuLd2pbqc4wZGqRLrKBsyZhQHny7Jk73xVL8xpVhWrcmiB5lX+6GJ5YgQ2owbAm8oIwH1VgKZUmGcRqKGGPgtEQQAzGR8hQ59fAmhJHSAagigJ4E7GPWRXOYC6owAd1JM6wDQPADyMWUqZRMqmAojHp1Vn6EQQEgUNMJLnUjMyJsM49wygBkAPw9dVFwXRkncCIIW3GRgoTQUZn6HxCMAFEFd8TwEQ78X4rHbILoAUmeT+RFG4UhQ6MiIAE4W/UsYFjuVjAIa2nIY4q1R0GFtQWG3E84lqw2GO2QOoCKBVu0BAPgDSU0eUDjjQenNkV/AW/pWChhpMTelo1a64AOKM30vk18GzTHXCNtI/Knz3DFBgsUqBGIjTInXRY1yA9xkVoqW5tVq3pDR9A0hfF5BSARmVnh7RMDCaIdcNgbPBkgzn1Bu+SfIEFSpSBmkxyrMicb0fAEuCZrWnN89veA/4XcakrPcjBWzkTuLjlbfTQPOlBhz+HwkqqPXmPQDdrQItxE1moGof1S74j/8txk8EHhTQrAE8qlwfqS5yukm1x/rAJ9Jiaa6nyATqD78aUVBhFo8b1V4DdTXdCW+IxA1zB4JhiOhZMEWO1HqnvdoHZ4FAMIhV9REF8FiUm0jsYPEJx/Fm/N8OhH90HI9YRHesWbXXZwAShU8qThe7H8YAuJmw5yOd989uRINKRTJAhoF8jbqrHKfeCYdIISZfSq26bk/K+yO3YvfKrVgiwQBHnwt8ynPB25+M8hceTt/ybPhnryJ78+tLgAEAuCFyiQgQB30AAAAASUVORK5CYII=";

export default function ProtonEffect() {
  const containerRef = useRef(null);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let proton, emitter1, emitter2, R;
    let camera, scene, renderer, controls;
    let animationFrameId;

    let ctha = 0;
    let tha = 0;

    init();

    function init() {
        addScene();
        addControls();
        addLights();
        addStars();
        addProton();
        animate();
    }

    function addScene() {
        camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
        camera.position.z = 500;
        
        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0xffffff, 1, 10000);

        renderer = new THREE.WebGLRenderer();
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        window.addEventListener('resize', onWindowResize, false);
    }

    function addControls() {
        controls = new TrackballControls(camera, renderer.domElement);
        controls.rotateSpeed = 1.0;
        controls.zoomSpeed = 1.2;
        controls.panSpeed = 0.8;
        controls.noZoom = false;
        controls.noPan = false;
        controls.staticMoving = true;
        controls.dynamicDampingFactor = 0.3;
    }

    function addLights() {
        const ambientLight = new THREE.AmbientLight(0x101010);
        scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 2, 1000, 1);
        pointLight.position.set(0, 200, 200);
        scene.add(pointLight);
    }

    function addStars() {
        // Modern replacement for THREE.Geometry which is deprecated
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        
        for (let i = 0; i < 10000; i++) {
            const x = THREE.MathUtils.randFloatSpread(2000);
            const y = THREE.MathUtils.randFloatSpread(2000);
            const z = THREE.MathUtils.randFloatSpread(2000);
            positions.push(x, y, z);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        const particles = new THREE.Points(geometry, new THREE.PointsMaterial({
            color: 0x888888
        }));
        
        scene.add(particles);
    }

    function addProton() {
        const ProtonClass = Proton.default || Proton; 
        proton = new ProtonClass();

        R = 70;
        emitter1 = createEmitter(R, 0, '#4F1500', '#0029FF');
        emitter2 = createEmitter(-R, 0, '#004CFE', '#6600FF');

        proton.addEmitter(emitter1);
        proton.addEmitter(emitter2);
        
        // Pass scene directly if Proton.SpriteRender expects it
        // Or check library usage. The snippet said 'new Proton.SpriteRender(scene)'.
        // Assuming Proton is correctly imported.
        proton.addRender(new ProtonClass.SpriteRender(scene));
    }

    function createEmitter(x, y, color1, color2) {
        const ProtonClass = Proton.default || Proton; 
        const emitter = new ProtonClass.Emitter();
        emitter.rate = new ProtonClass.Rate(new ProtonClass.Span(5, 7), new ProtonClass.Span(.01, .02));
        emitter.addInitialize(new ProtonClass.Mass(1));
        emitter.addInitialize(new ProtonClass.Life(2));
        emitter.addInitialize(new ProtonClass.Body(createSprite()));
        emitter.addInitialize(new ProtonClass.Radius(80));
        emitter.addInitialize(new ProtonClass.V(200, new ProtonClass.Vector3D(0, 0, -1), 0));

        emitter.addBehaviour(new ProtonClass.Alpha(1, 0));
        emitter.addBehaviour(new ProtonClass.Color(color1, color2));
        emitter.addBehaviour(new ProtonClass.Scale(1, 0.5));
        
        // ScreenZone might depend on camera/renderer
        emitter.addBehaviour(new ProtonClass.CrossZone(new ProtonClass.ScreenZone(camera, renderer), 'dead'));

        emitter.addBehaviour(new ProtonClass.Force(0, 0, -20));

        emitter.p.x = x;
        emitter.p.y = y;
        emitter.emit();

        return emitter;
    }

    function createSprite() {
        const map = new THREE.TextureLoader().load(base64);
        const material = new THREE.SpriteMaterial({
            map: map,
            color: 0xff0000,
            blending: THREE.AdditiveBlending,
            fog: true
        });
        return new THREE.Sprite(material);
    }

    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        animateEmitter();
        render();
    }

    function animateEmitter() {
        tha += .13;
        if(emitter1 && emitter1.p) {
            emitter1.p.x = R * Math.cos(tha);
            emitter1.p.y = R * Math.sin(tha);
        }
        
        if(emitter2 && emitter2.p) {
            emitter2.p.x = R * Math.cos(tha + Math.PI / 2);
            emitter2.p.y = R * Math.sin(tha + Math.PI / 2);
        }
    }

    function render() {
        if(proton) proton.update();
        if(renderer && scene && camera) renderer.render(scene, camera);
        
        // Camera orbit logic
        ctha += .02;
        if (camera) {
            camera.lookAt(scene.position);
            camera.position.x = Math.sin(ctha) * 500;
            camera.position.z = Math.cos(ctha) * 500;
            camera.position.y = Math.sin(ctha) * 500;
        }
    }

    function onWindowResize() {
        if (camera && renderer) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
    
    // Cleanup
    const currentContainer = container;
    return () => {
        window.removeEventListener('resize', onWindowResize);
        cancelAnimationFrame(animationFrameId);
        
        if (renderer && currentContainer) {
            currentContainer.removeChild(renderer.domElement);
            renderer.dispose();
        }
        if (proton) {
            proton.destroy();
        }
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#fff' }}>
        <div style={{ position: 'absolute', right: 20, top: 10, color: '#fff', zIndex: 1, pointerEvents: 'none' }}>
            This demo is using the three.proton engine
        </div>
    </div>
  );
}
