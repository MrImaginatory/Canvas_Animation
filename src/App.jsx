import { useState } from 'react'
import CanvasRings from './Designs/CanvasRings'
import MeshGrid from './Designs/MeshGrid'
import Rainbow from './Designs/Rainbow'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>

      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* <CanvasRings
      width="100vw"
      height="100vh"
      initialDark={false}
      spacing={20}
      baseRadius={2}
      maxRings={8}
    /> */}
    {/* <MeshGrid
        spacing={30}
        dotRadius={2}
        maxDistortion={40}
        dampening={0.08}
        quality={0.85}
        drawLines={false}
        initialDark={true}
      /> */}
        <Rainbow />
        
      </div>

    </>
  )
}

export default App
