import React, { useRef, useEffect } from 'react';

const vsSource = `
    precision mediump float;

    varying vec2 vUv;
    attribute vec2 a_position;

    void main() {
        vUv = .5 * (a_position + 1.);
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

const fsSource = `
    precision mediump float;

    varying vec2 vUv;
    uniform float u_time;
    uniform float u_ratio;
    uniform vec2 u_pointer_position;
    uniform float u_scroll_progress;

    vec2 rotate(vec2 uv, float th) {
        return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
    }

    float neuro_shape(vec2 uv, float t, float p) {
        vec2 sine_acc = vec2(0.);
        vec2 res = vec2(0.);
        float scale = 8.;

        for (int j = 0; j < 15; j++) {
            uv = rotate(uv, 1.);
            sine_acc = rotate(sine_acc, 1.);
            vec2 layer = uv * scale + float(j) + sine_acc - t;
            sine_acc += sin(layer) + 2.4 * p;
            res += (.5 + .5 * cos(layer)) / scale;
            scale *= (1.2);
        }
        return res.x + res.y;
    }

    void main() {
        vec2 uv = .5 * vUv;
        uv.x *= u_ratio;

        vec2 pointer = vUv - u_pointer_position;
        pointer.x *= u_ratio;
        float p = clamp(length(pointer), 0., 1.);
        p = .5 * pow(1. - p, 2.);

        float t = .001 * u_time;
        vec3 color = vec3(0.);

        float noise = neuro_shape(uv, t, p);

        noise = 1.2 * pow(noise, 3.);
        noise += pow(noise, 10.);
        noise = max(.0, noise - .5);
        noise *= (1. - length(vUv - .5));

        color = normalize(vec3(.2, .5 + .4 * cos(3. * u_scroll_progress), .5 + .5 * sin(3. * u_scroll_progress)));

        color = color * noise;

        gl_FragColor = vec4(color, noise);
    }
`;

export default function NeuralNoise({ width = '100%', height = '100%' }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        const canvasEl = canvasRef.current;
        const container = containerRef.current;
        if (!canvasEl || !container) return;

        const gl = canvasEl.getContext("webgl") || canvasEl.getContext("experimental-webgl");

        if (!gl) {
            console.error("WebGL is not supported by your browser.");
            return;
        }

        function createShader(gl, sourceCode, type) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, sourceCode);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }

            return shader;
        }

        const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER);
        const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER);

        function createShaderProgram(gl, vertexShader, fragmentShader) {
            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);

            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                console.error("Unable to initialize the shader program: " + gl.getProgramInfoLog(program));
                return null;
            }

            return program;
        }

        const shaderProgram = createShaderProgram(gl, vertexShader, fragmentShader);
        if (!shaderProgram) return;

        function getUniforms(program) {
            let uniforms = {};
            let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
            for (let i = 0; i < uniformCount; i++) {
                let uniformName = gl.getActiveUniform(program, i).name;
                uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
            }
            return uniforms;
        }

        const uniforms = getUniforms(shaderProgram);

        const vertices = new Float32Array([-1., -1., 1., -1., -1., 1., 1., 1.]);

        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        gl.useProgram(shaderProgram);

        const positionLocation = gl.getAttribLocation(shaderProgram, "a_position");
        gl.enableVertexAttribArray(positionLocation);

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        const pointer = {
            x: 0,
            y: 0,
            tX: 0,
            tY: 0,
        };

        let animationFrameId;

        function render() {
            const currentTime = performance.now();

            pointer.x += (pointer.tX - pointer.x) * .2;
            pointer.y += (pointer.tY - pointer.y) * .2;

            gl.uniform1f(uniforms.u_time, currentTime);
            // Adapt pointer position to standard top-left 0,0 coords if needed, 
            // but the shader expects 0-1 range.
            // Screen width/height might need to be passed if the canvas is full screen
            // window.innerWidth used in original, let's use canvas dimensions
            const w = canvasEl.width / window.devicePixelRatio; 
            const h = canvasEl.height / window.devicePixelRatio;

            gl.uniform2f(uniforms.u_pointer_position, pointer.x / w, 1 - pointer.y / h);
            gl.uniform1f(uniforms.u_scroll_progress, window.pageYOffset / (2 * h)); // Keep scroll behavior if needed

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            animationFrameId = requestAnimationFrame(render);
        }

        function resizeCanvas() {
             // Use container dimensions
            const rect = container.getBoundingClientRect();
            const devicePixelRatio = Math.min(window.devicePixelRatio, 2);
            
            canvasEl.width = rect.width * devicePixelRatio;
            canvasEl.height = rect.height * devicePixelRatio;
            
            // Adjust styles for correct display size
            canvasEl.style.width = `${rect.width}px`;
            canvasEl.style.height = `${rect.height}px`;

            gl.uniform1f(uniforms.u_ratio, canvasEl.width / canvasEl.height);
            gl.viewport(0, 0, canvasEl.width, canvasEl.height);
        }
        
        // Initial resize
        resizeCanvas();

        const handleResize = () => resizeCanvas();
        window.addEventListener("resize", handleResize);

        const updateMousePosition = (eX, eY) => {
            // Need relative position to the canvas if it's not full screen?
            // The logic assumes window coordinates effectively in the original 
            // but if we want it reusable, we probably want relative to viewport or handling it cleanly.
            // For now, let's stick to clientX/Y which areviewport relative, which matches basic mouse tracking.
            // If the component is small, we might want to offset by bounding client rect.
            // But let's check the shader logic: "pointer = vUv - u_pointer_position".
            // vUv is 0-1. u_pointer_position is fed as x/width. So it expects normalized coords.
            // If we use e.clientX, that is window relative. If the canvas is not at 0,0, we might need adjustment.
            // For now, I'll calculate relative to the canvas element.
            const rect = canvasEl.getBoundingClientRect();
            pointer.tX = eX - rect.left;
            pointer.tY = eY - rect.top;
        };

        const handlePointerMove = (e) => {
            updateMousePosition(e.clientX, e.clientY);
        };
        const handleTouchMove = (e) => {
             updateMousePosition(e.targetTouches[0].clientX, e.targetTouches[0].clientY);
        };
        const handleClick = (e) => {
             updateMousePosition(e.clientX, e.clientY);
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("touchmove", handleTouchMove);
        window.addEventListener("click", handleClick);

        render();

        return () => {
             cancelAnimationFrame(animationFrameId);
             window.removeEventListener("resize", handleResize);
             window.removeEventListener("pointermove", handlePointerMove);
             window.removeEventListener("touchmove", handleTouchMove);
             window.removeEventListener("click", handleClick);
             
             // Optional: clean up gl resources if strictly necessary, but context loss usually handles it 
             // in simple React component unmounts.
        };

    }, []);

    return (
        <div ref={containerRef} style={{ width: width, height: height, position: 'relative', overflow: 'hidden', background: '#151912' }}>
            <canvas ref={canvasRef} style={{ display: 'block' }}/>
        </div>
    );
}
