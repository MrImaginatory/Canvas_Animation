import React, { useRef, useEffect, useState, useCallback } from 'react'

export default function GridBoxes({
    width = '100vw',
    height = '100vh',
    boxSize = 40,
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
        mouseX: -1000,
        mouseY: -1000,
        offset: 0,
        ripples: []
    })

    const resize = useCallback(() => {
        const container = containerRef.current
        const canvas = canvasRef.current
        if (!container || !canvas) return

        const rect = container.getBoundingClientRect()
        stateRef.current.width = Math.max(1, Math.floor(rect.width))
        stateRef.current.height = Math.max(1, Math.floor(rect.height))

        const dpr = window.devicePixelRatio || 1
        stateRef.current.dpr = dpr

        canvas.style.width = stateRef.current.width + 'px'
        canvas.style.height = stateRef.current.height + 'px'
        canvas.width = Math.max(1, Math.floor(stateRef.current.width * dpr))
        canvas.height = Math.max(1, Math.floor(stateRef.current.height * dpr))

        const ctx = canvas.getContext('2d')
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }, [])

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
            stateRef.current.mouseX = -1000
            stateRef.current.mouseY = -1000
        }

        const onClick = (e) => {
            const rect = canvas.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top

            // Random range between 4 and 7 boxes
            const rangeInBoxes = 2 + Math.random() * 3
            const maxRadius = boxSize * rangeInBoxes

            stateRef.current.ripples.push({
                x,
                y,
                time: 0,
                speed: 5,
                waveWidth: 20, // Initial wave width
                maxRadius: maxRadius
            })
        }

        canvas.addEventListener('mousemove', onMove)
        canvas.addEventListener('mouseleave', onLeave)
        canvas.addEventListener('click', onClick)

        return () => {
            canvas.removeEventListener('mousemove', onMove)
            canvas.removeEventListener('mouseleave', onLeave)
            canvas.removeEventListener('click', onClick)
        }
    }, [])

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        let rafId

        const animate = () => {
            const { width, height, mouseX, mouseY } = stateRef.current
            stateRef.current.offset += 0.5 // Slow movement for subtle effect

            ctx.clearRect(0, 0, width, height)

            // Colors
            const bgColor = dark ? '#111' : '#f0f0f0'
            const lineColor = dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            const highlightColor = dark ? 'rgba(100, 200, 255, 0.2)' : 'rgba(0, 100, 255, 0.1)'
            const activeLineColor = dark ? 'rgba(100, 200, 255, 0.5)' : 'rgba(0, 100, 255, 0.4)'

            // Background
            ctx.fillStyle = bgColor
            ctx.fillRect(0, 0, width, height)

            const cols = Math.ceil(width / boxSize)
            const rows = Math.ceil(height / boxSize)

            // Draw Grid
            ctx.lineWidth = 1

            for (let i = 0; i <= cols; i++) {
                const x = i * boxSize
                ctx.beginPath()
                ctx.strokeStyle = lineColor
                ctx.moveTo(x, 0)
                ctx.lineTo(x, height)
                ctx.stroke()
            }

            for (let j = 0; j <= rows; j++) {
                const y = j * boxSize
                ctx.beginPath()
                ctx.strokeStyle = lineColor
                ctx.moveTo(0, y)
                ctx.lineTo(width, y)
                ctx.stroke()
            }

            // Highlight box under mouse
            const hoveredCol = Math.floor(mouseX / boxSize)
            const hoveredRow = Math.floor(mouseY / boxSize)

            if (hoveredCol >= 0 && hoveredCol < cols && hoveredRow >= 0 && hoveredRow < rows) {
                const hx = hoveredCol * boxSize
                const hy = hoveredRow * boxSize

                // Fill highlighted box
                ctx.fillStyle = highlightColor
                ctx.fillRect(hx, hy, boxSize, boxSize)

                // Highlight borders of the box
                ctx.strokeStyle = activeLineColor
                ctx.strokeRect(hx, hy, boxSize, boxSize)
            }

            // Update ripples
            for (let i = stateRef.current.ripples.length - 1; i >= 0; i--) {
                const ripple = stateRef.current.ripples[i]
                ripple.time += 1
                ripple.waveWidth += 1 // Expand the wave width as it grows
                if (ripple.time * ripple.speed > ripple.maxRadius) {
                    stateRef.current.ripples.splice(i, 1)
                }
            }

            // Draw active grid cells for ripples
            if (stateRef.current.ripples.length > 0) {
                for (let i = 0; i < cols; i++) {
                    for (let j = 0; j < rows; j++) {
                        const cx = i * boxSize + boxSize / 2
                        const cy = j * boxSize + boxSize / 2

                        let totalOpacity = 0

                        for (const ripple of stateRef.current.ripples) {
                            const dist = Math.sqrt((cx - ripple.x) ** 2 + (cy - ripple.y) ** 2)
                            const currentRadius = ripple.time * ripple.speed
                            const waveWidth = ripple.waveWidth // Use dynamic wave width

                            const diff = Math.abs(dist - currentRadius)

                            if (diff < waveWidth) {
                                // Calculate opacity based on distance from wave center (peak)
                                const waveAlpha = 1 - (diff / waveWidth)
                                // Fade out as it gets further
                                const fadeAlpha = 1 - (currentRadius / ripple.maxRadius)

                                totalOpacity += waveAlpha * fadeAlpha * 0.6
                            }
                        }

                        if (totalOpacity > 0) {
                            totalOpacity = Math.min(1, totalOpacity)
                            const x = i * boxSize
                            const y = j * boxSize

                            ctx.fillStyle = dark
                                ? `rgba(100, 200, 255, ${totalOpacity})`
                                : `rgba(0, 100, 255, ${totalOpacity})`
                            ctx.fillRect(x, y, boxSize, boxSize)

                            ctx.strokeStyle = dark
                                ? `rgba(150, 220, 255, ${totalOpacity * 0.5})`
                                : `rgba(50, 150, 255, ${totalOpacity * 0.5})`
                            ctx.strokeRect(x, y, boxSize, boxSize)
                        }
                    }
                }
            }

            rafId = requestAnimationFrame(animate)
        }

        rafId = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(rafId)
    }, [dark, boxSize])

    useEffect(() => {
        document.body.style.backgroundColor = dark ? '#111' : '#f0f0f0'
    }, [dark])

    return (
        <div ref={containerRef} className={className} style={{ position: 'relative', width, height, overflow: 'hidden' }}>
            <button
                type="button"
                onClick={() => setDark(v => !v)}
                style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    zIndex: 10,
                    border: '1px solid rgba(128,128,128,0.3)',
                    background: dark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)',
                    color: dark ? '#f0f0f0' : '#111',
                    padding: '8px 12px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontFamily: 'sans-serif',
                    fontSize: '12px',
                    backdropFilter: 'blur(4px)'
                }}
            >
                {dark ? 'Light Mode' : 'Dark Mode'}
            </button>
            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
    )
}
