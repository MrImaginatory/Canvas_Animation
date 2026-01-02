import React from 'react'
import './styles/MatrixDesign.css'

export default function MatrixDesign() {
    return (
        <div className="matrix-wrapper">
            <div className="grid-container">
                <div className="plane">
                    <div className="grid"></div>
                    <div className="glow"></div>
                </div>
                <div className="plane">
                    <div className="grid"></div>
                    <div className="glow"></div>
                </div>
            </div>
            <h1>Lorem Ipsum</h1>
        </div>
    )
}
