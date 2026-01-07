import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RefreshCw, Maximize2, Palette, Sparkles, Moon } from 'lucide-react';
import './LiquidRainbow.css';

/**
 * GLSL Fragment Shader for the Liquid Rainbow Effect
 * Updated with a u_darkness uniform to control background depth.
 */
const fragmentShaderSource = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_intensity;
  uniform float u_scale;
  uniform float u_gloss;
  uniform float u_darkness;

  vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(dot(hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                   dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
               mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                   dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
  }

  vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.00, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float ratio = u_resolution.x / u_resolution.y;
    uv.x *= ratio;

    vec2 p = uv * u_scale;
    float t = u_time * 0.2;

    vec2 q = vec2(0.0);
    q.x = noise(p + vec2(0.0, t));
    q.y = noise(p + vec2(1.0, t * 0.5));

    vec2 r = vec2(0.0);
    r.x = noise(p + 4.0 * q + vec2(1.7, 9.2) + 0.15 * t);
    r.y = noise(p + 4.0 * q + vec2(8.3, 2.8) + 0.126 * t);

    float f = noise(p + 4.0 * r);

    vec3 color = palette(f + t * 0.1 + dot(q, r) * 0.5);

    float gloss = pow(max(0.0, f), 3.0) * u_gloss;
    color += gloss * vec3(1.0, 1.0, 1.0);

    // Apply darkness: Higher u_darkness means more area is pulled to black
    float mask = smoothstep(u_darkness - 0.5, u_darkness + 0.5, f + 0.5);
    color = mix(vec3(0.0), color * u_intensity, mask);
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

const vertexShaderSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export default function LiquidRainbow() {
  const canvasRef = useRef(null);
  const requestRef = useRef();
  const [isPlaying, setIsPlaying] = useState(true);
  const [scale, setScale] = useState(3.0);
  const [speed, setSpeed] = useState(0.8);
  const [intensity, setIntensity] = useState(1.2);
  const [gloss, setGloss] = useState(0.5);
  const [darkness, setDarkness] = useState(0.2); 
  
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
          console.error('Shader compile info: ', gl.getShaderInfoLog(shader));
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
        console.error('Program link info: ', gl.getProgramInfoLog(program));
        return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const resLoc = gl.getUniformLocation(program, 'u_resolution');
    const intLoc = gl.getUniformLocation(program, 'u_intensity');
    const scaleLoc = gl.getUniformLocation(program, 'u_scale');
    const glossLoc = gl.getUniformLocation(program, 'u_gloss');
    const darkLoc = gl.getUniformLocation(program, 'u_darkness');

    let lastTime = 0;

    const render = () => {
      if (isPlaying) {
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
      gl.uniform1f(intLoc, intensity);
      gl.uniform1f(scaleLoc, scale);
      gl.uniform1f(glossLoc, gloss);
      gl.uniform1f(darkLoc, darkness);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, speed, intensity, scale, gloss, darkness]);

  return (
    <div className="liquid-rainbow-container">
      <canvas ref={canvasRef} className="liquid-rainbow-canvas" />

      <div className="liquid-rainbow-ui-overlay">
        <div className="liquid-rainbow-card">
          <div className="liquid-rainbow-header">
            <div>
              <div className="liquid-rainbow-badge">
                <Sparkles size={18} />
                <span>Dark Mode Optimized</span>
              </div>
              <h1 className="liquid-rainbow-title">Liquid Rainbow</h1>
              <p className="liquid-rainbow-subtitle">Deep Space Edition</p>
            </div>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="liquid-rainbow-play-btn"
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>
          </div>

          <div className="liquid-rainbow-grid">
            <ControlSlider label="Viscosity" icon={<Maximize2 size={14}/>} value={scale} min={1} max={10} step={0.1} onChange={setScale} />
            <ControlSlider label="Fluidity" icon={<RefreshCw size={14}/>} value={speed} min={0} max={3} step={0.1} onChange={setSpeed} />
            <ControlSlider label="Vibrancy" icon={<Palette size={14}/>} value={intensity} min={0.5} max={3} step={0.1} onChange={setIntensity} />
            <ControlSlider label="Darkness" icon={<Moon size={14}/>} value={darkness} min={0} max={1} step={0.01} onChange={setDarkness} />
          </div>
          
          <div className="liquid-rainbow-footer">
            <span>Physical Shader Engine</span>
            <div className="liquid-rainbow-indicators">
              <div className="liquid-dot liquid-dot-1"></div>
              <div className="liquid-dot liquid-dot-2"></div>
              <div className="liquid-dot liquid-dot-3"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlSlider({ label, icon, value, min, max, step, onChange }) {
  return (
    <div className="liquid-rainbow-control-group">
      <div className="liquid-rainbow-label-row">
        <label className="liquid-rainbow-label">
          {icon} {label}
        </label>
        <span className="liquid-rainbow-value">{value.toFixed(2)}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step} 
        value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
        className="liquid-rainbow-range"
      />
    </div>
  );
}
