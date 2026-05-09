import { useState, useEffect } from "react";
import React from "react";

/**
 * PixelRobot 组件
 * 像素艺术风格的机器人，带有 bobbing 动画
 */
export function PixelRobot({ className, style }: React.HTMLAttributes<HTMLDivElement>) {
  const [bobOffset, setBobOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBobOffset((prev) => (prev === 0 ? -2 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className={`pixel-robot${className ? ` ${className}` : ''}`}
      style={{
        ...style,
        transform: `translateY(${bobOffset}px)`,
        transition: 'transform 0.3s ease-in-out'
      }}
    >
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="pixel robot">
        {/* 机器人头部 */}
        <rect x="8" y="4" width="16" height="12" fill="#4A90E2" stroke="#000" strokeWidth="2"/>
        <circle cx="12" cy="8" r="2" fill="#000"/>
        <circle cx="20" cy="8" r="2" fill="#000"/>
        <rect x="10" y="12" width="4" height="2" fill="#000"/>
        <rect x="18" y="12" width="4" height="2" fill="#000"/>
        
        {/* 机器人身体 */}
        <rect x="6" y="16" width="20" height="12" fill="#4A90E2" stroke="#000" strokeWidth="2"/>
        
        {/* 机器人手臂 */}
        <rect x="2" y="18" width="4" height="8" fill="#4A90E2" stroke="#000" strokeWidth="2"/>
        <rect x="26" y="18" width="4" height="8" fill="#4A90E2" stroke="#000" strokeWidth="2"/>
        
        {/* 机器人腿部 */}
        <rect x="8" y="28" width="4" height="4" fill="#4A90E2" stroke="#000" strokeWidth="2"/>
        <rect x="20" y="28" width="4" height="4" fill="#4A90E2" stroke="#000" strokeWidth="2"/>
      </svg>
    </div>
  );
}