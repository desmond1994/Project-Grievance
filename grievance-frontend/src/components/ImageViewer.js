import React, { useState, useRef, useEffect } from 'react';

export default function ImageViewer({ image, width = 400, height = 300 }) {
  const [zoom, setZoom] = useState(1.0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef();

  // Native wheel event with passive: false
  useEffect(() => {
    const handleWheel = (e) => {
      e.preventDefault(); // This only works on native events with passive: false
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(z => Math.max(0.5, Math.min(z + delta, 5)));
    };
    const node = containerRef.current;
    if (node) {
      node.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (node) {
        node.removeEventListener('wheel', handleWheel, { passive: false });
      }
    };
  }, []);

  const handleMouseDown = (e) => {
    setDragging(true);
    setStart({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  };
  const handleMouseMove = (e) => {
    if (dragging) {
      setPos({ x: e.clientX - start.x, y: e.clientY - start.y });
    }
  };
  const handleMouseUp = () => setDragging(false);

  const handleReset = () => {
    setZoom(1.0);
    setPos({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className="photo-viewer-container"
      style={{
        width,
        height,
        overflow: 'hidden',
        position: 'relative',
        background: '#f7f7f7',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: dragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="zoom-controls-overlay" style={{
        position: 'absolute',
        top: '10px',
        right: '16px',
        background: 'rgba(255,255,255,0.7)',
        borderRadius: '4px',
        padding: '2px 6px',
        display: 'flex',
        gap: '6px',
        zIndex: 2,
      }}>
        <button type="button" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>-</button>
        <button type="button" onClick={handleReset}>Reset</button>
        <button type="button" onClick={() => setZoom(z => Math.min(5, z + 0.25))}>+</button>
      </div>
      <img
  src={image}
  alt=""
  onLoad={() => console.log("✅ Image loaded:", image)}
  onError={(e) => {
    console.log("❌ Image failed:", image);
    // optional: hide broken image element
    e.currentTarget.style.display = "none";
  }}
  style={{
    pointerEvents: 'none',
    userSelect: 'none',
    width: `${width}px`,
    height: `${height}px`,
    objectFit: 'contain',
    transform: `scale(${zoom}) translate(${pos.x / zoom}px, ${pos.y / zoom}px)`,
    transition: dragging ? 'none' : 'transform 0.2s'
  }}
  draggable={false}
/>
    </div>
  );
}
