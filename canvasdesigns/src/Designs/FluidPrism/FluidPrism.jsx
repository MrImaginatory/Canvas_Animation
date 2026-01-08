import React, { useEffect, useRef, useState } from 'react';
import './FluidPrism.css';

/**
 * SHADER SOURCE
 * High-Dimensional CPPN with:
 * - Fluid Prism (Radial Kaleidoscope + Viscous Refraction)
 * - Cyber-Organic Aesthetic
 * - YIQ Hue Shifting
 * - CRT Post-processing
 */
const vertexShaderSource = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision highp float;

  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_speed;
  uniform float u_warp;
  uniform float u_intensity;
  uniform float u_flux;
  uniform float u_prism;

  #define PI 3.14159265359

  // GLSL 1.0 tanh approximation
  float tanh_approx(float x) {
    float exp2x = exp(clamp(2.0 * x, -20.0, 20.0));
    return (exp2x - 1.0) / (exp2x + 1.0);
  }

  // Radial symmetry for Kaleidoscope
  vec2 radialMirror(vec2 uv, float segments) {
    float angle = atan(uv.y, uv.x);
    float r = length(uv);
    float segmentAngle = 2.0 * PI / segments;
    angle = mod(angle, segmentAngle);
    if (angle > segmentAngle * 0.5) angle = segmentAngle - angle;
    return vec2(cos(angle), sin(angle)) * r;
  }

  // Fluidic coordinate distortion
  vec2 fluidDistort(vec2 uv, float t, float strength) {
    uv.x += sin(uv.y * 3.0 + t) * 0.1 * strength;
    uv.y += cos(uv.x * 3.0 + t * 0.8) * 0.1 * strength;
    return uv;
  }

  vec3 rgb2yiq(vec3 c) {
    return vec3(
      0.299 * c.r + 0.587 * c.g + 0.114 * c.b,
      0.596 * c.r - 0.274 * c.g - 0.322 * c.b,
      0.211 * c.r - 0.523 * c.g + 0.312 * c.b
    );
  }

  vec3 yiq2rgb(vec3 c) {
    return vec3(
      c.r + 0.956 * c.g + 0.621 * c.b,
      c.r - 0.272 * c.g - 0.647 * c.b,
      c.r - 1.106 * c.g + 1.703 * c.b
    );
  }

  float cppn_layer(vec2 uv, float t, float warp) {
    float r = length(uv);
    float x1 = sin(uv.x * warp + t);
    float y1 = cos(uv.y * warp - t * 0.5);
    float r1 = sin(r * warp * 1.2 - t);
    
    float a = tanh_approx(x1 + y1 + r1);
    float b = sin((a + uv.x) * 3.0 + t);
    return b;
  }

  void main() {
    vec2 res = u_resolution.xy;
    vec2 uv = (gl_FragCoord.xy - 0.5 * res) / min(res.y, res.x);
    float t = u_time * u_speed;

    // --- LIQUID PHYSICS ---
    // Distort coordinates before mirroring to simulate fluid flow
    uv = fluidDistort(uv, t, u_prism);

    // --- KALEIDOSCOPE MIRRORING ---
    if (u_flux > 0.05) {
        float segs = floor(3.0 + u_flux * 9.0);
        uv = radialMirror(uv, segs);
    }

    float r = length(uv);
    
    // --- PRISM REFRACTION (Chromatic Aberration) ---
    // Separate sampling for RGB to create rainbow dispersion
    float dispersion = 0.04 * u_prism;
    float sigR = cppn_layer(uv * (1.0 + dispersion), t, u_warp);
    float sigG = cppn_layer(uv, t, u_warp);
    float sigB = cppn_layer(uv * (1.0 - dispersion), t, u_warp);

    // Reconstruct colors based on the "Liquid Organic" logic
    float organic = tanh_approx(exp(sin(r * 2.5 - t)) * sigG * 2.0);
    float highlight = pow(max(0.0, sigG), 8.0) * u_intensity;

    vec3 deepPurple = vec3(0.05, 0.0, 0.15);
    vec3 neonCyan = vec3(0.0, 1.0, 0.9);
    vec3 neonMagenta = vec3(1.0, 0.0, 0.5);

    vec3 color;
    color.r = mix(deepPurple.r, neonMagenta.r, organic + sigR * 0.3);
    color.g = mix(deepPurple.g, neonCyan.g, organic + sigG * 0.3);
    color.b = mix(deepPurple.b, neonCyan.b, organic + sigB * 0.3);
    
    // Add specular "wet" highlights
    color += vec3(0.8, 0.9, 1.0) * highlight * u_prism;

    // --- YIQ HUE SHIFT ---
    vec3 yiq = rgb2yiq(color);
    float hueRotation = t * 0.2;
    float cosA = cos(hueRotation);
    float sinA = sin(hueRotation);
    yiq.yz = mat2(cosA, -sinA, sinA, cosA) * yiq.yz;
    color = yiq2rgb(yiq);

    // --- POST-PROCESSING ---
    float scanline = sin(gl_FragCoord.y * 2.0) * 0.05;
    color -= scanline;
    
    float vignette = 1.0 - smoothstep(0.4, 1.8, length(uv));
    color *= vignette;

    gl_FragColor = vec4(color * u_intensity, 1.0);
  }
