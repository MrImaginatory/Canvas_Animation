import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import CanvasRings from './Designs/CanvasRings'
import MeshGrid from './Designs/MeshGrid'
import Rainbow from './Designs/Rainbow'
import GridBoxes from './Designs/GridBoxes'
import Orb from './Designs/Orb'
// import Metaballs from './Designs/Metaballs'
import ThreeSphere from './Designs/threeSpehere'
import Geist from './Designs/Geist'
import MatrixDesign from './Designs/MatrixDesign'
import GhostMouse from './Designs/GhostMouse'
import NeuralNoise from './Designs/NeuralNoise'
import LiquidGradient from './Designs/LiquidGradient'
import ParticleWave from './Designs/ParticleWave'
import ParticleSwarm from './Designs/ParticleSwarm'
import ProtonEffect from './Designs/ProtonEffect'
import Sakura from './Designs/Sakura'
import './App.css'

const designs = [
  { path: '/rings', component: CanvasRings, name: 'Canvas Rings' },
  { path: '/mesh', component: MeshGrid, name: 'Mesh Grid' },
  { path: '/rainbow', component: Rainbow, name: 'Rainbow' },
  { path: '/grid-boxes', component: GridBoxes, name: 'Grid Boxes' },
  { path: '/orb', component: Orb, name: 'Orb' },
  { path: '/three-sphere', component: ThreeSphere, name: 'Three Sphere' },
  { path: '/geist', component: Geist, name: 'Geist' },
  { path: '/matrix', component: MatrixDesign, name: 'Matrix' },
  { path: '/ghost-mouse', component: GhostMouse, name: 'Ghost Mouse' },
  { path: '/neural-noise', component: NeuralNoise, name: 'Neural Noise' },
  { path: '/liquid-gradient', component: LiquidGradient, name: 'Liquid Gradient' },
  { path: '/particle-wave', component: ParticleWave, name: 'Particle Wave' },
  { path: '/particle-swarm', component: ParticleSwarm, name: 'Particle Swarm' },
  { path: '/proton-effect', component: ProtonEffect, name: 'Proton Effect' },
  { path: '/sakura', component: Sakura, name: 'Sakura' },
]

function Navigation() {
  const navigate = useNavigate()
  const location = useLocation()

  const currentIndex = designs.findIndex(d => d.path === location.pathname)

  // If we are not on a design page (e.g. root), default to first
  const activeIndex = currentIndex === -1 ? 0 : currentIndex

  const handleNext = () => {
    const nextIndex = (activeIndex + 1) % designs.length
    navigate(designs[nextIndex].path)
  }

  const handlePrev = () => {
    const prevIndex = (activeIndex - 1 + designs.length) % designs.length
    navigate(designs[prevIndex].path)
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '20px',
      zIndex: 1000,
      background: 'rgba(0,0,0,0.5)',
      padding: '10px 20px',
      borderRadius: '30px',
      backdropFilter: 'blur(5px)'
    }}>
      <button onClick={handlePrev} style={{ cursor: 'pointer', padding: '8px 16px', borderRadius: '20px', border: 'none', background: 'white', color: 'black', fontWeight: 'bold' }}>
        Previous
      </button>
      <span style={{ color: 'white', alignSelf: 'center', fontWeight: 'bold' }}>
        {designs[activeIndex].name}
      </span>
      <button onClick={handleNext} style={{ cursor: 'pointer', padding: '8px 16px', borderRadius: '20px', border: 'none', background: 'white', color: 'black', fontWeight: 'bold' }}>
        Next
      </button>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
        <Routes>
          <Route path="/" element={<Navigate to={designs[0].path} replace />} />
          {designs.map((design) => (
            <Route
              key={design.path}
              path={design.path}
              element={
                <design.component
                  // Pass common props if needed, or specific ones
                  width="100vw"
                  height="100vh"
                />
              }
            />
          ))}
        </Routes>
        <Navigation />
      </div>
    </BrowserRouter>
  )
}

export default App
