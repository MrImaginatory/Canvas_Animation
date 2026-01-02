import React, { useState } from 'react';
import './styles/Parallax.css';

const Parallax = ({ width = '100vw', height = '100vh' }) => {
  const [bgPos, setBgPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    // Logic: var x = (e.pageX * -1 / 2), y = (e.pageY * -1 / 2);
    // In React, we use clientX/clientY relative to viewport if position is fixed/absolute 
    // or nativeEvent.pageX if scrolling.
    // The provided snippet uses pageX.
    
    // We can use e.clientX if the container is full screen and fixed.
    const x = (e.clientX * -1 / 2);
    const y = (e.clientY * -1 / 2);
    setBgPos({ x, y });
  };

  return (
    <div 
      className="parallax-wrap" 
      style={{ 
        width, 
        height, 
        backgroundPosition: `${bgPos.x}px ${bgPos.y}px` 
      }}
      onMouseMove={handleMouseMove}
    >
      <h2>Easy Peasy Parallax</h2>
      <h4>Only a few lines of React</h4>
    </div>
  );
};

export default Parallax;
