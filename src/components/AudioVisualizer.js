'use client';

import React, { useEffect, useRef } from 'react';

export default function AudioVisualizer({ isPlaying = false, trackTitle = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let phase = 0;

    const numBars = 48;
    const barWidth = 4;
    const spacing = 3;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const startX = (width - (numBars * (barWidth + spacing))) / 2;

      for (let i = 0; i < numBars; i++) {
        const x = startX + i * (barWidth + spacing);
        let barHeight;

        if (isPlaying) {
          // Dynamic harmonic synthetic wave
          const wave1 = Math.sin(phase + i * 0.25);
          const wave2 = Math.cos(phase * 1.5 + i * 0.15);
          const wave3 = Math.sin(phase * 0.8 + i * 0.4);
          const combined = (wave1 + wave2 + wave3 + 3) / 6; // 0 to 1
          
          barHeight = Math.max(6, combined * (height * 0.85));
        } else {
          // Idle resting state
          barHeight = 4 + Math.sin(i * 0.3) * 2;
        }

        const y = height / 2 - barHeight / 2;

        // Gradient for each bar
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(0.5, '#06b6d4');
        gradient.addColorStop(1, '#ec4899');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [3]);
        ctx.fill();

        // Subtle glow effect for center bars when playing
        if (isPlaying && Math.abs(i - numBars / 2) < 10) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#8b5cf6';
        } else {
          ctx.shadowBlur = 0;
        }
      }

      if (isPlaying) {
        phase += 0.08;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying]);

  return (
    <div style={{
      width: '100%',
      height: '110px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      <canvas
        ref={canvasRef}
        width={380}
        height={100}
        style={{
          maxWidth: '100%',
          height: 'auto'
        }}
      />
    </div>
  );
}
