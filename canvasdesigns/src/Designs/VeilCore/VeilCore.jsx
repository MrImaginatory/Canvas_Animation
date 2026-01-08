import React, { useRef, useEffect, useState } from 'react';
import { Settings, Zap, Droplets, Monitor, Radio, Move } from 'lucide-react';
import './VeilCore.css';

// --- GLSL SHADERS ---
const VERTEX_SHADER = `
    attribute vec2 position;
    void main() {
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

const FRAGMENT_SHADER = `
    precision highp float;

    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uHueShift;
    uniform float uNoise;
    uniform float uScan;
    uniform float uScanFreq;
    uniform float uWarp;

    // YIQ Color Conversion for clean Hue Shifting
    mat3 rgb2yiq = mat3(0.299, 0.587, 0.114, 0.596, -0.274, -0.322, 0.211, -0.523, 0.312);
    mat3 yiq2rgb = mat3(1.0, 0.956, 0.621, 1.0, -0.272, -0.647, 1.0, -1.106, 1.703);

    float rand(vec2 c) {
        return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453);
    }

    vec3 hueShiftRGB(vec3 col, float deg) {
        vec3 yiq = rgb2yiq * col;
        float rad = radians(deg);
        float cosh = cos(rad), sinh = sin(rad);
        vec3 yiqShift = vec3(yiq.x, yiq.y * cosh - yiq.z * sinh, yiq.y * sinh + yiq.z * cosh);
        return clamp(yiq2rgb * yiqShift, 0.0, 1.0);
    }

    vec4 sigmoid(vec4 x) {
        return 1.0 / (1.0 + exp(-x));
    }

    // CPPN Architecture: A series of matrix transformations and activations
    vec4 cppn_fn(vec2 uv, float in0, float in1, float in2) {
        vec4 b6 = vec4(uv.x, uv.y, 0.4 + in0, 0.36 + in1);
        vec4 b7 = vec4(0.14 + in2, length(uv), 0.0, 0.0);

        // Layer 1
        vec4 b0 = mat4(vec4(6.54, -3.61, 0.75, -1.13), vec4(2.45, 3.16, 1.22, 0.06), vec4(-5.47, -6.15, 1.87, -4.77), vec4(6.03, -5.54, -0.9, 3.25)) * b6;
        b0 += mat4(vec4(0.84, -5.72, 3.97, 1.65), vec4(-0.24, 0.58, -1.76, -5.35), vec4(0,0,0,0), vec4(0,0,0,0)) * b7;
        b0 = sigmoid(b0 + vec4(0.21, 1.12, -1.79, 5.02));

        // Layer 2
        vec4 b1 = mat4(vec4(-3.35, -6.06, 0.55, -4.47), vec4(0.86, 1.74, 5.64, 1.61), vec4(2.49, -3.5, 1.71, 6.35), vec4(3.31, 8.2, 1.13, -1.16)) * b6;
        b1 += mat4(vec4(5.24, -13.03, 0.0, 15.87), vec4(2.98, 3.12, -0.89, -1.68), vec4(0,0,0,0), vec4(0,0,0,0)) * b7;
        b1 = sigmoid(b1 + vec4(-5.94, -6.57, -0.88, 1.54));

        // Deep connection layer
        vec4 b4 = mat4(vec4(5.21, -7.18, 2.72, 2.65), vec4(-5.6, -25.35, 4.06, 0.46), vec4(-10.57, 24.28, 21.1, 37.54), vec4(4.3, -1.96, 2.34, -1.37)) * b0;
        b4 += mat4(vec4(-17.65, -10.5, 2.25, 12.46), vec4(6.26, -502.75, -12.64, 0.91), vec4(-10.98, 20.74, -9.7, -0.76), vec4(5.38, 1.48, -4.19, -4.84)) * b1;
        b4 = sigmoid(b4 + vec4(-7.67, 15.92, 1.32, -1.66));

        // Final color output
        vec4 res = mat4(vec4(1.67, 1.38, 2.96, 0), vec4(-1.88, -1.48, -3.59, 0), vec4(-1.32, -1.09, -2.31, 0), vec4(0.26, 0.23, 0.44, 0)) * b4;
        res = sigmoid(res + vec4(-1.54, -3.61, 0.24, 0));
        
        return vec4(res.xyz, 1.0);
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy / uResolution.xy) * 2.0 - 1.0;
        uv.x *= uResolution.x / uResolution.y;
        
        // Warping distortion
        uv += uWarp * vec2(sin(uv.y * 5.0 + uTime * 0.4), cos(uv.x * 5.0 + uTime * 0.4)) * 0.1;
        
        // Compute CPPN texture
        vec4 col = cppn_fn(uv, 0.1 * sin(0.3 * uTime), 0.1 * sin(0.69 * uTime), 0.1 * sin(0.44 * uTime));
        
        // Post-Processing
        col.rgb = hueShiftRGB(col.rgb, uHueShift);
        
        float scanline_val = sin(gl_FragCoord.y * uScanFreq) * 0.5 + 0.5;
        col.rgb *= 1.0 - (scanline_val * scanline_val) * uScan;
        
        col.rgb += (rand(gl_FragCoord.xy + uTime) - 0.5) * uNoise;
        
        gl_FragColor = vec4(clamp(col.rgb, 0.0, 1.0), 1.0);
    }
