import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import './styles/GhostMouse.css'

const vertexShader = `
    void main() {
        gl_Position = vec4( position, 1.0 );
    }
`

const fragmentShader = `
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform float u_time;
  uniform sampler2D u_noise;
  uniform sampler2D u_buffer;
  uniform bool u_renderpass;
    
  const float blurMultiplier = 0.95;
  const float circleSize = .25;
  const float blurStrength = .98;
  const float threshold = .5;
  const float scale = 4.;
  
  #define _fract true
  
  #define PI 3.141592653589793
  #define TAU 6.283185307179586

  vec2 hash2(vec2 p)
  {
    vec2 o = texture2D( u_noise, (p+0.5)/256.0, -100.0 ).xy;
    return o;
  }
  
  vec3 hsb2rgb( in vec3 c ){
    vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),
                             6.0)-3.0)-1.0,
                     0.0,
                     1.0 );
    rgb = rgb*rgb*(3.0-2.0*rgb);
    return c.z * mix( vec3(1.0), rgb, c.y);
  }
  
  vec3 domain(vec2 z){
    return vec3(hsb2rgb(vec3(atan(z.y,z.x)/TAU,1.,1.)));
  }
  vec3 colour(vec2 z) {
      return domain(z);
  }

  
#define pow2(x) (x * x)

const int samples = 8;
const float sigma = float(samples) * 0.25;

float gaussian(vec2 i) {
    return 1.0 / (2.0 * PI * pow2(sigma)) * exp(-((pow2(i.x) + pow2(i.y)) / (2.0 * pow2(sigma))));
}

vec3 hash33(vec3 p){ 
    
    float n = sin(dot(p, vec3(7, 157, 113)));    
    return fract(vec3(2097152, 262144, 32768)*n); 
}

vec3 blur(sampler2D sp, vec2 uv, vec2 scale) {
    vec3 col = vec3(0.0);
    float accum = 0.0;
    float weight;
    vec2 offset;
    
    for (int x = -samples / 2; x < samples / 2; ++x) {
        for (int y = -samples / 2; y < samples / 2; ++y) {
            offset = vec2(x, y);
            weight = gaussian(offset);
            col += texture2D(sp, uv + scale * offset).rgb * weight;
            accum += weight;
        }
    }
    
    return col / accum;
}
  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    uv *= scale;
    vec2 mouse = u_mouse * scale;
    
    vec2 ps = vec2(1.0) / u_resolution.xy;
    vec2 samplePos = gl_FragCoord.xy / u_resolution.xy;
    vec2 o = mouse*.2+vec2(.65, .5);
    float d = .98;
    samplePos = d * (samplePos - o);
    samplePos += o;
    samplePos += vec2(sin((u_time+uv.y * .5)*10.)*.001, -.00);
    
    vec3 fragcolour;
    vec4 tex;
    if(u_renderpass) {
      tex = vec4(blur(u_buffer, samplePos, ps*blurStrength) * blurMultiplier, 1.);
      float df = length(mouse - uv);
      fragcolour = vec3( smoothstep( circleSize, 0., df ) );
    } else {
      tex = texture2D(u_buffer, samplePos, 2.) * .98;
      tex = vec4(
        smoothstep(0.0, threshold - fwidth(tex.x), tex.x),
        smoothstep(0.2, threshold - fwidth(tex.y) + .2, tex.y),
        smoothstep(-0.05, threshold - fwidth(tex.z) - .2, tex.z),
        1.);
      vec3 n = hash33(vec3(uv, u_time*.1));
      tex.rgb += n * .2 - .1;
    }
    
    gl_FragColor = vec4(fragcolour,1.0);
    gl_FragColor += tex;
    
  }
`

