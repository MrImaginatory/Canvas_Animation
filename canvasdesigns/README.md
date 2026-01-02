# Canvas Designs Collection

A collection of beautiful, interactive, and reusable canvas-based visual components for React applications. Each component features smooth animations, mouse interactions, and light/dark mode support.

## 🎨 Components

### 1. **CanvasRings**
Interactive concentric rings that respond to cursor movement with dynamic color gradients.

### 2. **MeshGrid**
A fluid mesh grid with physics-based distortion effects that follow your cursor.

### 3. **Rainbow**
A sophisticated WebGL particle system with beautiful color transitions and wave propagation effects.

### 4. **Orb**
An animated orb with optional microphone audio reactivity for voice-responsive visualizations.

## 🚀 Features

- ✨ **Fully Interactive** - All components respond to mouse/touch input
- 🌓 **Light/Dark Mode** - Built-in theme switching
- 📱 **Responsive** - Automatically adapts to container size
- 🎯 **Zero Dependencies*** - Except Rainbow (requires OGL)
- ⚡ **Performance Optimized** - RequestAnimationFrame & efficient rendering
- 🎨 **Customizable** - Extensive prop-based configuration
- ♿ **Accessible** - Keyboard-friendly controls

## 📦 Installation

```bash
# Clone the repository
git clone <your-repo-url>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Dependencies

```json
{
  "react": "^18.x",
  "react-dom": "^18.x",
  "ogl": "^1.x" // Only for Rainbow component
}
```

## 💻 Usage

### CanvasRings

```jsx
import CanvasRings from './Designs/CanvasRings'

function App() {
  return (
    <CanvasRings
      width="100vw"
      height="100vh"
      baseRadius={1.5}
      spacing={20}
      padding={20}
      maxRings={10}
      initialDark={false}
      showToggle={true}
      lightPalette={['#1a1a1a', '#304ffe', '#00b8d4', ...]}
      darkPalette={['#e0e0e0', '#82b1ff', '#80d8ff', ...]}
    />
  )
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | string | `'100vw'` | Container width |
| `height` | string | `'100vh'` | Container height |
| `baseRadius` | number | `1.5` | Base dot radius in pixels |
| `spacing` | number | `20` | Space between dots |
| `padding` | number | `20` | Edge padding |
| `maxRings` | number | `10` | Number of concentric rings |
| `lightPalette` | string[] | [...] | Colors for light mode |
| `darkPalette` | string[] | [...] | Colors for dark mode |
| `initialDark` | boolean | `false` | Start in dark mode |
| `showToggle` | boolean | `true` | Show theme toggle button |
| `className` | string | - | Additional CSS class |

---

### MeshGrid

```jsx
import MeshGrid from './Designs/MeshGrid'

function App() {
  return (
    <MeshGrid
      width="100vw"
      height="100vh"
      spacing={30}
      dotRadius={2}
      maxDistortion={10}
      dampening={0.08}
      quality={0.85}
      drawLines={false}
      initialDark={true}
    />
  )
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | string | `'100vw'` | Container width |
| `height` | string | `'100vh'` | Container height |
| `spacing` | number | `30` | Grid spacing |
| `dotRadius` | number | `2` | Dot size |
| `maxDistortion` | number | `10` | Max distortion distance |
| `dampening` | number | `0.08` | Physics dampening factor |
| `quality` | number | `0.85` | Render quality (0.5-1.0) |
| `drawLines` | boolean | `false` | Connect dots with lines |
| `initialDark` | boolean | `true` | Start in dark mode |
| `className` | string | - | Additional CSS class |

---

### Rainbow

```jsx
import Rainbow from './Designs/Rainbow'

function App() {
  return (
    <Rainbow
      className="my-rainbow"
      style={{ width: '100%', height: '100vh' }}
      initialDark={true}
      showToggle={true}
    />
  )
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | string | - | CSS class name |
| `style` | object | - | Inline styles |
| `initialDark` | boolean | `true` | Start in dark mode |
| `showToggle` | boolean | `true` | Show theme toggle button |

**Note:** Requires the `ogl` library to be installed.

---

### Orb

```jsx
import Orb from './Designs/Orb'

function App() {
  return (
    <Orb
      className="my-orb"
      enableMic={true}
      size={150}
      showOnlyPrimary={true}
    />
  )
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | string | - | CSS class name |
| `style` | object | - | Inline styles |
| `enableMic` | boolean | `true` | Enable microphone audio reactivity |
| `size` | number | `150` | Orb size in pixels |
| `showOnlyPrimary` | boolean | `true` | Show only primary orb layer |

**Note:** Requires microphone permissions when `enableMic={true}`.

---

## 🎯 Example Usage

```jsx
import { useState } from 'react'
import CanvasRings from './Designs/CanvasRings'
import MeshGrid from './Designs/MeshGrid'
import Rainbow from './Designs/Rainbow'
import Orb from './Designs/Orb'

function App() {
  const [activeDesign, setActiveDesign] = useState('rings')

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {/* Navigation */}
      <nav style={{ position: 'absolute', top: 20, left: 20, zIndex: 100 }}>
        <button onClick={() => setActiveDesign('rings')}>Rings</button>
        <button onClick={() => setActiveDesign('mesh')}>Mesh</button>
        <button onClick={() => setActiveDesign('rainbow')}>Rainbow</button>
        <button onClick={() => setActiveDesign('orb')}>Orb</button>
      </nav>

      {/* Render active design */}
      {activeDesign === 'rings' && <CanvasRings />}
      {activeDesign === 'mesh' && <MeshGrid />}
      {activeDesign === 'rainbow' && <Rainbow />}
      {activeDesign === 'orb' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <Orb enableMic={true} size={200} />
        </div>
      )}
    </div>
  )
}

