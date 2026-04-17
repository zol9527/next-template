import { useState, useEffect } from "react";

/**
 * PixelCoin 组件
 * 像素艺术风格的旋转硬币动画
 */
export function PixelCoin() {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 10) % 360);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="pixel-coin"
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 0.1s linear'
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="20" height="20" fill="#FFD700" stroke="#000" strokeWidth="2"/>
        <circle cx="12" cy="12" r="8" fill="#FFA500" stroke="#000" strokeWidth="2"/>
        <text x="12" y="15" fontSize="10" textAnchor="middle" fill="#000" fontFamily="monospace">COIN</text>
      </svg>
    </div>
  );
}