`;

export default function FluidPrism() {
  const canvasRef = useRef(null);
  const [speed, setSpeed] = useState(0.3);
  const [warp, setWarp] = useState(4.0);
  const [intensity, setIntensity] = useState(1.2);
  const [flux, setFlux] = useState(0.5);
  const [prism, setPrism] = useState(0.6);
  const [showHUD, setShowHUD] = useState(true);
  const requestRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const createShader = (gl, type, source) => {
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

    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, 'u_time');
    const uRes = gl.getUniformLocation(program, 'u_resolution');
    const uSpeed = gl.getUniformLocation(program, 'u_speed');
    const uWarp = gl.getUniformLocation(program, 'u_warp');
    const uIntensity = gl.getUniformLocation(program, 'u_intensity');
    const uFlux = gl.getUniformLocation(program, 'u_flux');
    const uPrism = gl.getUniformLocation(program, 'u_prism');

    const render = (time) => {
      const width = canvas.clientWidth * window.devicePixelRatio;
      const height = canvas.clientHeight * window.devicePixelRatio;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      gl.useProgram(program);
      gl.uniform1f(uTime, time * 0.001);
      gl.uniform2f(uRes, width, height);
      gl.uniform1f(uSpeed, speed);
      gl.uniform1f(uWarp, warp);
      gl.uniform1f(uIntensity, intensity);
      gl.uniform1f(uFlux, flux);
      gl.uniform1f(uPrism, prism);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [speed, warp, intensity, flux, prism]);

  return (
    <div className="fluid-prism-container">
      <canvas ref={canvasRef} className="fluid-prism-canvas" />

      {/* HUD Overlay */}
      <div className={`fluid-hud ${showHUD ? 'hud-visible' : 'hud-hidden'}`}>
        <div className="fluid-hud-box">
          <div className="fluid-hud-header">
            <h1 className="fluid-title">FLUID_PRISM.v4</h1>
            <p className="fluid-subtitle">Refractive Liquid Dynamics</p>
          </div>

          <div className="fluid-controls">
            <div>
              <div className="control-label">
                <span>PRISM_REFRACTION</span>
                <span className="accent-cyan">{(prism * 100).toFixed(0)}%</span>
              </div>
              <input type="range" min="0.0" max="1.0" step="0.01" value={prism} onChange={(e) => setPrism(parseFloat(e.target.value))} className="fluid-range accent-cyan" />
            </div>

            <div>
              <div className="control-label">
                <span>MIRROR_SEGMENTS</span>
                <span className="accent-magenta">{Math.floor(3 + flux * 9)}</span>
              </div>
              <input type="range" min="0.0" max="1.0" step="0.01" value={flux} onChange={(e) => setFlux(parseFloat(e.target.value))} className="fluid-range accent-magenta" />
            </div>

            <div>
              <div className="control-label">
                <span>NEURAL_WARP</span>
                <span>{warp.toFixed(1)}</span>
              </div>
              <input type="range" min="1.0" max="10.0" step="0.1" value={warp} onChange={(e) => setWarp(parseFloat(e.target.value))} className="fluid-range accent-white" />
            </div>

            <div>
              <div className="control-label">
                <span>VISCOSITY_FLOW</span>
                <span>{speed.toFixed(1)}x</span>
              </div>
              <input type="range" min="0.0" max="1.5" step="0.05" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="fluid-range accent-white" />
            </div>
          </div>

          <div className="fluid-footer">
            <span>SIG_STATUS: STABLE</span>
            <span>OS: LIQUID_KERN</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowHUD(!showHUD)}
        className="fluid-toggle-button"
      >
        {showHUD ? 'Close Terminal' : 'Interface'}
      </button>

      {/* Aesthetic Accents */}
      <div className="fluid-accents">
        [ COORDINATE_LOCKED ]<br/>
        [ SYSTEM_TIME_SYNCED ]
      </div>
    </div>
  );
}