export default App
```

## 🛠️ Tech Stack

- **React 18** - UI framework
- **Canvas API** - 2D rendering
- **WebGL (OGL)** - 3D graphics for Rainbow component
- **Web Audio API** - Audio reactivity for Orb component
- **RequestAnimationFrame** - Smooth animations

## 📁 Project Structure

```
├── src/
│   ├── Designs/
│   │   ├── CanvasRings.jsx
│   │   ├── MeshGrid.jsx
│   │   ├── Rainbow.jsx
│   │   ├── Orb.jsx
│   │   └── Orb.css
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── package.json
└── README.md
```

## 🎨 Customization Tips

### Custom Color Palettes

```jsx
const customPalette = [
  '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#FFA07A', '#98D8C8', '#F7DC6F'
]

<CanvasRings lightPalette={customPalette} darkPalette={customPalette} />
```

### Responsive Sizing

```jsx
// Full viewport
<MeshGrid width="100vw" height="100vh" />

// Fixed container
<div style={{ width: 800, height: 600 }}>
  <Rainbow />
</div>

// Flex container
<div style={{ flex: 1, display: 'flex' }}>
  <CanvasRings width="100%" height="100%" />
</div>
```

### Performance Tuning

```jsx
// Lower quality for better performance
<MeshGrid quality={0.5} spacing={40} />

// Reduce particles
<CanvasRings spacing={30} maxRings={5} />
```

## 🐛 Known Issues

- **Rainbow Component**: Requires WebGL2 support
- **Orb Component**: Microphone permission required for audio reactivity
- **Safari**: Some blur effects may render differently

## 📝 License

MIT License - feel free to use in personal and commercial projects.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Contact

mr_imaginatory - [@mr_imaginatory](https://x.com/mr_imaginatory)

Project Link: [https://github.com/MrImaginatory/Canvas_Animation](https://github.com/MrImaginatory/Canvas_Animation)

---

**Made with ❤️ by Illusionary on Canvas**