// Designs/Orb.jsx

import React, { useEffect, useRef } from 'react'
import './styles/Orb.css'

export default function Orb({
  className,
  style,
  enableMic = true,
  size = 150,
  showOnlyPrimary = true
}) {
  const rootRef = useRef(null)
  const circlesRef = useRef([])
  const stopRef = useRef(() => { })

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const circles = circlesRef.current
    const initialTransforms = circles.map(() => ({ scale: 1 }))

    let animationFrameId = 0
    let audioContext
    let analyser
    let dataArray
    let micStream

    const updateCircles = (volume) => {
      const scale = 1 + (volume / 255) * 1.5
      const rotationDuration = Math.max(4, 10 - (volume / 255) * 10)
      const borderRadius = 48 - (volume / 255) * 10
      circles.forEach((el) => {
        if (!el) return
        el.style.transform = `translate(-50%, -50%) scale(${scale})`
        el.style.animationDuration = `${rotationDuration}s`
        el.style.setProperty('--dynamic-border-radius', `${borderRadius}%`)
      })
    }

    const tick = () => {
      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray)
        const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        updateCircles(volume)
      }
      animationFrameId = requestAnimationFrame(tick)
    }

    const startMic = async () => {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)()
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const source = audioContext.createMediaStreamSource(micStream)
        analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        dataArray = new Uint8Array(analyser.frequencyBinCount)
        source.connect(analyser)
      } catch (e) {
        // Fallback if mic fails
        analyser = undefined
      }
    }

    const start = async () => {
      if (enableMic && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await startMic()
      }
      animationFrameId = requestAnimationFrame(tick)
    }
    start()

    stopRef.current = () => {
      cancelAnimationFrame(animationFrameId)
      if (micStream) {
        micStream.getTracks().forEach(t => t.stop())
      }
      if (audioContext) {
        audioContext.close()
      }
      // reset transforms
      circles.forEach((el, i) => {
        if (!el) return
        el.style.transform = 'translate(-50%, -50%) scale(1)'
        el.style.animationDuration = ''
        el.style.setProperty('--dynamic-border-radius', '55%')
      })
    }

    return () => stopRef.current()
  }, [enableMic])

  return (
    <div className={`orb-container orb-vars ${className || ''}`} style={style}>
      <div ref={rootRef} className="orb-root">
        <div className="orb-scale-0">
          <div ref={el => circlesRef.current[0] = el} className="orb-circle orb-circle-1" style={{ width: size, height: size }} />
          <div ref={el => circlesRef.current[1] = el} className="orb-circle orb-circle-2" style={{ width: size, height: size }} />
          <div ref={el => circlesRef.current[2] = el} className="orb-circle orb-circle-3" style={{ width: size, height: size }} />
        </div>
        {showOnlyPrimary ? null : (
          <>
            <div className="orb-scale-1">
              <div className="orb-circle orb-circle-1" style={{ width: size, height: size }} />
              <div className="orb-circle orb-circle-2" style={{ width: size, height: size }} />
              <div className="orb-circle orb-circle-3" style={{ width: size, height: size }} />
            </div>
            <div className="orb-scale-2">
              <div className="orb-circle orb-circle-1" style={{ width: size, height: size }} />
              <div className="orb-circle orb-circle-2" style={{ width: size, height: size }} />
              <div className="orb-circle orb-circle-3" style={{ width: size, height: size }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}


