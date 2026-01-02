// Designs/CanvasRings.jsx

import React, { useRef, useState, useEffect, useCallback } from 'react'

export default function CanvasRings({
  width = '100vw',
  height = '100vh',
  baseRadius = 1.5,
  spacing = 20,
  padding = 20,
  maxRings = 10,
  lightPalette = [
    '#1a1a1a', '#304ffe', '#00b8d4', '#00c853', '#ffd600',
    '#ff9100', '#ff1744', '#7b1fa2', '#455a64', '#9e9e9e'
  ],
  darkPalette = [
    '#e0e0e0', '#82b1ff', '#80d8ff', '#69f0ae', '#ffff8d',
    '#ffd180', '#ff8a80', '#ea80fc', '#90a4ae', '#bdbdbd'
  ],
  initialDark = false,
  showToggle = true,
  className
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [dark, setDark] = useState(!!initialDark)

  // Internal render state
  const stateRef = useRef({
    points: [],
    cursorX: Infinity,
    cursorY: Infinity,
    dirty: true,
    deviceScale: 1
  })

  const spaceForOneCircle = (2 * baseRadius + spacing)

  const getPalette = useCallback(() => (dark ? darkPalette : lightPalette), [dark, darkPalette, lightPalette])

  const getDotColor = useCallback((ringNumber) => {
    if (ringNumber == null || !Number.isFinite(ringNumber)) return dark ? '#e0e0e0' : '#1a1a1a'
    const palette = getPalette()
    const idx = Math.max(0, Math.min(palette.length - 1, ringNumber))
    return palette[idx]
  }, [dark, getPalette])

  const getRingAndSize = useCallback((cursorPosX, cursorPosY, x, y) => {
    if (!Number.isFinite(cursorPosX) || !Number.isFinite(cursorPosY)) {
      return { ringNumber: null, size: null }
    }
    const dx = cursorPosX - x
    const dy = cursorPosY - y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const ringNumber = Math.floor(distance / spaceForOneCircle)
    if (ringNumber < maxRings) {
      return { ringNumber, size: (maxRings - ringNumber) / 1.6 }
    }
    return { ringNumber, size: null }
  }, [spaceForOneCircle, maxRings])

  const recomputeGrid = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const points = []
    const scale = stateRef.current.deviceScale || 1
    const w = canvas.width / scale
    const h = canvas.height / scale
    const startX = padding + baseRadius
    const startY = padding + baseRadius
    const endX = w - padding - baseRadius
    const endY = h - padding - baseRadius
    for (let x = startX; x <= endX + 0.001; x += spaceForOneCircle) {
      for (let y = startY; y <= endY + 0.001; y += spaceForOneCircle) {
        points.push({ x, y })
      }
    }
    stateRef.current.points = points
    stateRef.current.dirty = true
  }, [padding, spaceForOneCircle, baseRadius])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const dpr = window.devicePixelRatio || 1
    stateRef.current.deviceScale = dpr
    const rect = container.getBoundingClientRect()
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'
    canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    canvas.height = Math.max(1, Math.floor(rect.height * dpr))
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    recomputeGrid()
  }, [recomputeGrid])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = dark ? '#0b0b0b' : '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const { points, cursorX, cursorY } = stateRef.current
    for (let k = 0; k < points.length; k++) {
      const p = points[k]
      const { ringNumber, size } = getRingAndSize(cursorX, cursorY, p.x, p.y)
      const color = getDotColor(ringNumber)
      ctx.beginPath()
      ctx.arc(p.x, p.y, size ? Math.max(size, 1.5) : baseRadius, 0, Math.PI * 2, true)
      ctx.fillStyle = color
      ctx.fill()
      ctx.closePath()
    }
  }, [dark, getDotColor, getRingAndSize, baseRadius])

  // animation loop
  useEffect(() => {
    let rafId
    const tick = () => {
      if (stateRef.current.dirty) {
        render()
        stateRef.current.dirty = false
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [render])

  // resize observer
  useEffect(() => {
    resizeCanvas()
    const onResize = () => { resizeCanvas(); stateRef.current.dirty = true }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [resizeCanvas])

  // mouse move
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      stateRef.current.cursorX = e.clientX - rect.left
      stateRef.current.cursorY = e.clientY - rect.top
      stateRef.current.dirty = true
    }
    const onLeave = () => {
      stateRef.current.cursorX = Infinity
      stateRef.current.cursorY = Infinity
      stateRef.current.dirty = true
    }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)
    return () => {
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  // re-render when theme changes
  useEffect(() => {
    stateRef.current.dirty = true
  }, [dark])

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative', width, height }}>
      {showToggle && (
        <button
          type="button"
          onClick={() => setDark(v => !v)}
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 10,
            border: '1px solid rgba(0,0,0,0.15)',
            background: dark ? 'rgba(30,30,30,0.8)' : 'rgba(255,255,255,0.8)',
            color: dark ? '#e6e6e6' : '#111111',
            padding: '8px 12px', borderRadius: 8, cursor: 'pointer', backdropFilter: 'blur(6px)'
          }}
        >
          {dark ? 'Light Mode' : 'Dark Mode'}
        </button>
      )}
      <canvas ref={canvasRef} />
    </div>
  )
}