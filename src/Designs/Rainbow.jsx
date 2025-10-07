import React, { useEffect, useRef, useState } from 'react'
import { Renderer, Transform, Mesh, Program, Vec2, Texture, RenderTarget, Triangle, Geometry } from 'ogl'

// Reusable Rainbow simulation using OGL, sized to its container
export default function Rainbow({ className, style, initialDark = true, showToggle = true }) {
  const containerRef = useRef(null)
  const cleanupRef = useRef(() => {})
  const [dark, setDark] = useState(!!initialDark)
  const colorProgramRef = useRef(null)
  const glRef = useRef(null)

  useEffect(() => {
    let isDisposed = false
    let rafId = 0

    const container = containerRef.current
    if (!container) return

      function generateRandomTexture(width, height) {
        const data = new Float32Array(width * height * 4)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4
            data[index] = Math.random()
            data[index + 1] = Math.random()
            data[index + 2] = 0
            data[index + 3] = 0
          }
        }
        return data
      }

      class SplatSimulation {
        constructor(renderer) {
          this.renderer = renderer
          const gl = this.renderer.gl
          this.uniform = { value: null }
          this.scene = new Transform()
          this.width = 0
          this.height = 0
          const options = {
            width: 2,
            height: 2,
            type: gl.HALF_FLOAT,
            format: gl.RGBA,
            internalFormat: gl.RGBA16F,
            minFilter: gl.LINEAR,
            depth: false
          }
          this.fbo = {
            read: new RenderTarget(gl, options),
            write: new RenderTarget(gl, options),
            swap: () => {
              let temp = this.fbo.read
              this.fbo.read = this.fbo.write
              this.fbo.write = temp
            }
          }
          this.splatPos = new Vec2()
          this.splatPrevPos = new Vec2()
          this.splatVelocity = 0
          this.splatTargetVelocity = 0
          this.lastTime = 0
          this.lastMoveTime = 0
          this.createFSQuad()
        }
        createFSQuad() {
          const gl = this.renderer.gl
          const vertex = `#version 300 es\n      in vec2 uv;\n      in vec3 position;\n      out vec2 vUv;\n\n      void main() {\n        vUv = uv;\n        gl_Position = vec4(position, 1.0);\n      }\n    `
          const fragment = `#version 300 es\n      precision highp float;\n      in vec2 vUv;\n      out vec4 fragColor;\n\n      uniform sampler2D tBuffer;\n      uniform sampler2D tAdvect;\n      uniform vec2 uSplatCoords;\n      uniform vec2 uSplatPrevCoords;\n      uniform float uSplatRadius;\n\n      float cubicIn(float t) { return t * t * t; }\n\n      float line(vec2 uv, vec2 point1, vec2 point2) {\n          vec2 pa = uv - point1, ba = point2 - point1;\n          float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);\n          return length(pa - ba * h);\n      }\n\n      void main() {\n        vec2 uv = vUv;\n        vec2 invResolution = 1.0 / vec2(textureSize(tBuffer, 0));\n        vec2 advect = (texture(tAdvect, uv * 3.0).xy * 2.0 - 1.0) * 1.0;\n        uv += advect * invResolution;\n        float wavespeed = 1.0;\n        vec2 offset = invResolution * wavespeed;\n        float l = texture(tBuffer, uv - vec2(offset.x, 0.0)).r;\n        float r = texture(tBuffer, uv + vec2(offset.x, 0.0)).r;\n        float t = texture(tBuffer, uv + vec2(0.0, offset.y)).r;\n        float b = texture(tBuffer, uv - vec2(0.0, offset.y)).r;\n        float nextVal = max(max(max(l, r), t), b);\n        float radius = 0.05 * smoothstep(0.1, 1.0, uSplatRadius);\n        float splat = cubicIn(clamp(1.0 - line(vUv, uSplatPrevCoords.xy, uSplatCoords.xy) / radius, 0.0, 1.0));\n        nextVal += splat;\n        nextVal *= 0.985;\n        nextVal = min(nextVal, 1.0);\n        vec4 prev = texture(tBuffer, uv);\n        float rim = nextVal - prev.r;\n        float rimLerp = prev.b + rim;\n        rimLerp *= 0.9;\n        fragColor = vec4(nextVal, rim, rimLerp, 1.0);\n      }\n    `
          const noiseTexture = new Texture(gl, {
            image: generateRandomTexture(256, 256),
            target: gl.TEXTURE_2D,
            format: gl.RGBA,
            type: gl.FLOAT,
            internalFormat: gl.RGBA32F,
            width: 256,
            height: 256,
            wrapS: gl.REPEAT,
            wrapT: gl.REPEAT,
            magFilter: gl.LINEAR,
            minFilter: gl.LINEAR
          })
          this.fsProgram = new Program(gl, {
            vertex,
            fragment,
            uniforms: {
              tBuffer: { value: null },
              tAdvect: { value: noiseTexture },
              uSplatCoords: { value: this.splatPos },
              uSplatPrevCoords: { value: this.splatPrevPos },
              uSplatRadius: { value: this.splatVelocity }
            },
            depthTest: false,
            depthWrite: false
          })
          const geometry = new Triangle(gl)
          this.fsQuad = new Mesh(gl, { geometry, program: this.fsProgram })
        }
        onPointerMove({ x, y }) {
          this.splatPos.set(x / this.width, 1.0 - y / this.height)
        }
        resize() {
          const w = this.renderer.width
          const h = this.renderer.height
          this.width = w
          this.height = h
          const rtw = Math.max(2, Math.floor(w / 5))
          const rth = Math.max(2, Math.floor(h / 5))
          this.fbo.read.setSize(rtw, rth)
          this.fbo.write.setSize(rtw, rth)
        }
        update = () => {
          const f = performance.now() / 1000
          if (f - this.lastTime < 0.015) return
          this.lastTime = f
          let dist = this.splatPos.distance(this.splatPrevPos)
          const timeSinceMove = f - this.lastMoveTime
          if (dist > 0) this.lastMoveTime = f
          if (timeSinceMove > 0.15 || dist > 0.3) {
            this.splatPrevPos.copy(this.splatPos)
            this.splatTargetVelocity = 0
            dist = 0
          }
          this.splatTargetVelocity += dist * 6
          this.splatTargetVelocity *= 0.88
          this.splatTargetVelocity = Math.min(this.splatTargetVelocity, 1)
          this.splatVelocity += (this.splatTargetVelocity - this.splatVelocity) * 0.1
          this.fsProgram.uniforms.uSplatRadius.value = this.splatVelocity
          this.fsProgram.uniforms.tBuffer.value = this.fbo.read.texture
          this.renderer.render({ scene: this.fsQuad, target: this.fbo.write, clear: false })
          this.splatPrevPos.copy(this.splatPos)
          this.uniform.value = this.fbo.write.texture
          this.fbo.swap()
        }
      }

      const colors = [
        [0.10196078431372549, 0.7372549019607844, 0.611764705882353],
        [0.1803921568627451, 0.8, 0.44313725490196076],
        [0.20392156862745098, 0.596078431372549, 0.8588235294117647],
        [0.6078431372549019, 0.34901960784313724, 0.7137254901960784],
        [0.20392156862745098, 0.28627450980392155, 0.3686274509803922],
        [0.08627450980392157, 0.6274509803921569, 0.5215686274509804],
        [0.15294117647058825, 0.6823529411764706, 0.3764705882352941],
        [0.1607843137254902, 0.5019607843137255, 0.7254901960784313],
        [0.5568627450980392, 0.26666666666666666, 0.6784313725490196],
        [0.17254901960784313, 0.24313725490196078, 0.3137254901960784],
        [0.9450980392156862, 0.7686274509803922, 0.058823529411764705],
        [0.9019607843137255, 0.49411764705882355, 0.13333333333333333],
        [0.9058823529411765, 0.2980392156862745, 0.23529411764705882],
        [0.9254901960784314, 0.9411764705882353, 0.9450980392156862],
        [0.9529411764705882, 0.611764705882353, 0.07058823529411765],
        [0.8274509803921568, 0.32941176470588235, 0],
        [0.7529411764705882, 0.2235294117647059, 0.16862745098039217],
        [0.996078431372549, 0.6823529411764706, 0.7372549019607844]
      ]

      const colorVertex = `#version 300 es\n  precision highp float;\n  in vec2 uv;\n  in vec2 position;\n  out vec2 vUv;\n  void main() { vUv = uv; gl_Position = vec4(position, 0, 1); }\n`

      const colorFragment = `#version 300 es\nprecision highp float;\nuniform sampler2D tSim;\nuniform sampler2D tMap;\nuniform sampler2D tRandom;\nuniform vec2 uResolution;\nuniform vec3 uColors[18];\nuniform int uDark;\n\nin vec2 vUv;\nout vec4 fragColor;\n\nfloat rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }\n\nvoid main() {\n    float rnd = texture(tRandom, vUv).r;\n    vec4 prev = texture(tMap, vUv);\n    vec4 sim  = texture(tSim, vUv);\n    vec3 color = prev.rgb;\n    float phase = prev.a;\n    if (sim.r * sim.g >= 0.05 && prev.r == 1. && rand(vUv * sim.rb * rnd) < 0.2) {\n        int idx = int(floor(rand(vUv * sim.rg * rnd) * 18.0));\n        color = uColors[idx];\n        phase = 2.0 * sim.r;\n    } else {\n      if (phase < 0.6 * rnd && color.r != 1.) {\n        color = (uDark == 1) ? vec3(1.0, 1.0, 1.0) : vec3(0.90, 0.90, 0.90);\n        phase = rnd * phase;\n      }\n    }\n    if (color.r >= 0.99 && color.g >= 0.99 && color.b >= 0.99) {\n      phase = fract(phase + 0.005 + rand(vUv * rnd) * 0.005);\n    } else {\n      phase *= 0.98;\n    }\n    fragColor = vec4(color, phase);\n}`

      const vertex = `#version 300 es\nprecision highp float;\nin vec2 uv;\nin vec2 position;\nuniform int uRows;\nuniform int uColumns;\nuniform vec2 uResolution;\nuniform float uSize;\nuniform float uGap;\nuniform float uTime;\nuniform sampler2D tColor;\nuniform sampler2D tSim;\nout vec2 vUv;\nflat out vec4 vColor;\nvoid main() {\n    int row = gl_InstanceID / uColumns;\n    int col = gl_InstanceID % uColumns;\n    int invRow = (uRows - 1) - row;\n    vec2 pxToClip = 2.0 / uResolution;\n    float stepX = uSize + uGap;\n    float stepY = uSize + uGap;\n    float cellX = float(col) * stepX;\n    float cellY = float(invRow) * stepY;\n    vec2 pos = position * (uSize * 0.5) * pxToClip;\n    vec2 offset = vec2(cellX, -cellY) * pxToClip;\n    vec2 topLeft = vec2(-1.0 + uSize * 0.5 * pxToClip.x, 1.0 - uSize * 0.5 * pxToClip.y);\n    vUv = (vec2(col, row) + 1.) / (vec2(float(uColumns), float(uRows)) + 1.);\n    vec4 c = texture(tColor, vUv);\n    if (c.r == 1.) { float alpha = mix(.1, 0.2, step(0.75, c.a)); c.a = alpha; }\n    vColor = c;\n    gl_Position = vec4(pos + offset + topLeft, 0., 1.);\n}`

      const fragment = `#version 300 es\nprecision highp float;\nin vec2 vUv;\nflat in vec4 vColor;\nout vec4 fragColor;\nvoid main() { vec4 c = vColor; fragColor = c; }`

      const size = 4
      const space = 2
      const resolution = { value: [0, 0] }
      const renderer = new Renderer({ dpr: window.devicePixelRatio, alpha: true })
      const gl = renderer.gl
      glRef.current = gl
      const time = { value: 0 }
      const mouse = { x: 0, y: 0, smoothX: 0, smoothY: 0 }
      const simulation = new SplatSimulation(renderer)

      container.appendChild(gl.canvas)
      if (dark) {
        gl.clearColor(0, 0, 0, 1)
      } else {
        gl.clearColor(0, 0, 0, 0)
      }

      function resize() {
        const rect = container.getBoundingClientRect()
        const w = Math.max(1, Math.floor(rect.width))
        const h = Math.max(1, Math.floor(rect.height))
        renderer.setSize(w, h)
        resolution.value = [w, h]
        simulation.resize()
      }
      resize()
      const onResize = () => resize()
      window.addEventListener('resize', onResize)

      const scene = new Transform()
      const columns = Math.ceil((renderer.width + space) / (size + space))
      const rows = Math.ceil((renderer.height + space) / (size + space))
      const cells = columns * rows

      function onMouseMove(e) {
        mouse.x = e.clientX
        mouse.y = e.clientY
      }
      const pointerMoveOnce = (e) => {
        onMouseMove(e)
        mouse.smoothX = mouse.x
        mouse.smoothY = mouse.y
        window.addEventListener('pointermove', onMouseMove)
      }
      window.addEventListener('pointermove', pointerMoveOnce, { once: true })
      const onTouch = (e) => onMouseMove(e.touches[0])
      window.addEventListener('touchmove', onTouch)
      const onTouchStart = (e) => {
        e.preventDefault()
        onMouseMove(e.touches[0])
        mouse.smoothX = mouse.x
        mouse.smoothY = mouse.y
      }
      window.addEventListener('touchstart', onTouchStart, { passive: false })

      const initialImageData = new Float32Array(cells * 4)
      const initialRandomData = new Float32Array(cells)
      for (let i = 0; i < cells; i++) {
        initialRandomData.set([Math.min(Math.random() + 0.2, 0.95)], i)
        initialImageData.set([1, 1, 1, Math.random()], i * 4)
      }
      const initImageTexture = new Texture(gl, {
        image: initialImageData,
        target: gl.TEXTURE_2D,
        type: gl.FLOAT,
        format: gl.RGBA,
        internalFormat: gl.RGBA32F,
        wrapS: gl.CLAMP_TO_EDGE,
        wrapT: gl.CLAMP_TO_EDGE,
        generateMipmaps: false,
        minFilter: gl.NEAREST,
        magFilter: gl.NEAREST,
        width: columns,
        height: rows,
        flipY: false
      })
      const colorUniform = { value: initImageTexture }
      const colorRandom = {
        value: new Texture(gl, {
          image: initialRandomData,
          target: gl.TEXTURE_2D,
          type: gl.FLOAT,
          format: gl.RED,
          internalFormat: gl.R32F,
          wrapS: gl.CLAMP_TO_EDGE,
          wrapT: gl.CLAMP_TO_EDGE,
          generateMipmaps: false,
          minFilter: gl.NEAREST,
          magFilter: gl.NEAREST,
          width: columns,
          height: rows
        })
      }
      const colorOptions = {
        width: columns,
        height: rows,
        type: gl.FLOAT,
        format: gl.RGBA,
        internalFormat: gl.RGBA32F,
        minFilter: gl.NEAREST,
        depth: false,
        unpackAlignment: 1
      }
      const colorFbo = {
        read: new RenderTarget(gl, colorOptions),
        write: new RenderTarget(gl, colorOptions),
        render: () => {
          renderer.render({ scene: colorMesh, target: colorFbo.write, clear: false })
          colorFbo.swap()
        },
        swap: () => {
          let temp = colorFbo.read
          colorFbo.read = colorFbo.write
          colorFbo.write = temp
          colorUniform.value = colorFbo.read.texture
        }
      }
      const colorProgram = new Program(gl, {
        vertex: colorVertex,
        fragment: colorFragment,
        uniforms: {
          tMap: colorUniform,
          tSim: simulation.uniform,
          uResolution: resolution,
          uRows: { value: rows },
          uColumns: { value: columns },
          uSize: { value: cells },
          uColors: { value: colors },
          tRandom: colorRandom,
          uDark: { value: dark ? 1 : 0 }
        }
      })
      colorProgramRef.current = colorProgram
      const colorMesh = new Mesh(gl, { geometry: new Triangle(gl), program: colorProgram })

      const geometry = new Geometry(gl, {
        position: { instanced: 0.25, size: 2, data: new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]) },
        uv: { size: 2, data: new Float32Array([0, 1, 0, 0, 1, 1, 1, 0]) },
        index: { data: new Uint16Array([0, 1, 2, 1, 3, 2]) }
      })
      geometry.setInstancedCount(cells)
      const program = new Program(gl, {
        vertex,
        fragment,
        uniforms: {
          uRows: { value: rows },
          uColumns: { value: columns },
          uResolution: resolution,
          uSize: { value: size },
          uGap: { value: space },
          uTime: time,
          tColor: colorUniform,
          tSim: simulation.uniform
        }
      })
      const points = new Mesh(gl, { geometry, program })
      points.setParent(scene)
      points.position.set(-1, 1, 0)

      const loop = (t) => {
        rafId = requestAnimationFrame(loop)
        mouse.smoothX += (mouse.x - mouse.smoothX) * 0.15
        mouse.smoothY += (mouse.y - mouse.smoothY) * 0.15
        simulation.onPointerMove({ x: mouse.smoothX, y: mouse.smoothY })
        time.value = t
        simulation.update()
        colorFbo.render()
        renderer.render({ scene })
      }
      rafId = requestAnimationFrame(loop)

      cleanupRef.current = () => {
        cancelAnimationFrame(rafId)
        window.removeEventListener('resize', onResize)
        window.removeEventListener('pointermove', pointerMoveOnce)
        window.removeEventListener('pointermove', onMouseMove)
        window.removeEventListener('touchmove', onTouch)
        window.removeEventListener('touchstart', onTouchStart)
        if (gl && gl.canvas && gl.canvas.parentElement === container) {
          container.removeChild(gl.canvas)
        }
      }

    return () => {
      isDisposed = true
      cleanupRef.current()
    }
  }, [])

  useEffect(() => {
    if (colorProgramRef.current && colorProgramRef.current.uniforms && colorProgramRef.current.uniforms.uDark) {
      colorProgramRef.current.uniforms.uDark.value = dark ? 1 : 0
    }
    if (glRef.current) {
      if (dark) {
        glRef.current.clearColor(0, 0, 0, 1)
      } else {
        glRef.current.clearColor(0, 0, 0, 0)
      }
    }
  }, [dark])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', background: dark ? '#000' : 'transparent', ...style }}
    >
      {showToggle ? (
        <button
          type="button"
          onClick={() => setDark(v => !v)}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
            border: '1px solid rgba(0,0,0,0.15)',
            background: dark ? 'rgba(30,30,30,0.8)' : 'rgba(255,255,255,0.85)',
            color: dark ? '#e6e6e6' : '#111111',
            padding: '8px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            backdropFilter: 'blur(6px)'
          }}
        >
          {dark ? 'Light Mode' : 'Dark Mode'}
        </button>
      ) : null}
    </div>
  )
}


