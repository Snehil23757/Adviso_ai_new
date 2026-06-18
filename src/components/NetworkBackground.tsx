/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Packet {
  fromNode: Node;
  toNode: Node;
  progress: number;
  speed: number;
}

export default function NetworkBackground({ active = true }: { active?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const nodes: Node[] = [];
    const packets: Packet[] = [];
    const nodeCount = 50;
    const maxDistance = 140;

    // Generate nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1.5,
      });
    }

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement.clientHeight || window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      if (!active) return;

      // Draw connections
      ctx.lineWidth = 0.5;
      for (let i = 0; i < nodeCount; i++) {
        const n1 = nodes[i];
        
        // Slow movement update
        n1.x += n1.vx;
        n1.y += n1.vy;

        // Bounce walls
        if (n1.x < 0 || n1.x > width) n1.vx *= -1;
        if (n1.y < 0 || n1.y > height) n1.vy *= -1;

        for (let j = i + 1; j < nodeCount; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.15;
            ctx.strokeStyle = `rgba(0, 136, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();

            // Randomly generate packets
            if (Math.random() < 0.001) {
              packets.push({
                fromNode: n1,
                toNode: n2,
                progress: 0,
                speed: 0.005 + Math.random() * 0.01,
              });
            }
          }
        }
      }

      // Draw packets (flowing data nodes)
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.progress += p.speed;

        if (p.progress >= 1) {
          packets.splice(i, 1);
          continue;
        }

        const currX = p.fromNode.x + (p.toNode.x - p.fromNode.x) * p.progress;
        const currY = p.fromNode.y + (p.toNode.y - p.fromNode.y) * p.progress;

        ctx.fillStyle = "rgba(0, 240, 255, 0.8)";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#00f0ff";
        ctx.beginPath();
        ctx.arc(currX, currY, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      }

      // Draw nodes
      ctx.shadowBlur = 0;
      for (let i = 0; i < nodeCount; i++) {
        const n = nodes[i];
        ctx.fillStyle = "rgba(0, 136, 255, 0.5)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [active]);

  return (
    <canvas
      className="absolute inset-0 w-full h-full pointer-events-none opacity-60 mix-blend-screen"
      ref={canvasRef}
    />
  );
}
