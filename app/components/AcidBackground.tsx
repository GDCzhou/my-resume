'use client';
import { useEffect, useRef } from 'react';

/**
 * Galaxy 星空背景动画 — 纯 Canvas 2D，零依赖
 *
 * ✅ Canvas 有自己的深色太空背景（不透明）
 * ✅ 星星、星云、流星绘制在深色背景上，清晰可见
 * ✅ 简历卡片全透明，星空完全透出
 */
export default function AcidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;
    let mouse = { x: -1000, y: -1000 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMouse = (e: MouseEvent) => { mouse = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', handleMouse);

    // ===== 深色太空背景渐变 =====
    const drawBackground = () => {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, '#0a0a1a');   // 深蓝黑（顶部）
      bgGrad.addColorStop(0.5, '#0d1025'); // 深紫蓝（中间）
      bgGrad.addColorStop(1, '#0f0818');   // 深紫黑（底部）
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    // ===== 星星 =====
    interface Star {
      x: number; y: number; size: number; opacity: number; twinkleSpeed: number;
      twinkleOffset: number; hue: number; sat: number; light: number;
    }
    const stars: Star[] = [];
    const STAR_COUNT = 220;
    for (let i = 0; i < STAR_COUNT; i++) {
      const hueSet = [220, 260, 280, 300, 320, 200]; // 蓝紫粉青色系
      stars.push({
        x: Math.random() * 2000 - 500,
        y: Math.random() * 2000 - 500,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 3 + 1,
        twinkleOffset: Math.random() * Math.PI * 2,
        hue: hueSet[Math.floor(Math.random() * hueSet.length)] + Math.random() * 20 - 10,
        sat: 60 + Math.random() * 30,
        light: 85 + Math.random() * 15,
      });
    }

    // ===== 星云（彩色光晕）=====
    interface Nebula {
      x: number; y: number; radiusX: number; radiusY: number;
      rotation: number; hue: number; sat: number; light: number;
      opacity: number; driftSpeed: number; driftAngle: number;
    }
    const nebulae: Nebula[] = [];
    for (let i = 0; i < 6; i++) {
      nebulae.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radiusX: Math.random() * 400 + 200,
        radiusY: Math.random() * 280 + 140,
        rotation: Math.random() * Math.PI,
        hue: [250, 270, 290, 310, 200, 220][i],
        sat: 50 + Math.random() * 25,
        light: 65 + Math.random() * 15,
        opacity: 0.06 + Math.random() * 0.06, // 柔和可见的彩色光晕
        driftSpeed: 0.03 + Math.random() * 0.05,
        driftAngle: Math.random() * Math.PI * 2,
      });
    }

    // ===== 流星 =====
    interface ShootingStar {
      x: number; y: number; length: number; speed: number; angle: number;
      opacity: number; active: boolean; life: number; maxLife: number;
    }
    let shootingStar: ShootingStar | null = null;
    const spawnShootingStar = () => {
      shootingStar = {
        x: Math.random() * canvas.width * 1.5,
        y: -10,
        length: 80 + Math.random() * 120,
        speed: 8 + Math.random() * 10,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.4,
        opacity: 1,
        active: true,
        life: 0,
        maxLife: 50 + Math.random() * 35,
      };
    };

    // 动画循环
    const animate = () => {
      time += 0.006;

      // 🔑 关键：绘制深色太空背景（不透明！）
      drawBackground();

      // 绘制星云
      nebulae.forEach((n) => {
        n.x += Math.cos(n.driftAngle) * n.driftSpeed;
        n.y += Math.sin(n.driftAngle) * n.driftSpeed;
        n.rotation += 0.0003;

        if (n.x < -n.radiusX) n.x = canvas.width + n.radiusX;
        if (n.x > canvas.width + n.radiusX) n.x = -n.radiusX;
        if (n.y < -n.radiusY) n.y = canvas.height + n.radiusY;
        if (n.y > canvas.height + n.radiusY) n.y = -n.radiusY;

        const pulse = Math.sin(time * 0.4 + n.x * 0.0008) * 0.3 + 0.7;

        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.rotate(n.rotation);

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, n.radiusX);
        grad.addColorStop(0, `hsla(${n.hue}, ${n.sat}%, ${n.light}%, ${n.opacity * pulse})`);
        grad.addColorStop(0.5, `hsla(${n.hue + 12}, ${n.sat - 8}%, ${n.light - 3}%, ${n.opacity * pulse * 0.4})`);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, n.radiusX, n.radiusY, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 绘制星星
      stars.forEach((s) => {
        const twinkle = Math.sin(time * s.twinkleSpeed + s.twinkleOffset) * 0.4 + 0.6;
        const finalOpacity = s.opacity * twinkle;

        const dx = s.x - mouse.x;
        const dy = s.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const glowBoost = dist < 150 ? ((150 - dist) / 150) * 0.5 : 0;

        ctx.save();
        ctx.globalAlpha = Math.min(1, finalOpacity + glowBoost);

        // 光晕
        if (s.size > 1.3 || glowBoost > 0.08) {
          const glowSize = s.size * (3 + glowBoost * 3);
          const glowGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowSize);
          glowGrad.addColorStop(0, `hsla(${s.hue}, ${s.sat + 15}%, ${Math.min(95, s.light + 8)}%, ${0.4 + glowBoost * 0.35})`);
          glowGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(s.x, s.y, glowSize, 0, Math.PI * 2);
          ctx.fill();
        }

        // 核心
        ctx.fillStyle = `hsla(${s.hue}, ${s.sat}%, ${s.light}%, 1)`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // 流星
      // 流星 — 每帧 0.4% 概率生成一颗（约每 4 秒一颗）
      if (!shootingStar && Math.random() < 0.008) spawnShootingStar();

      if (shootingStar?.active) {
        shootingStar.life++;
        shootingStar.x += Math.cos(shootingStar.angle) * shootingStar.speed;
        shootingStar.y += Math.sin(shootingStar.angle) * shootingStar.speed;
        shootingStar.opacity = 1 - (shootingStar.life / shootingStar.maxLife);

        if (shootingStar.life >= shootingStar.maxLife ||
          shootingStar.x > canvas.width + 100 || shootingStar.y > canvas.height + 100) {
          shootingStar.active = false;
          shootingStar = null;
        } else {
          const tailX = shootingStar.x - Math.cos(shootingStar.angle) * shootingStar.length;
          const tailY = shootingStar.y - Math.sin(shootingStar.angle) * shootingStar.length;

          const trailGrad = ctx.createLinearGradient(tailX, tailY, shootingStar.x, shootingStar.y);
          trailGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          trailGrad.addColorStop(0.7, `rgba(200, 180, 255, ${shootingStar.opacity * 0.5})`);
          trailGrad.addColorStop(1, `rgba(255, 255, 255, ${shootingStar.opacity})`);

          ctx.strokeStyle = trailGrad;
          ctx.lineWidth = 1.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(shootingStar.x, shootingStar.y);
          ctx.stroke();
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
