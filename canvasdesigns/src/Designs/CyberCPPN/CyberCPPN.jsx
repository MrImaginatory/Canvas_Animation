import React, { useEffect, useRef, useState } from 'react';
import './CyberCPPN.css';

/**
 * SHADER SOURCE
 * Implementation of a High-Dimensional CPPN with YIQ Hue Shifting and CRT effects.
 * Fixed 'tanh' missing in GLSL 1.0 by implementing a custom approximation.
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

  // GLSL 1.0 does not have tanh. Implementing approximation: (e^x - e^-x) / (e^x + e^-x)
  float tanh_approx(float x) {
    float exp2x = exp(2.0 * x);
    return (exp2x - 1.0) / (exp2x + 1.0);
  }

  // RGB to YIQ conversion for sophisticated hue rotation
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

  // CPPN Component functions
  float pulse(float x, float p) {
    return pow(0.5 + 0.5 * sin(x), p);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
    float r = length(uv);
    float angle = atan(uv.y, uv.x);
    float t = u_time * u_speed;

    // --- HIGH-DIMENSIONAL CPPN LAYERS ---
    // Layer 1: Spatial coordinates + time
    float x1 = sin(uv.x * u_warp + t);
    float y1 = cos(uv.y * u_warp - t * 0.5);
    float r1 = sin(r * u_warp * 1.5 - t);

    // Layer 2: Deep non-linear combinations
    float a = tanh_approx(x1 + y1 + r1);
    float b = sin((a + uv.x) * 4.0 + t);
    float c = cos((b - uv.y) * 3.0 - t * 0.7);
    
    // Layer 3: Organic "fleshiness" vs Cyber "grid"
    float organic = tanh_approx(exp(sin(r * 2.0 - t)) * a * 2.0);
    float cyber = abs(sin(b * 10.0)) * pulse(c * 5.0, 2.0);

    // --- COLOR MAPPING ---
    // Base palette: Deep Purples and Cyber Neons
    vec3 deepPurple = vec3(0.15, 0.0, 0.3);
    vec3 neonCyan = vec3(0.0, 1.0, 0.9);
    vec3 neonMagenta = vec3(1.0, 0.1, 0.6);

    vec3 color = mix(deepPurple, neonCyan, organic);
    color = mix(color, neonMagenta, cyber * 0.6);
    color += neonCyan * pulse(a * 8.0 + t, 12.0) * 0.3; // Neural firing highlights

    // --- YIQ HUE SHIFT ---
    vec3 yiq = rgb2yiq(color);
    float hueRotation = t * 0.3;
    float cosA = cos(hueRotation);
    float sinA = sin(hueRotation);
    // Rotate in the IQ plane
    vec2 rotatedIQ = mat2(cosA, -sinA, sinA, cosA) * yiq.yz;
    yiq.yz = rotatedIQ;
    color = yiq2rgb(yiq);

    // --- POST-PROCESSING ---
    // CRT Scanlines
    float scanline = sin(gl_FragCoord.y * 1.8) * 0.06;
    color -= scanline;
    
    // VCR/CRT "Glow" & Vignette
    float vignette = 1.0 - smoothstep(0.4, 1.5, r);
    color *= vignette;
    
    // Subtle bloom
    color += max(vec3(0.0), color - 0.7) * 0.5;

    gl_FragColor = vec4(color * u_intensity, 1.0);
  }
`;

export default function CyberCPPN() {
  const canvasRef = useRef(null);
  const [speed, setSpeed] = useState(0.5);
  const [warp, setWarp] = useState(4.5);
  const [intensity, setIntensity] = useState(1.0);
  const [showHUD, setShowHUD] = useState(true);
  const requestRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    // Helper to create shaders
    const createShader = (gl, type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
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

    // Full screen quad
    const vertices = new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]);

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
  }, [speed, warp, intensity]);

  return (
    <div className="cyber-cppn-container">
      <canvas
        ref={canvasRef}
        className="cyber-cppn-canvas"
        style={{ touchAction: 'none' }}
      />

      {/* Minimalist HUD */}
      <div className={`cyber-hud-container ${showHUD ? 'hud-visible' : 'hud-hidden'}`}>
        <div className="cyber-hud-box">
          <div className="cyber-hud-header">
            <span className="cyber-hud-title">CORE::GEN_CPPN</span>
            <span className="cyber-hud-status">● ACTIVE</span>
          </div>

          <div className="cyber-hud-controls">
            <div>
              <div className="control-label-row">
                <span>WARP_FREQ</span>
                <span>{warp.toFixed(1)}Hz</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="12.0"
                step="0.1"
                value={warp}
                onChange={(e) => setWarp(parseFloat(e.target.value))}
                className="cyber-range-input accent-cyan"
              />
            </div>

            <div>
              <div className="control-label-row">
                <span>TEMPORAL_VEL</span>
                <span>{speed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="cyber-range-input accent-magenta"
              />
            </div>

            <div>
              <div className="control-label-row">
                <span>SIGNAL_AMP</span>
                <span>{(intensity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={intensity}
                onChange={(e) => setIntensity(parseFloat(e.target.value))}
                className="cyber-range-input accent-white"
              />
            </div>
          </div>

          <div className="cyber-hud-footer">
            <p>SHDR_MDL: CPPN_CYBER_ORG_V2</p>
            <p>HUE_SPC: YIQ_TRANSFORM_ROT</p>
            <p>POST_FX: CRT_SCAN_V1</p>
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setShowHUD(!showHUD)}
        className="cyber-toggle-button"
      >
        {showHUD ? 'Minimize UI' : 'Interface'}
      </button>

      {/* Decorative Corner Brackets */}
      <div className="corner-bracket top-left" />
      <div className="corner-bracket top-right" />
      <div className="corner-bracket bottom-left" />
      <div className="corner-bracket bottom-right" />
    </div>
  );
}
