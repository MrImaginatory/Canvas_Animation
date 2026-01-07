import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RefreshCw, Zap, Sparkles, Binary, Activity } from 'lucide-react';
import './HyperDimensionCore.css';

/**
 * GLSL Fragment Shader for "Hyper-Dimension Core"
 * Uses Kaleidoscopic space folding (KIFS) and Raymarching.
 */
const fragmentShaderSource = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_intensity;
  uniform float u_scale;
  uniform float u_fold;
  uniform float u_darkness;

  mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
  }

  // The core Fractal Mapping function
  float map(vec3 p) {
    p.xz *= rot(u_time * 0.1);
    p.xy *= rot(u_time * 0.15);
    
    float scale = 1.0;
    float dist = 100.0;
    
    // Folding space 6 times to create complex fractal geometry
    for (int i = 0; i < 6; i++) {
        p = abs(p) - u_fold; // Mirror folding
        
        // Rotate and scale inside the loop for recursive complexity
        p.xy *= rot(0.5);
        p.yz *= rot(0.3);
        
        float r2 = dot(p, p);
        float k = 1.2 / clamp(r2, 0.2, 1.0);
        p *= k;
        scale *= k;
      
        dist = min(dist, length(p.xy) / scale); // Orbit trap for detailing
    }
    
    // Create a base shape (Menger-like structure)
    float box = (length(p) - 1.5) / scale;
    return box;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
    
    vec3 ro = vec3(0, 0, -4.5); // Camera origin
    vec3 rd = normalize(vec3(uv, 1.8)); // Ray direction
    
    float t = 0.0;
    float glow = 0.0;
    
    // Raymarching loop
    for(int i = 0; i < 50; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        if(d < 0.001 || t > 15.0) break;
        t += d * 0.7; // March forward
        glow += (0.1 / (d * 20.0 + 1.0)); // Accumulate light glow near surfaces
    }
    
    vec3 p_final = ro + rd * t;
    
    // Dynamic palette shift
    vec3 baseColor = 0.5 + 0.5 * cos(u_time * 0.5 + vec3(0, 2, 4) + t * 0.2);
    vec3 coreColor = 0.5 + 0.5 * sin(vec3(0.1, 0.5, 0.9) * t - u_time);
    
    // Combine glow and surface color
    vec3 color = mix(baseColor, coreColor, 0.5) * glow * u_intensity;
    
    // Add sharp highlights
    color += pow(glow * 0.1, 2.0) * vec3(1.0, 0.8, 0.9);

    // Apply distance fog/void mask
    float fog = exp(-t * u_darkness);
    color *= fog;
    
    // Subtle vignette
    color *= 1.0 - length(uv) * 0.5;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const vertexShaderSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export default function HyperDimensionCore() {
  const canvasRef = useRef(null);
  const requestRef = useRef();
  const [isPlaying, setIsPlaying] = useState(true);
  const [complexity, setComplexity] = useState(1.4);
  const [speed, setSpeed] = useState(0.6);
  const [intensity, setIntensity] = useState(1.8);
  const [darkness, setDarkness] = useState(0.25);
  
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
        console.error('Program link info:', gl.getProgramInfoLog(program));
        return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const resLoc = gl.getUniformLocation(program, 'u_resolution');
    const intLoc = gl.getUniformLocation(program, 'u_intensity');
    const foldLoc = gl.getUniformLocation(program, 'u_fold');
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
      gl.uniform1f(foldLoc, complexity);
      gl.uniform1f(darkLoc, darkness);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, speed, intensity, complexity, darkness]);

  return (
    <div className="hyper-core-container">
      <canvas ref={canvasRef} className="hyper-core-canvas" />

      {/* Glass Panel UI */}
      <div className="hyper-core-ui-overlay">
        <div className="hyper-core-card">
          <div className="hyper-core-header">
            <div>
              <div className="hyper-core-badge">
                <Activity size={16} />
                <span>Quantum Singularity Engine</span>
              </div>
              <h1 className="hyper-core-title">Hyper-Core</h1>
              <p className="hyper-core-subtitle">Recursive Space-Folding Fractal</p>
            </div>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="hyper-core-play-btn"
            >
              {isPlaying ? <Pause size={28} /> : <Play size={28} />}
            </button>
          </div>

          <div className="hyper-core-grid">
            <UISlider label="Geometry Complexity" icon={<Binary size={14}/>} value={complexity} min={0.5} max={2.5} step={0.01} onChange={setComplexity} traceClass="trace-emerald" />
            <UISlider label="Temporal Speed" icon={<RefreshCw size={14}/>} value={speed} min={0} max={2.5} step={0.1} onChange={setSpeed} traceClass="trace-blue" />
            <UISlider label="Light Saturation" icon={<Zap size={14}/>} value={intensity} min={0.5} max={4} step={0.1} onChange={setIntensity} traceClass="trace-yellow" />
            <UISlider label="Event Horizon" icon={<Sparkles size={14}/>} value={darkness} min={0.05} max={0.8} step={0.01} onChange={setDarkness} traceClass="trace-purple" />
          </div>
          
          <div className="hyper-core-footer">
            <div className="hyper-core-footer-text">KIFS-ITERATION-VI</div>
            <div className="hyper-core-dots">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="hyper-dot"></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Aesthetic data stream */}
      <div className="hyper-core-stream">
        <div className="hyper-core-stream-text">System.status.stable</div>
        <div className="hyper-core-stream-text">Folding.geometry.recursive</div>
      </div>
    </div>
  );
}

function UISlider({ label, icon, value, min, max, step, onChange, traceClass }) {
  return (
    <div className="hyper-core-control-group">
      <div className="hyper-core-label-row">
        <label className="hyper-core-label">
          {icon} {label}
        </label>
        <span className="hyper-core-value">{value.toFixed(2)}</span>
      </div>
      <div className="hyper-core-slider-container">
        <input 
          type="range" min={min} max={max} step={step} 
          value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
          className="hyper-core-range"
        />
        <div 
          className={`hyper-core-progress-trace ${traceClass}`}
          style={{ width: `${((value - min) / (max - min)) * 100}%` }}
        />
      </div>
    </div>
  );
}
