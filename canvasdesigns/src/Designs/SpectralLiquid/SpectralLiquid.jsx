import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RefreshCw, Maximize2, Palette, Sparkles, Moon } from 'lucide-react';
import './SpectralLiquid.css';

/**
 * GLSL Fragment Shader for the Spectral Liquid Effect
 * Uses the user-provided spectral_colour function and iterative warping.
 */
const fragmentShaderSource = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_intensity;
  uniform float u_scale;
  uniform float u_gloss;
  uniform float u_darkness;

  // Provided Spectral Color Function
  // RGB <0,1> <- lambda l <400,700> [nm]
  vec3 spectral_colour(float l) {
    float r=0.0, g=0.0, b=0.0;
    if ((l>=400.0)&&(l<410.0)) { float t=(l-400.0)/(410.0-400.0); r= +(0.33*t)-(0.20*t*t); }
    else if ((l>=410.0)&&(l<475.0)) { float t=(l-410.0)/(475.0-410.0); r=0.14 -(0.13*t*t); }
    else if ((l>=545.0)&&(l<595.0)) { float t=(l-545.0)/(595.0-545.0); r= +(1.98*t)-( t*t); }
    else if ((l>=595.0)&&(l<650.0)) { float t=(l-595.0)/(650.0-595.0); r=0.98+(0.06*t)-(0.40*t*t); }
    else if ((l>=650.0)&&(l<700.0)) { float t=(l-650.0)/(700.0-650.0); r=0.65-(0.84*t)+(0.20*t*t); }
    
    if ((l>=415.0)&&(l<475.0)) { float t=(l-415.0)/(475.0-415.0); g= +(0.80*t*t); }
    else if ((l>=475.0)&&(l<590.0)) { float t=(l-475.0)/(590.0-475.0); g=0.8 +(0.76*t)-(0.80*t*t); }
    else if ((l>=585.0)&&(l<639.0)) { float t=(l-585.0)/(639.0-585.0); g=0.82-(0.80*t); }
    
    if ((l>=400.0)&&(l<475.0)) { float t=(l-400.0)/(475.0-400.0); b= +(2.20*t)-(1.50*t*t); }
    else if ((l>=475.0)&&(l<560.0)) { float t=(l-475.0)/(560.0-475.0); b=0.7 -( t)+(0.30*t*t); }

    return vec3(r, g, b);
  }

  void main() {
    // Coordinate normalization
    vec2 p = (2.0 * gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    
    // Applying user scale
    p *= u_scale;

    // Iterative warping loop provided by user
    for(int i = 0; i < 8; i++) {
        vec2 newp = vec2(
            p.y + cos(p.x + u_time) - sin(p.y * cos(u_time * 0.2)),
            p.x - sin(p.y - u_time) - cos(p.x * sin(u_time * 0.3))
        );
        p = newp;
    }

    // Map warped p.y to spectral range (400-700nm)
    vec3 color = spectral_colour(p.y * 50.0 + 500.0 + sin(u_time * 0.6));
    
    // Apply intensity and gloss
    color *= u_intensity;
    float gloss = pow(max(0.0, dot(color, vec3(0.33))), 3.0) * u_gloss;
    color += gloss;

    // Applying darkness mask based on color brightness
    float brightness = dot(color, vec3(0.299, 0.587, 0.114));
    float mask = smoothstep(u_darkness - 0.5, u_darkness + 0.5, brightness);
    color = mix(vec3(0.0), color, mask);

    gl_FragColor = vec4(color, 1.0);
  }
`;

const vertexShaderSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export default function SpectralLiquid() {
  const canvasRef = useRef(null);
  const requestRef = useRef();
  const [isPlaying, setIsPlaying] = useState(true);
  const [scale, setScale] = useState(2.0);
  const [speed, setSpeed] = useState(0.8);
  const [intensity, setIntensity] = useState(1.0);
  const [gloss, setGloss] = useState(0.3);
  const [darkness, setDarkness] = useState(0.1);
  
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
        console.error('Shader compile info:', gl.getShaderInfoLog(shader));
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
    <div className="spectral-liquid-container">
      <canvas ref={canvasRef} className="spectral-liquid-canvas" />

      <div className="spectral-liquid-ui-overlay">
        <div className="spectral-liquid-card">
          <div className="spectral-liquid-header">
            <div>
              <div className="spectral-liquid-badge">
                <Sparkles size={18} />
                <span>Spectral Refraction</span>
              </div>
              <h1 className="spectral-liquid-title">Spectral Fluid</h1>
              <p className="spectral-liquid-subtitle">Wavelength Optimized Rendering</p>
            </div>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="spectral-liquid-play-btn"
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>
          </div>

          <div className="spectral-liquid-grid">
            <ControlSlider label="Zoom / Scale" icon={<Maximize2 size={14}/>} value={scale} min={0.5} max={5} step={0.1} onChange={setScale} />
            <ControlSlider label="Warp Speed" icon={<RefreshCw size={14}/>} value={speed} min={0} max={3} step={0.1} onChange={setSpeed} />
            <ControlSlider label="Luminance" icon={<Palette size={14}/>} value={intensity} min={0.1} max={3} step={0.1} onChange={setIntensity} />
            <ControlSlider label="Void Depth" icon={<Moon size={14}/>} value={darkness} min={0} max={1} step={0.01} onChange={setDarkness} />
          </div>
          
          <div className="spectral-liquid-footer">
            <span>Iterative Warp Engine (8x)</span>
            <div className="spectral-liquid-colors">
              <div className="spectral-dot spectral-dot-red"></div>
              <div className="spectral-dot spectral-dot-green"></div>
              <div className="spectral-dot spectral-dot-blue"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlSlider({ label, icon, value, min, max, step, onChange }) {
  return (
    <div className="spectral-liquid-control-group">
      <div className="spectral-liquid-label-row">
        <label className="spectral-liquid-label">
          {icon} {label}
        </label>
        <span className="spectral-liquid-value">{value.toFixed(2)}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step} 
        value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
        className="spectral-liquid-range"
      />
    </div>
  );
}
