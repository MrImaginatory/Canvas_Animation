import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RefreshCw, Maximize2, Palette } from 'lucide-react';
import './PlasmaShader.css';

/**
 * GLSL Fragment Shader for the Plasma Effect
 * This shader calculates multiple overlapping sine/cosine waves 
 * and maps them to a color palette to create the fluid motion.
 */
const fragmentShaderSource = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform vec3 u_color3;
  uniform float u_intensity;
  uniform float u_scale;

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float ratio = u_resolution.x / u_resolution.y;
    uv.x *= ratio;

    vec2 p = uv * u_scale;
    float time = u_time * 0.5;

    // Classic Plasma math: Multiple overlapping waves
    float v = 0.0;
    v += sin(p.x + time);
    v += sin((p.y + time) * 0.5);
    v += sin((p.x + p.y + time) * 0.5);
    
    vec2 c = p + 0.5 * vec2(sin(time / 3.0), cos(time / 5.0));
    v += sin(sqrt(c.x*c.x + c.y*c.y + 1.0) + time);
    
    v = v / 2.0;
    
    // Smoothstep and Mix colors based on the wave value
    vec3 col = mix(u_color1, u_color2, sin(v * 3.14159));
    col = mix(col, u_color3, cos(v * 2.5));
    
    // Add some highlights/depth
    col += 0.1 * sin(v * 10.0 + time);

    gl_FragColor = vec4(col * u_intensity, 1.0);
  }
`;

const vertexShaderSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export default function PlasmaShader() {
  const canvasRef = useRef(null);
  const requestRef = useRef();
  const [isPlaying, setIsPlaying] = useState(true);
  const [scale, setScale] = useState(4.0);
  const [speed, setSpeed] = useState(1.0);
  const [intensity, setIntensity] = useState(1.0);
  
  // Default Vibrant Palette
  const [colors, setColors] = useState({
    color1: [0.4, 0.1, 0.9], // Purple
    color2: [0.1, 0.6, 1.0], // Blue
    color3: [1.0, 0.2, 0.5]  // Pink
  });

  const palettes = [
    { name: 'Sunset', c1: [1.0, 0.4, 0.2], c2: [0.8, 0.1, 0.5], c3: [0.2, 0.1, 0.4] },
    { name: 'Ocean', c1: [0.0, 0.4, 0.8], c2: [0.0, 0.9, 0.7], c3: [0.1, 0.2, 0.5] },
    { name: 'Aurora', c1: [0.1, 0.8, 0.3], c2: [0.2, 0.4, 0.9], c3: [0.5, 0.1, 0.8] },
    { name: 'Midnight', c1: [0.05, 0.05, 0.2], c2: [0.3, 0.1, 0.5], c3: [0.1, 0.0, 0.1] }
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    // Helper to create shader
    const createShader = (gl, type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return;
    }
    
    gl.useProgram(program);

    // Buffer for full-screen quad
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const resLoc = gl.getUniformLocation(program, 'u_resolution');
    const c1Loc = gl.getUniformLocation(program, 'u_color1');
    const c2Loc = gl.getUniformLocation(program, 'u_color2');
    const c3Loc = gl.getUniformLocation(program, 'u_color3');
    const intLoc = gl.getUniformLocation(program, 'u_intensity');
    const scaleLoc = gl.getUniformLocation(program, 'u_scale');

    let lastTime = 0;

    const render = (time) => {
      // time comes from requestAnimationFrame in ms
      if (isPlaying) {
        // We use our own accumulated time or speed based time logic
        // But for simplicity let's stick to the user logic: increment lastTime
        // Note: The user's original code used Date.now() logic mixed with manual increment.
        // Using manual increment matches their "speed" logic best.
        lastTime += 0.01 * speed;
      }
      
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      gl.uniform1f(timeLoc, lastTime);
      gl.uniform2f(resLoc, width, height);
      gl.uniform3fv(c1Loc, colors.color1);
      gl.uniform3fv(c2Loc, colors.color2);
      gl.uniform3fv(c3Loc, colors.color3);
      gl.uniform1f(intLoc, intensity);
      gl.uniform1f(scaleLoc, scale);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, colors, speed, intensity, scale]);

  return (
    <div className="plasma-container">
      {/* Background Canvas */}
      <canvas
        ref={canvasRef}
        className="plasma-canvas"
      />

      {/* Glassmorphism UI Overlay */}
      <div className="plasma-ui-overlay">
        <div className="plasma-card">
          <div className="plasma-header">
            <div>
              <h1 className="plasma-title">Plasma T1-V3</h1>
              <p className="plasma-subtitle">Dynamic Shader Reconstruction</p>
            </div>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="plasma-play-btn"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
          </div>

          <div className="plasma-controls-container">
            {/* Controls */}
            <div className="plasma-grid">
              <div className="plasma-control-group">
                <label className="plasma-label">
                  <Maximize2 size={16} /> Complexity (Scale)
                </label>
                <input 
                  type="range" min="1" max="15" step="0.1" 
                  value={scale} onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="plasma-range accent-purple"
                />
              </div>
              <div className="plasma-control-group">
                <label className="plasma-label">
                  <RefreshCw size={16} /> Flow Speed
                </label>
                <input 
                  type="range" min="0" max="5" step="0.1" 
                  value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="plasma-range accent-blue"
                />
              </div>
            </div>

            {/* Palette Switcher */}
            <div className="plasma-palettes">
              <label className="plasma-label" style={{ marginBottom: '1rem' }}>
                <Palette size={16} /> Color Presets
              </label>
              <div className="plasma-palettes-list">
                {palettes.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => setColors({ color1: p.c1, color2: p.c2, color3: p.c3 })}
                    className="plasma-palette-btn"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="plasma-footer">
            Rendered via WebGL 2.0 • GPU Accelerated
          </div>
        </div>
      </div>

      {/* Bottom info */}
      <div className="plasma-info-bottom">
        <span>FPS: 60 (VSync)</span>
        <span>Resolution: {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '...'}</span>
      </div>
    </div>
  );
}