export default function GhostMouse() {
    const containerRef = useRef(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        let camera, scene, renderer
        let uniforms
        let texture, rtTexture, rtTexture2
        let animationId
        let isMounted = true
        let newmouse = { x: 0, y: 0 }
        const divisor = 1 / 10

        const loader = new THREE.TextureLoader()
        loader.setCrossOrigin("anonymous")

        // Initialize function
        const init = () => {
            if (!isMounted) return

            camera = new THREE.Camera()
            camera.position.z = 1

            scene = new THREE.Scene()

            const geometry = new THREE.PlaneGeometry(2, 2)

            rtTexture = new THREE.WebGLRenderTarget(window.innerWidth * .2, window.innerHeight * .2)
            rtTexture2 = new THREE.WebGLRenderTarget(window.innerWidth * .2, window.innerHeight * .2)

            uniforms = {
                u_time: { value: 1.0 },
                u_resolution: { value: new THREE.Vector2() },
                u_noise: { value: texture },
                u_buffer: { value: rtTexture.texture },
                u_mouse: { value: new THREE.Vector2() },
                u_renderpass: { value: false }
            }

            const material = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: vertexShader,
                fragmentShader: fragmentShader
            })
            material.extensions.derivatives = true

            const mesh = new THREE.Mesh(geometry, material)
            scene.add(mesh)

            renderer = new THREE.WebGLRenderer()
            renderer.setPixelRatio(window.devicePixelRatio)
            renderer.setSize(window.innerWidth, window.innerHeight)

            // Initial resolution
            uniforms.u_resolution.value.x = renderer.domElement.width
            uniforms.u_resolution.value.y = renderer.domElement.height

            container.appendChild(renderer.domElement)

            animate()
        }

        const onWindowResize = () => {
            if (!renderer) return
            renderer.setSize(window.innerWidth, window.innerHeight)
            uniforms.u_resolution.value.x = renderer.domElement.width
            uniforms.u_resolution.value.y = renderer.domElement.height

            rtTexture.dispose()
            rtTexture2.dispose()
            rtTexture = new THREE.WebGLRenderTarget(window.innerWidth * .2, window.innerHeight * .2)
            rtTexture2 = new THREE.WebGLRenderTarget(window.innerWidth * .2, window.innerHeight * .2)
        }

        const onPointerMove = (e) => {
            const ratio = window.innerHeight / window.innerWidth
            newmouse.x = (e.pageX - window.innerWidth / 2) / window.innerWidth / ratio
            newmouse.y = (e.pageY - window.innerHeight / 2) / window.innerHeight * -1
        }

        const renderTexture = () => {
            const odims = uniforms.u_resolution.value.clone()
            uniforms.u_resolution.value.x = window.innerWidth * .2
            uniforms.u_resolution.value.y = window.innerHeight * .2

            uniforms.u_buffer.value = rtTexture2.texture

            uniforms.u_renderpass.value = true

            renderer.setRenderTarget(rtTexture)
            renderer.clear()
            renderer.render(scene, camera)

            const buffer = rtTexture
            rtTexture = rtTexture2
            rtTexture2 = buffer

            uniforms.u_buffer.value = rtTexture.texture
            uniforms.u_resolution.value = odims
            uniforms.u_renderpass.value = false

            renderer.setRenderTarget(null)
        }

        const render = (delta) => {
            if (!renderer) return
            uniforms.u_mouse.value.x += (newmouse.x - uniforms.u_mouse.value.x) * divisor
            uniforms.u_mouse.value.y += (newmouse.y - uniforms.u_mouse.value.y) * divisor

            uniforms.u_time.value = delta * 0.0005
            renderer.render(scene, camera)
            renderTexture()
        }

        const animate = (time) => {
            if (!isMounted) return
            animationId = requestAnimationFrame(animate)
            render(time)
        }

        // Start loading
        loader.load(
            'https://s3-us-west-2.amazonaws.com/s.cdpn.io/982762/noise.png',
            (tex) => {
                texture = tex
                texture.wrapS = THREE.RepeatWrapping
                texture.wrapT = THREE.RepeatWrapping
                texture.minFilter = THREE.LinearFilter
                init()
            },
            undefined,
            (err) => {
                console.error("Error loading texture:", err)
            }
        )

        window.addEventListener('resize', onWindowResize, false)
        document.addEventListener('pointermove', onPointerMove)

        return () => {
            isMounted = false
            window.removeEventListener('resize', onWindowResize)
            document.removeEventListener('pointermove', onPointerMove)
            if (animationId) cancelAnimationFrame(animationId)
            if (renderer) {
                renderer.dispose()
                const canvas = renderer.domElement
                if (canvas && canvas.parentNode) {
                    canvas.parentNode.removeChild(canvas)
                }
            }
            if (rtTexture) rtTexture.dispose()
            if (rtTexture2) rtTexture2.dispose()
        }
    }, [])

    return <div ref={containerRef} className="ghost-mouse-wrapper" />
}
