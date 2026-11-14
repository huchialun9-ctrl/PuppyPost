import React, { useEffect, useRef } from 'react';

interface CelebrationBurstProps {
  triggerId: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  rotation: number;
  vRot: number;
  phase: number;
  vPhase: number;
  shape: 'ribbon' | 'rect' | 'diamond';
  alpha: number;
}

const COLORS = ['#E21B3C', '#1368CE', '#FFD23F', '#26890C', '#FFFFFF', '#FF6B35'];

export const CelebrationBurst: React.FC<CelebrationBurstProps> = ({ triggerId }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (triggerId === 0) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const w = canvas.width;
    const h = canvas.height;
    const origins = [
      { x: w * 0.2, y: h * 0.65, angleMin: -1.35, angleMax: -0.55 },
      { x: w * 0.8, y: h * 0.65, angleMin: -2.59, angleMax: -1.79 },
      { x: w * 0.5, y: h * 0.45, angleMin: -Math.PI, angleMax: 0 },
    ];

    const shapes: Particle['shape'][] = ['ribbon', 'rect', 'diamond'];
    for (let i = 0; i < 96; i++) {
      const origin = origins[i % origins.length];
      const angle =
        origin.angleMin + Math.random() * (origin.angleMax - origin.angleMin);
      const speed = 7 + Math.random() * 12;
      const shape = shapes[i % shapes.length];
      particlesRef.current.push({
        x: origin.x + (Math.random() - 0.5) * 40,
        y: origin.y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 4 + 2),
        w: shape === 'ribbon' ? 6 + Math.random() * 4 : 8 + Math.random() * 5,
        h: shape === 'ribbon' ? 18 + Math.random() * 10 : 8 + Math.random() * 5,
        color: COLORS[i % COLORS.length],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.22,
        phase: Math.random() * Math.PI * 2,
        vPhase: 0.15 + Math.random() * 0.15,
        shape,
        alpha: 1,
      });
    }

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const active: Particle[] = [];

      for (const p of particlesRef.current) {
        p.vy += 0.32; // gravity
        p.vx *= 0.985; // air drag
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;
        p.phase += p.vPhase;

        if (p.y > canvas.height * 0.8) {
          p.alpha -= 0.035;
        } else {
          p.alpha -= 0.004;
        }

        if (p.alpha > 0.02 && p.y < canvas.height + 40) {
          active.push(p);
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          const flutter = Math.max(0.25, Math.abs(Math.cos(p.phase)));
          ctx.scale(1, flutter);
          ctx.fillStyle = p.color;

          if (p.shape === 'diamond') {
            ctx.beginPath();
            ctx.moveTo(0, -p.h / 2);
            ctx.lineTo(p.w / 2, 0);
            ctx.lineTo(0, p.h / 2);
            ctx.lineTo(-p.w / 2, 0);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          }
          ctx.restore();
        }
      }

      particlesRef.current = active;
      if (active.length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [triggerId]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[60]"
    />
  );
};
