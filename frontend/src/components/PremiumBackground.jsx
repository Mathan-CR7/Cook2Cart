import { useState, useEffect } from 'react';

export default function PremiumBackground() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Calculate normalized position from center (-0.5 to 0.5)
      setMousePos({
        x: (e.clientX - window.innerWidth / 2) / 30,
        y: (e.clientY - window.innerHeight / 2) / 30,
      });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* Premium Tech Grid Patterns */}
      <div className="absolute inset-0 premium-grid-pattern opacity-95" />
      <div className="absolute inset-0 premium-grid-sub opacity-50" />

      {/* Floating Glowing Backdrop Orbs */}
      <div 
        className="absolute w-[600px] h-[600px] rounded-full opacity-[0.16] blur-[130px] transition-transform duration-500 ease-out"
        style={{ 
          background: 'radial-gradient(circle, #ff6b35 0%, transparent 70%)',
          top: '-200px',
          left: '-150px',
          transform: `translate(${mousePos.x * -0.4}px, ${mousePos.y * -0.4}px)`,
        }}
      />
      <div 
        className="absolute w-[500px] h-[500px] rounded-full opacity-[0.14] blur-[120px] transition-transform duration-500 ease-out"
        style={{ 
          background: 'radial-gradient(circle, #ff8e53 0%, transparent 70%)',
          bottom: '15%',
          right: '-100px',
          transform: `translate(${mousePos.x * 0.4}px, ${mousePos.y * 0.4}px)`,
        }}
      />
      <div 
        className="absolute w-[450px] h-[450px] rounded-full opacity-[0.08] blur-[100px] transition-transform duration-500 ease-out"
        style={{ 
          background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)',
          top: '35%',
          left: '25%',
          transform: `translate(${mousePos.x * 0.2}px, ${mousePos.y * -0.2}px)`,
        }}
      />

      {/* Slowly Rotating SVG Thin Geometries */}
      <svg className="absolute top-[8%] left-[-150px] w-[380px] h-[380px] text-[#ff6b35]/20 animate-spin-slow opacity-60" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.25" strokeDasharray="3 3" />
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="0.15" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.1" />
        <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.1" />
      </svg>

      <svg className="absolute bottom-[20%] right-[-150px] w-[420px] h-[420px] text-[#ff8e53]/15 animate-spin-counter opacity-50" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.2" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="0.25" strokeDasharray="6 4" />
        <rect x="20" y="20" width="60" height="60" fill="none" stroke="currentColor" strokeWidth="0.1" strokeDasharray="1 5" />
      </svg>

      {/* Ambient Parallax Floating Food Emojis */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <span 
          className="absolute left-[8%] top-[22%] text-4xl opacity-[0.14] animate-float transition-transform duration-300 ease-out"
          style={{ transform: `translate(${mousePos.x * -0.6}px, ${mousePos.y * -0.6}px)` }}
        >
          🥑
        </span>
        <span 
          className="absolute right-[10%] top-[18%] text-4xl opacity-[0.15] animate-float-reverse transition-transform duration-300 ease-out"
          style={{ transform: `translate(${mousePos.x * 0.7}px, ${mousePos.y * 0.7}px)` }}
        >
          🍅
        </span>
        <span 
          className="absolute left-[5%] bottom-[32%] text-4xl opacity-[0.12] animate-float-reverse transition-transform duration-300 ease-out"
          style={{ transform: `translate(${mousePos.x * -0.5}px, ${mousePos.y * -0.5}px)` }}
        >
          🍋
        </span>
        <span 
          className="absolute right-[7%] bottom-[28%] text-4xl opacity-[0.15] animate-float transition-transform duration-300 ease-out"
          style={{ transform: `translate(${mousePos.x * 0.8}px, ${mousePos.y * 0.8}px)` }}
        >
          🥦
        </span>
        <span 
          className="absolute left-[40%] top-[5%] text-3xl opacity-[0.08] animate-float transition-transform duration-300 ease-out"
          style={{ transform: `translate(${mousePos.x * 0.3}px, ${mousePos.y * -0.3}px)` }}
        >
          🍳
        </span>
      </div>
    </div>
  );
}
