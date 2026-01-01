import React, { useRef, useEffect } from 'react';

// --- Helper Functions & Classes ---

function minmax(x, min, max) {
    if (x < min) return min;
    else if (x > max) return max;
    else return x;
}

class V3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.px = 0;
        this.py = 0;
    }

    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
    }

    multiply(n) {
        this.x *= n;
        this.y *= n;
        this.z *= n;
    }

    divide(n) {
        this.x /= n;
        this.y /= n;
        this.z /= n;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
}

class Color {
    constructor(r = 255, g = 255, b = 255, a = 1) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
        this._str = this.getColor();
    }

    getColor() {
        if (this.a >= 1) return `rgb(${this.r},${this.g},${this.b})`;
        else return `rgba(${this.r},${this.g},${this.b},${this.a})`;
    }

    setAlpha(a) {
        this.a = minmax(a, 0, 1);
        this._str = this.getColor();
    }

    toString() {
        return this._str;
    }
}

class Particle {
    constructor(x, y, z, color, gV) {
        this.v = new V3(x, y, z);
        this.oldV = new V3(x, y, z);
        this.gV = gV || null;
        this.color = color || new Color();
        this.velocity = new V3();
        this.length = 0;
    }

    move() {
        let dx = this.gV.x - this.v.x;
        let dy = this.gV.y - this.v.y;
        let dz = this.gV.z - this.v.z;
        let d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (d < 0.5) {
            let rnd = Math.random() * 3;
            dx = this.velocity.x + rnd * dx / d;
            dy = this.velocity.y + rnd * dy / d;
            dz = this.velocity.z + rnd * dz / d;
        } else {
            dx = this.velocity.x + 0.2 * dx / d;
            dy = this.velocity.y + 0.2 * dy / d;
            dz = this.velocity.z + 0.2 * dz / d;
        }

        this.velocity.set(dx, dy, dz);
        this.velocity.multiply(0.975);

        this.oldV.x = this.v.x;
        this.oldV.y = this.v.y;
        this.oldV.z = this.v.z;
        this.oldV.px = this.v.px;
        this.oldV.py = this.v.py;
        this.v.add(this.velocity);
    }
}

class M3 {
    constructor(n11 = 1, n12 = 0, n13 = 0, n21 = 0, n22 = 1, n23 = 0, n31 = 0, n32 = 0, n33 = 1) {
        this.n11 = n11; this.n12 = n12; this.n13 = n13;
        this.n21 = n21; this.n22 = n22; this.n23 = n23;
        this.n31 = n31; this.n32 = n32; this.n33 = n33;
    }

    rot(rx, ry, rz) {
        const cosx = Math.cos(rx), sinx = Math.sin(rx);
        const cosy = Math.cos(ry), siny = Math.sin(ry);
        const cosz = Math.cos(rz), sinz = Math.sin(rz);

        this.n11 = cosz * cosy;
        this.n12 = sinz * cosy;
        this.n13 = -siny;

        this.n21 = cosz * siny * sinx - sinz * cosx;
        this.n22 = sinz * siny * sinx + cosx * cosz;
        this.n23 = sinx * cosy;

        this.n31 = cosz * siny * cosx + sinz * sinx;
        this.n32 = sinz * siny * cosx - cosz * sinx;
        this.n33 = cosx * cosy;
    }

    xV3(v) {
        const vx = v.x, vy = v.y, vz = v.z;
        v.x = this.n11 * vx + this.n12 * vy + this.n13 * vz;
        v.y = this.n21 * vx + this.n22 * vy + this.n23 * vz;
        v.z = this.n31 * vx + this.n32 * vy + this.n33 * vz;
        return v;
    }

    xParticle(p) {
        const v = p.v, oldV = p.oldV;
        oldV.x = v.x;
        oldV.y = v.y;
        oldV.z = v.z;
        oldV.px = v.px;
        oldV.py = v.py;
        this.xV3(v);
        return p;
    }
}

