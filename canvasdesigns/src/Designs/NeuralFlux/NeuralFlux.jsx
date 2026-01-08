import React, { useEffect, useRef, useState } from 'react';
import './NeuralFlux.css';

/**
 * SHADER SOURCE
 * Implementation of a High-Dimensional CPPN with YIQ Hue Shifting, CRT effects,
 * and a new "Quantum Flux" dimensional folding effect.
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

  // GLSL 1.0 does not have tanh. Implementing approximation.
  float tanh_approx(float x) {
    float exp2x = exp(clamp(2.0 * x, -20.0, 20.0));
    return (exp2x - 1.0) / (exp2x + 1.0);
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

  float pulse(float x, float p) {
    return pow(0.5 + 0.5 * sin(x), p);
  }

  // CPPN Kernel - extracted for chromatic aberration sampling
  float cppn_layer(vec2 uv, float t, float warp, float offset) {
    float r = length(uv);
    float x1 = sin(uv.x * warp + t + offset);
    float y1 = cos(uv.y * warp - t * 0.5);
    float r1 = sin(r * warp * 1.5 - t);
    
    float a = tanh_approx(x1 + y1 + r1);
    float b = sin((a + uv.x) * 4.0 + t);
    return b;
  }

  void main() {
    vec2 res = u_resolution.xy;
    vec2 uv = (gl_FragCoord.xy - 0.5 * res) / min(res.y, res.x);
    float t = u_time * u_speed;

    // --- QUANTUM FLUX: DIMENSIONAL FOLDING ---
    // This creates kaleidoscopic mirroring and "breaks" in space
    if (u_flux > 0.1) {
        float fold = u_flux * 2.0;
        uv = abs(uv); // Mirroring
        uv -= 0.25 * fold;
        float angle = t * 0.2 * u_flux;
        mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        uv *= rot;
        uv = abs(uv);
    }

    float r = length(uv);
    
    // --- SAMPLE CHANNELS SEPARATELY (Chromatic Aberration) ---
    // We sample the CPPN logic at slightly different spatial offsets for R, G, B
    float aberration = 0.015 * u_intensity * (1.0 + u_flux);
    float sigR = cppn_layer(uv + vec2(aberration, 0.0), t, u_warp, 0.0);
    float sigG = cppn_layer(uv, t, u_warp, 0.1);
    float sigB = cppn_layer(uv - vec2(aberration, 0.0), t, u_warp, 0.2);

    // Reconstruct signals into organic/cyber components
    float organic = tanh_approx(exp(sin(r * 2.0 - t)) * sigG * 2.0);
    float cyber = abs(sin(sigG * 10.0)) * pulse(sigR * 5.0, 2.0);

    // --- COLOR MAPPING ---
    vec3 deepPurple = vec3(0.1, 0.0, 0.25);
    vec3 neonCyan = vec3(0.0, 1.0, 0.85);
    vec3 neonMagenta = vec3(1.0, 0.05, 0.55);

    // Apply signals to channels for color fringing
    vec3 color;
    color.r = mix(deepPurple.r, neonMagenta.r, organic + sigR * 0.2);
    color.g = mix(deepPurple.g, neonCyan.g, organic + sigG * 0.2);
    color.b = mix(deepPurple.b, neonCyan.b, organic + sigB * 0.4);
    
    color = mix(color, neonMagenta, cyber * 0.5);
    color += neonCyan * pulse(sigG * 8.0 + t, 15.0) * 0.4;

    // --- YIQ HUE SHIFT ---
    vec3 yiq = rgb2yiq(color);
    float hueRotation = t * 0.25;
    float cosA = cos(hueRotation);
    float sinA = sin(hueRotation);
    yiq.yz = mat2(cosA, -sinA, sinA, cosA) * yiq.yz;
    color = yiq2rgb(yiq);

    // --- POST-PROCESSING ---
    float scanline = sin(gl_FragCoord.y * 2.0) * 0.07;
    color -= scanline;
    
    // Edge Darkening
    float vignette = 1.0 - smoothstep(0.3, 1.6, r);
    color *= vignette;
    
    // Glitch/Flux Flickering
    float flicker = 1.0 - (sin(t * 50.0) * 0.02 * u_flux);
    color *= flicker;

    gl_FragColor = vec4(color * u_intensity, 1.0);
  }
`;

export default function NeuralFlux() {
  const canvasRef = useRef(null);
  const [speed, setSpeed] = useState(0.4);
  const [warp, setWarp] = useState(3.5);
  const [intensity, setIntensity] = useState(1.1);
  const [flux, setFlux] = useState(0.0);
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
  }, [speed, warp, intensity, flux]);

  return (
    <div className="neural-flux-container">
      <canvas ref={canvasRef} className="neural-flux-canvas" />

      {/* Minimalist HUD */}
      <div className={`neural-hud ${showHUD ? 'hud-visible' : 'hud-hidden'}`}>
        <div className="neural-hud-box">
          <div className="neural-hud-header">
            <span className="neural-title">NEURAL_FLUX_OS</span>
            <div className="neural-status">
              <div className="status-dot" />
              <span>Synced</span>
            </div>
          </div>

          <div className="neural-controls">
            <div>
              <div className="control-label">
                <span>DIMENSIONAL_WARP</span>
                <span>{warp.toFixed(1)}</span>
              </div>
              <input type="range" min="1.0" max="10.0" step="0.1" value={warp} onChange={(e) => setWarp(parseFloat(e.target.value))} className="neural-range accent-cyan" />
            </div>

            <div>
              <div className="control-label">
                <span>QUANTUM_FLUX (FOLD)</span>
                <span className={flux > 0.5 ? "text-magenta" : ""}>{flux > 0 ? "STABLE_BREAK" : "OFF"}</span>
              </div>
              <input type="range" min="0.0" max="1.0" step="0.01" value={flux} onChange={(e) => setFlux(parseFloat(e.target.value))} className="neural-range accent-magenta" />
            </div>

            <div>
              <div className="control-label">
                <span>TEMPORAL_DRIVE</span>
                <span>{speed.toFixed(1)}x</span>
              </div>
              <input type="range" min="0.0" max="2.0" step="0.1" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="neural-range accent-white" />
            </div>
          </div>

          <div className="neural-footer">
            <p className="flex justify-between"><span>SIGNAL_TYPE</span> <span>CPPN_V3</span></p>
            <p className="flex justify-between"><span>PARITY_CHK</span> <span>PASSED</span></p>
            <p className="flex justify-between"><span>ABERRATION</span> <span>{flux > 0.1 ? 'ACTIVE' : 'IDLE'}</span></p>
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowHUD(!showHUD)}
        className="neural-toggle-button"
      >
        {showHUD ? 'Deactivate HUD' : 'System Terminal'}
      </button>

      {/* Frame Elements */}
      <div className="neural-frame" />
      <div className="neural-line top-right" />
      <div className="neural-line bottom-left" />
    </div>
  );
}
