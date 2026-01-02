// Designs/MeshGrid.jsx

import React, { useRef, useEffect, useState, useCallback } from 'react'

// Reusable mesh grid component
export default function MeshGrid({
  width = '100vw',
  height = '100vh',
  spacing = 30,
  dotRadius = 2,
  maxDistortion = 10,
  dampening = 0.08,
  quality = 0.85, // 0.5 - 1.0
  drawLines = false,
  initialDark = true,
  className
}) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const [dark, setDark] = useState(!!initialDark)

  const stateRef = useRef({
    width: 0,
    height: 0,
    dpr: 1,
    dots: [],
    rows: 0,
    cols: 0,
    mouseX: 0,
    mouseY: 0
  })

  const rebuildGrid = useCallback(() => {
    const { width, height } = stateRef.current
    const dots = []
    const rows = Math.ceil(height / spacing) + 1
    const cols = Math.ceil(width / spacing) + 1
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = x * spacing
        const py = y * spacing
        dots.push({ x: px, y: py, originalX: px, originalY: py, vx: 0, vy: 0 })
      }
    }
    stateRef.current.dots = dots
    stateRef.current.rows = rows
    stateRef.current.cols = cols
  }, [spacing])

  const resize = useCallback(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    const rect = container.getBoundingClientRect()
    stateRef.current.width = Math.max(1, Math.floor(rect.width))
    stateRef.current.height = Math.max(1, Math.floor(rect.height))
    const dpr = (window.devicePixelRatio || 1) * quality
    stateRef.current.dpr = dpr
    canvas.style.width = stateRef.current.width + 'px'
    canvas.style.height = stateRef.current.height + 'px'
    canvas.width = Math.max(1, Math.floor(stateRef.current.width * dpr))
    canvas.height = Math.max(1, Math.floor(stateRef.current.height * dpr))
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    rebuildGrid()
  }, [quality, rebuildGrid])

  useEffect(() => {
    resize()
    const onResize = () => resize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [resize])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      stateRef.current.mouseX = e.clientX - rect.left
      stateRef.current.mouseY = e.clientY - rect.top
    }
    const onLeave = () => {
      stateRef.current.mouseX = 0
      stateRef.current.mouseY = 0
    }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)
    return () => {
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let rafId
    const animate = () => {
      const { width, height, dots, cols } = stateRef.current
      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i]
        const dx0 = stateRef.current.mouseX - dot.originalX
        const dy0 = stateRef.current.mouseY - dot.originalY
        const distSq = dx0 * dx0 + dy0 * dy0
        const maxRadius = 150
        const maxRadiusSq = maxRadius * maxRadius
        if (distSq < maxRadiusSq) {
          const distance = Math.sqrt(distSq)
          const force = (maxRadius - distance) / maxRadius
          const angle = Math.atan2(dy0, dx0)
          const targetX = dot.originalX + Math.cos(angle) * force * maxDistortion
          const targetY = dot.originalY + Math.sin(angle) * force * maxDistortion
          dot.vx += (targetX - dot.x) * dampening
          dot.vy += (targetY - dot.y) * dampening
        } else {
          dot.vx += (dot.originalX - dot.x) * dampening
          dot.vy += (dot.originalY - dot.y) * dampening
        }
        dot.vx *= 0.92
        dot.vy *= 0.92
        dot.x += dot.vx
        dot.y += dot.vy

        const dx = stateRef.current.mouseX - dot.x
        const dy = stateRef.current.mouseY - dot.y
        const dotDist = Math.sqrt(dx * dx + dy * dy)
        const gradient = 1 - Math.min(1, dotDist / 200)
        let r, g, b
        if (dark) {
          const base = Math.floor(180 + gradient * 60)
          r = g = base; b = Math.min(255, base + 20)
        } else {
          const base = Math.floor(40 + gradient * 200)
          r = g = base; b = Math.min(255, base + 40)
        }
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, dotRadius + gradient * 1.5, 0, Math.PI * 2)
        ctx.fill()

        if (drawLines) {
          if (i < dots.length - 1 && (i + 1) % cols !== 0) {
            const nextDot = dots[i + 1]
            const ldx = nextDot.x - dot.x
            const ldy = nextDot.y - dot.y
            const lineDistSq = ldx * ldx + ldy * ldy
            if (lineDistSq < (spacing * 1.5) * (spacing * 1.5)) {
              ctx.beginPath()
              ctx.strokeStyle = dark ? `rgba(200, 200, 240, ${0.15 + gradient * 0.2})` : `rgba(100, 100, 140, ${0.1 + gradient * 0.2})`
              ctx.lineWidth = 0.5
              ctx.moveTo(dot.x, dot.y)
              ctx.lineTo(nextDot.x, nextDot.y)
              ctx.stroke()
            }
          }
          if (i + cols < dots.length) {
            const dotBelow = dots[i + cols]
            const ldx2 = dotBelow.x - dot.x
            const ldy2 = dotBelow.y - dot.y
            const lineDistSq2 = ldx2 * ldx2 + ldy2 * ldy2
            if (lineDistSq2 < (spacing * 1.5) * (spacing * 1.5)) {
              ctx.beginPath()
              ctx.strokeStyle = dark ? `rgba(200, 200, 240, ${0.15 + gradient * 0.2})` : `rgba(100, 100, 140, ${0.1 + gradient * 0.2})`
              ctx.lineWidth = 0.5
              ctx.moveTo(dot.x, dot.y)
              ctx.lineTo(dotBelow.x, dotBelow.y)
              ctx.stroke()
            }
          }
        }
      }
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [dark, spacing, dotRadius, maxDistortion, dampening, drawLines])

  useEffect(() => {
    document.body.style.backgroundColor = dark ? '#000' : '#fff'
  }, [dark])

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative', width, height }}>
      <button
        type="button"
        onClick={() => setDark(v => !v)}
        style={{ position: 'absolute', top: 12, right: 12, zIndex: 10,
          border: '1px solid rgba(255,255,255,0.2)',
          background: dark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.8)',
          color: dark ? '#f0f0f0' : '#111', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', backdropFilter: 'blur(6px)'}}
      >{dark ? 'Light Mode' : 'Dark Mode'}</button>
      <canvas ref={canvasRef} />
    </div>
  )
}