`;

const VeilCore = () => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    // State for shader uniforms
    const [config, setConfig] = useState({
        hueShift: 180,
        noise: 0.05,
        scanlines: 0.2,
        speed: 0.6,
        scanFreq: 1.5,
        warp: 0.3
    });

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const gl = canvas.getContext('webgl');
        if (!gl) return;

        // --- Shader Setup ---
        const createShader = (type, source) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error(gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };

        const program = gl.createProgram();
        gl.attachShader(program, createShader(gl.VERTEX_SHADER, VERTEX_SHADER));
        gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
        gl.linkProgram(program);
        gl.useProgram(program);

        // --- Geometry Setup ---
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

        const posAttrib = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(posAttrib);
        gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);

        // --- Uniform Locations ---
        const uniforms = {
            uTime: gl.getUniformLocation(program, 'uTime'),
            uResolution: gl.getUniformLocation(program, 'uResolution'),
            uHueShift: gl.getUniformLocation(program, 'uHueShift'),
            uNoise: gl.getUniformLocation(program, 'uNoise'),
            uScan: gl.getUniformLocation(program, 'uScan'),
            uScanFreq: gl.getUniformLocation(program, 'uScanFreq'),
            uWarp: gl.getUniformLocation(program, 'uWarp')
        };

        let animationFrame;
        const startTime = performance.now();

        const render = () => {
            const time = (performance.now() - startTime) / 1000;
            
            // Handle Resizing
            const dpr = window.devicePixelRatio || 1;
            const rect = containerRef.current.getBoundingClientRect();
            if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                gl.viewport(0, 0, canvas.width, canvas.height);
            }

            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);

            // Update Uniforms
            gl.uniform1f(uniforms.uTime, time * config.speed);
            gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
            gl.uniform1f(uniforms.uHueShift, config.hueShift);
            gl.uniform1f(uniforms.uNoise, config.noise);
            gl.uniform1f(uniforms.uScan, config.scanlines);
            gl.uniform1f(uniforms.uScanFreq, config.scanFreq);
            gl.uniform1f(uniforms.uWarp, config.warp);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
            animationFrame = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrame);
            gl.deleteProgram(program);
            gl.deleteBuffer(buffer);
        };
    }, [config]);

    const ControlRow = ({ label, icon: Icon, value, min, max, step, onChange }) => (
        <div className="control-row">
            <div className="control-header">
                <div className="control-label">
                    <Icon size={14} />
                    <span>{label}</span>
                </div>
                <span className="control-value">
                    {value.toFixed(2)}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="control-input"
            />
        </div>
    );

    return (
        <div ref={containerRef} className="veil-core-container">
            {/* Background Canvas */}
            <canvas
                ref={canvasRef}
                className="veil-core-canvas"
            />

            {/* Glassmorphism UI Panel */}
            <div 
                className={`ui-panel ${
                    isMenuOpen ? 'ui-panel-open' : 'ui-panel-closed'
                }`}
            >
                <div className={`
                    ui-panel-content
                    ${isMenuOpen ? 'content-open' : 'content-closed'}
                `}>
                    {isMenuOpen ? (
                        <>
                            <div className="menu-header">
                                <h2 className="menu-title">
                                    <Zap size={18} className="text-cyan" />
                                    VEIL CORE
                                </h2>
                                <button 
                                    onClick={() => setIsMenuOpen(false)}
                                    className="close-button"
                                >
                                    <Settings size={18} />
                                </button>
                            </div>

                            <ControlRow 
                                label="HUE SHIFT" icon={Droplets} min={0} max={360} step={1}
                                value={config.hueShift} onChange={(v) => setConfig(c => ({...c, hueShift: v}))}
                            />
                            <ControlRow 
                                label="SPEED" icon={Zap} min={0} max={2} step={0.01}
                                value={config.speed} onChange={(v) => setConfig(c => ({...c, speed: v}))}
                            />
                            <ControlRow 
                                label="DISTORTION" icon={Move} min={0} max={1} step={0.01}
                                value={config.warp} onChange={(v) => setConfig(c => ({...c, warp: v}))}
                            />
                            <ControlRow 
                                label="SCANLINES" icon={Monitor} min={0} max={1} step={0.01}
                                value={config.scanlines} onChange={(v) => setConfig(c => ({...c, scanlines: v}))}
                            />
                            <ControlRow 
                                label="SCAN FREQ" icon={Radio} min={0.1} max={5} step={0.1}
                                value={config.scanFreq} onChange={(v) => setConfig(c => ({...c, scanFreq: v}))}
                            />
                            <ControlRow 
                                label="NOISE" icon={Zap} min={0} max={0.3} step={0.001}
                                value={config.noise} onChange={(v) => setConfig(c => ({...c, noise: v}))}
                            />

                            <div className="footer-divider">
                                <p className="footer-text">
                                    Neural Network Shader Engine
                                </p>
                            </div>
                        </>
                    ) : (
                        <button 
                            onClick={() => setIsMenuOpen(true)}
                            className="open-button"
                        >
                            <Settings size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* HUD Overlay */}
            <div className="absolute bottom-8 left-8 z-10 pointer-events-none select-none">
                <div className="flex items-center gap-4 text-white/20">
                    <div className="h-px w-12 bg-white/20"></div>
                    <div className="text-[10px] tracking-[0.3em] font-light">SYSTEM_STABLE // ART_GEN_09</div>
                </div>
            </div>
        </div>
    );
};

export default VeilCore;
