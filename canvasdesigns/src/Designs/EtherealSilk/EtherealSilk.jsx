import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RefreshCw, Wind, Layers, Waves, Move, Sparkles } from 'lucide-react';
import './EtherealSilk.css';

/**
 * GLSL Fragment Shader for "Ethereal Silk"
 * This shader uses high-frequency trigonometric interference to create 
 * the appearance of woven light and fine fabric textures.
 */
const fragmentShaderSource = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform float u_intensity;
  uniform float u_complexity;
  uniform float u_thickness;
  uniform float u_darkness;

  mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
  }

  void main() {
    // Normalize coordinates
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
    
    // Mouse Interaction: Displace the "wind" center
    vec2 m = u_mouse * 0.5;
    uv -= m * 0.2;

    float finalPattern = 0.0;
    
    // Create overlapping layers of "silk"
    for(float i = 1.0; i < 8.0; i++) {
        if(i > u_complexity * 8.0) break;

        vec2 p = uv;
        
        // Dynamic warping logic
        float t = u_time * 0.2 + (i * 100.0);
        
        p.x += 0.5 / i * sin(i * 3.0 * p.y + t + sin(t * 0.5)) + m.x;
        p.y += 0.5 / i * cos(i * 3.0 * p.x + t + cos(t * 0.5)) + m.y;
        
        // Calculate the "thread" or "ribbon" line
        float dist = abs(p.x + p.y);
        float line = u_thickness / (dist * 20.0);
        
        // Add interference patterns (Moire)
        line *= abs(sin(t * 0.2 + i * p.x * 5.0));
        
        finalPattern += line;
    }

    // Color Palette: Ethereal Pearl, Deep Sea, and Sunset Gold
    vec3 col1 = vec3(0.1, 0.4, 0.9); // Deep Blue
    vec3 col2 = vec3(0.9, 0.3, 0.6); // Soft Pink
    vec3 col3 = vec3(0.2, 0.9, 0.7); // Teal
    
    // Blend colors based on time and pattern intensity
    vec3 color = mix(col1, col2, sin(u_time * 0.3) * 0.5 + 0.5);
    color = mix(color, col3, cos(u_time * 0.5) * 0.5 + 0.5);
    
    // Apply pattern and intensity
    vec3 finalColor = color * finalPattern * u_intensity;
    
    // Apply "Darkness" (Void Fog)
    float mask = smoothstep(1.5, 0.0, length(uv));
    finalColor *= mask * (1.0 - u_darkness);
    
    // Soft vignette
    finalColor *= 1.2 - length(uv);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const vertexShaderSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export default function EtherealSilk() {
  const canvasRef = useRef(null);
  const requestRef = useRef();
  
  // States for interactive controls
  const [isPlaying, setIsPlaying] = useState(true);
  const [complexity, setComplexity] = useState(0.6);
  const [speed, setSpeed] = useState(0.8);
  const [intensity, setIntensity] = useState(1.2);
  const [thickness, setThickness] = useState(0.15);
  const [darkness, setDarkness] = useState(0.1);

  // Mouse interactivity
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [targetMousePos, setTargetMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const smoothMouse = () => {
      setMousePos(prev => ({
        x: prev.x + (targetMousePos.x - prev.x) * 0.05,
        y: prev.y + (targetMousePos.y - prev.y) * 0.05
      }));
      requestRef.current = requestAnimationFrame(smoothMouse);
    };
    requestRef.current = requestAnimationFrame(smoothMouse);
    return () => cancelAnimationFrame(requestRef.current);
  }, [targetMousePos]);

  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    setTargetMousePos({ x, y });
  };

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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const u = {
      time: gl.getUniformLocation(program, 'u_time'),
      res: gl.getUniformLocation(program, 'u_resolution'),
      mouse: gl.getUniformLocation(program, 'u_mouse'),
      int: gl.getUniformLocation(program, 'u_intensity'),
      comp: gl.getUniformLocation(program, 'u_complexity'),
      thick: gl.getUniformLocation(program, 'u_thickness'),
      dark: gl.getUniformLocation(program, 'u_darkness'),
    };

    let lastTime = 0;

    const render = () => {
      if (isPlaying) lastTime += 0.01 * speed;
      
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
      }

      gl.uniform1f(u.time, lastTime);
      gl.uniform2f(u.res, w, h);
      gl.uniform2f(u.mouse, mousePos.x, mousePos.y);
      gl.uniform1f(u.int, intensity);
      gl.uniform1f(u.comp, complexity);
      gl.uniform1f(u.thick, thickness);
      gl.uniform1f(u.dark, darkness);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const loop = () => {
      render();
      requestRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, speed, intensity, complexity, thickness, darkness, mousePos]);

  return (
    <div 
      className="ethereal-silk-container"
      onMouseMove={handleMouseMove}
    >
      <canvas ref={canvasRef} className="ethereal-silk-canvas" />

      {/* Zen Interface */}
      <div className="ethereal-silk-ui-wrapper">
        <div className="ethereal-silk-card">
          
          <div className="ethereal-silk-header">
            <div>
              <div className="ethereal-silk-badge">
                <Sparkles size={14} />
                <span>Premium Aesthetics</span>
              </div>
              <h1 className="ethereal-silk-title">Ethereal Silk</h1>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="ethereal-silk-play-btn"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
            </div>
          </div>

          <div className="ethereal-silk-controls">
            <UISlider label="Weave Complexity" icon={<Layers size={14}/>} value={complexity} min={0.1} max={1.0} step={0.01} onChange={setComplexity} />
            <UISlider label="Flow Velocity" icon={<Wind size={14}/>} value={speed} min={0} max={2.0} step={0.1} onChange={setSpeed} />
            <UISlider label="Thread Gloss" icon={<Waves size={14}/>} value={intensity} min={0.1} max={3.0} step={0.1} onChange={setIntensity} />
          </div>

          <div className="ethereal-silk-footer">
             <div className="ethereal-silk-footer-left">
                <div className="ethereal-silk-footer-badge">
                  <Move size={12} className="text-white/20" />
                  <span>Interactive Mesh</span>
                </div>
             </div>
             <div className="ethereal-silk-runtime">
                System Runtime: {isPlaying ? 'Fluid' : 'Suspended'}
             </div>
          </div>
        </div>
      </div>
      
      {/* Decorative corners */}
      <div className="ethereal-silk-corner-tl" />
      <div className="ethereal-silk-corner-br" />
    </div>
  );
}

function UISlider({ label, icon, value, min, max, step, onChange }) {
  return (
    <div className="ethereal-silk-control-group">
      <div className="ethereal-silk-label-row">
        <label className="ethereal-silk-label">
          {icon} {label}
        </label>
        <span className="ethereal-silk-value">{Math.round(value * 100)}%</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step} 
        value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
        className="ethereal-silk-range"
      />
    </div>
  );
}