export default function ParticleSwarm({ width = '100vw', height = '100vh' }) {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const stateRef = useRef({
        particles: [],
        rotMatrix: new M3(),
        gV: new V3(),
        cnt: 0,
        mouseOver: false,
        mouseDown: false,
        mouseX: 0,
        mouseY: 0,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        width: 0,
        height: 0,
        cx: 0,
        cy: 0
    });

    useEffect(() => {
        const initialize = () => {
            const container = containerRef.current;
            const canvas = canvasRef.current;
            if (!container || !canvas) return;

            const rect = container.getBoundingClientRect();
            stateRef.current.width = rect.width;
            stateRef.current.height = rect.height;
            stateRef.current.cx = rect.width / 2;
            stateRef.current.cy = rect.height / 2;

            // Handle High DPI displays
            const dpr = Math.min(window.devicePixelRatio, 2) || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
            
            const context = canvas.getContext('2d');
            context.scale(dpr, dpr);

            // Constants
            const NUM_BRANCHES = 32;
            const NUM_PER_BRANCH = 16;
            const NUM_PARTICLES = NUM_BRANCHES * NUM_PER_BRANCH;
            const MAX = 20;

            const { gV } = stateRef.current; // access shared gravity vector

            // Init Particles
            stateRef.current.particles = [];
            for (let i = 0; i < NUM_PARTICLES; i++) {
                const x = Math.random() * MAX - MAX / 2;
                const y = Math.random() * MAX - MAX / 2;
                const z = Math.random() * MAX - MAX / 2;
                const color = new Color(
                    Math.floor(Math.random() * 255),
                    Math.floor(Math.random() * 255),
                    Math.floor(Math.random() * 255),
                    0.5 + 0.5 * Math.random()
                );
                const particle = new Particle(x, y, z, color, gV);
                stateRef.current.particles.push(particle);
            }

            // Init old positions
            for (let i = 0; i < NUM_PARTICLES; i++) {
                const particle = stateRef.current.particles[i];
                const zoom = 600 / (50 + particle.v.z);
                const px = (particle.v.x * zoom + stateRef.current.cx);
                const py = (particle.v.y * zoom + stateRef.current.cy);
                particle.v.px = px;
                particle.v.py = py;
            }

            return context;
        };
        
        const context = initialize();
        if (!context) return;

        let animationFrameId;

        const loop = () => {
            const state = stateRef.current;
            const { 
                mouseDown, 
                mouseOver, 
                particles, 
                rotMatrix, 
                gV,
                width, 
                height, 
                cx, 
                cy,
                mouseX, 
                mouseY 
            } = state;

            // Determine rotation
            if (mouseDown) {
                // Adjust speed based on canvas size for consistency
                const speedX = 0.05 * Math.PI / width;
                const speedY = 0.05 * Math.PI / height;

                state.rotX = minmax((mouseY) * speedY, -0.05, 0.05);
                state.rotY = minmax((-mouseX) * speedX, -0.05, 0.05);
                state.rotZ = 0;
                rotMatrix.rot(state.rotX, state.rotY, state.rotZ);
                state.cnt += 0.02;
            }
            
            // Draw
            context.fillStyle = 'rgba(0,0,0,0.25)';
            context.fillRect(0, 0, width, height);

            const PI2 = Math.PI * 2;

            for (let i = 0; i < particles.length; i++) {
                const particle = particles[i];

                if (mouseDown) {
                    rotMatrix.xParticle(particle);
                } else {
                    particle.move();
                }

                const zoom = 600 / (50 + particle.v.z);
                const px = (particle.v.x * zoom + cx);
                const py = (particle.v.y * zoom + cy);
                particle.v.px = px;
                particle.v.py = py;

                // Draw line if moving fast, dot if slow/stopped
                // But legacy code visual logic: 
                /*
                var lx = particle.v.px - particle.oldV.px;
                var ly = particle.v.py - particle.oldV.py;
                particle.length = Math.sqrt( lx*lx + ly*ly );
                ...
                if (particle.length<1) ... circle
                else ... line
                */

                const lx = particle.v.px - particle.oldV.px;
                const ly = particle.v.py - particle.oldV.py;
                particle.length = Math.sqrt(lx * lx + ly * ly);

                const size = 1;

                context.beginPath();
                if (particle.length < 1) {
                    context.fillStyle = particle.color.toString();
                    context.arc(px, py, size / 2, 0, PI2, true);
                    context.fill();
                } else {
                    context.strokeStyle = particle.color.toString();
                    context.lineWidth = size;
                    context.moveTo(particle.oldV.px, particle.oldV.py);
                    context.lineTo(px, py);
                    context.stroke();
                }
                context.closePath();
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        loop();

        // Event Handlers
        const onResize = () => {
             const context = initialize(); // Re-init sizes
        };
        
        const onMouseMove = (e) => {
             const rect = containerRef.current.getBoundingClientRect();
             const mx = e.clientX - rect.left - stateRef.current.cx;
             const my = e.clientY - rect.top - stateRef.current.cy;
             stateRef.current.mouseX = mx;
             stateRef.current.mouseY = my;
             stateRef.current.gV.x = mx / 12;
             stateRef.current.gV.y = my / 12;
        };

        const onMouseDown = () => { stateRef.current.mouseDown = true; };
        const onMouseUp = () => { stateRef.current.mouseDown = false; };
        const onMouseOver = () => { 
            stateRef.current.mouseOver = true; 
            stateRef.current.gV.z = 0;
            stateRef.current.cnt = 0;
        };
        const onMouseOut = () => {
            stateRef.current.mouseOver = false;
            stateRef.current.mouseDown = false;
            stateRef.current.gV.x = 0;
            stateRef.current.gV.y = 0;
            stateRef.current.gV.z = 0;
            stateRef.current.cnt = 0;
        };

        window.addEventListener('resize', onResize);
        const container = containerRef.current;
        container.addEventListener('mousemove', onMouseMove);
        container.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mouseup', onMouseUp); 
        container.addEventListener('mouseover', onMouseOver);
        container.addEventListener('mouseout', onMouseOut);


        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', onResize);
            container.removeEventListener('mousemove', onMouseMove);
            container.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mouseup', onMouseUp);
            container.removeEventListener('mouseover', onMouseOver);
            container.removeEventListener('mouseout', onMouseOut);
        };

    }, []);

    return (
        <div 
            ref={containerRef} 
            style={{ 
                width: width, 
                height: height, 
                backgroundColor: '#000', 
                position: 'relative', 
                overflow: 'hidden',
                cursor: 'pointer'
            }}
        >
            <div style={{
                position: 'absolute',
                top: 20,
                left: 20,
                color: '#fff',
                fontFamily: 'Raleway, sans-serif',
                pointerEvents: 'none',
                zIndex: 10
            }}>
                <p>Move your mouse ^^ click for 3D rotation...</p>
            </div>
            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
    );
}
