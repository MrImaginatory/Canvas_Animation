import React, { useRef, useEffect } from 'react'

export default function ParticleWave({ width = '100vw', height = '100vh' }) {
  const canvasRef = useRef(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // Constants
    const fov = 100
    const dist = 100
    const opacity = 0.5
    const particleSize = 2
    const maxAmplitude = 1500
    const sideLength = 50 
    const spacing = 200

    // State
    let rotXCounter = 0
    let rotYCounter = 0
    let rotZCounter = 0
    let counter = 0
    
    // Vector3 Helper Class
    class Vector3 {
      constructor(x, y, z) {
        this.x = x
        this.y = y
        this.z = z
        this.color = "#0D0"
      }

      rotateX(angle) {
        const z = this.z * Math.cos(angle) - this.x * Math.sin(angle)
        const x = this.z * Math.sin(angle) + this.x * Math.cos(angle)
        return new Vector3(x, this.y, z)
      }

      rotateY(angle) {
        const y = this.y * Math.cos(angle) - this.z * Math.sin(angle)
        const z = this.y * Math.sin(angle) + this.z * Math.cos(angle)
        return new Vector3(this.x, y, z)
      }

      rotateZ(angle) {
        const x = this.x * Math.cos(angle) - this.y * Math.sin(angle)
        const y = this.x * Math.sin(angle) + this.y * Math.cos(angle)
        return new Vector3(x, y, this.z)
      }

      perspectiveProjection(fov, viewDistance, canvasWidth, canvasHeight) {
        const factor = fov / (viewDistance + this.z)
        const x = this.x * factor + canvasWidth / 2
        const y = this.y * factor + canvasHeight / 2
        return new Vector3(x, y, this.z)
      }

      draw(canvasWidth, canvasHeight) {
        const frac = this.y / maxAmplitude
        const r = Math.floor(frac * 100)
        const g = 20
        const b = Math.floor(255 - frac * 100)
        
        // Apply rotations
        let vec = this.rotateX(rotXCounter)
        vec = vec.rotateY(rotYCounter)
        vec = vec.rotateZ(rotZCounter)
        
        // Project
        vec = vec.perspectiveProjection(fov, dist, canvasWidth, canvasHeight)

        this.color = `rgb(${r}, ${g}, ${b})`
        ctx.fillStyle = this.color
        ctx.fillRect(vec.x, vec.y, particleSize, particleSize)
      }
    }

    // Initialize Points
    const points = []
    for (let z = 0; z < sideLength; z++) {
      for (let x = 0; x < sideLength; x++) {
        const xStart = -(sideLength * spacing) / 2
        points.push(
          new Vector3(xStart + x * spacing, 0, xStart + z * spacing)
        )
      }
    }

    let animationFrameId
    
    function loop() {
      // Clear with opacity trail
      ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (let i = 0, max = points.length; i < max; i++) {
        const x = i % sideLength
        const z = Math.floor(i / sideLength)
        const xFinal = Math.sin(x / sideLength * 4 * Math.PI + counter)
        const zFinal = Math.cos(z / sideLength * 4 * Math.PI + counter)
        const gap = maxAmplitude * 0.3
        const amp = maxAmplitude - gap

        points[z * sideLength + x].y = maxAmplitude + xFinal * zFinal * amp

        points[i].draw(canvas.width, canvas.height)
      }
      
      counter += 0.03
      rotXCounter += 0.005
      rotYCounter += 0.005
      // rotZCounter += 0.005

      animationFrameId = requestAnimationFrame(loop)
    }

    // Initial resize
    const resizeCanvas = () => {
        // We'll use the parent container's size if possible, or window
        // But for full screen effect as seen in `App.jsx`, we usually pass width/height props or assume full window.
        // The App route setup generally gives it a specific container size or we rely on CSS.
        // Let's use window.innerWidth like the original code but relative to the canvas.
        // Actually, better to respect the container for reusable components.
        // But the original code `canvas.width = window.innerWidth` implies full screen.
        // Let's just set the canvas internal resolution to matches its display size.
        const rect = canvas.getBoundingClientRect()
        // If rect is 0 (hidden), stick to window or defaults
        const w = rect.width || window.innerWidth
        const h = rect.height || window.innerHeight
        
        canvas.width = w
        canvas.height = h
    }

    window.addEventListener('resize', resizeCanvas)
    resizeCanvas() // Force one resize
    loop()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div style={{ width: width, height: height, background: 'black', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}
