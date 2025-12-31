import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PLAYGROUND_ITEMS } from '../data/playground';

const PREVIEW_BASE_WIDTH = 1200;
const PREVIEW_BASE_HEIGHT = 800;
const PREVIEW_SCALE = 0.1;
const CANVAS_OFFSET_X = 360;
const CANVAS_OFFSET_Y = 40;

const IframeThumbnail: React.FC<{ title: string; src: string; focus?: 'canvas' }> = ({
  title,
  src,
  focus
}) => {
  const translateX = focus === 'canvas' ? CANVAS_OFFSET_X : 0;
  const translateY = focus === 'canvas' ? CANVAS_OFFSET_Y : 0;
  return (
    <div className="w-24 h-16 rounded-lg border border-neutral-800 bg-neutral-950/70 overflow-hidden">
      <iframe
        title={`${title} preview`}
        src={src}
        className="pointer-events-none"
        style={{
          width: `${PREVIEW_BASE_WIDTH}px`,
          height: `${PREVIEW_BASE_HEIGHT}px`,
          transform: `translate(-${translateX}px, -${translateY}px) scale(${PREVIEW_SCALE})`,
          transformOrigin: 'top left'
        }}
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};

const HalftoneThumbnail: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const width = 120;
  const height = 80;
  const frames = 60;
  const spacing = 8;
  const rMin = 0.6;
  const rMax = 4;
  const waveScale = 0.05;
  const waveSpeed = 1;
  const background = '#0b1020';
  const foreground = '#b7f7dc';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return undefined;
    }

    canvas.width = width;
    canvas.height = height;

    const xs: number[] = [];
    for (let x = Math.floor(spacing / 2); x < width; x += spacing) {
      xs.push(x);
    }
    const ys: number[] = [];
    for (let y = Math.floor(spacing / 2); y < height; y += spacing) {
      ys.push(y);
    }

    const drawFrame = (frameIndex: number) => {
      const t = (2 * Math.PI * waveSpeed * frameIndex) / frames;
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
      const base = (rMin + rMax) / 2;
      const amp = (rMax - rMin) / 2;

      for (const cy of ys) {
        for (const cx of xs) {
          const dx = (cx - width / 2) * waveScale;
          const dy = (cy - height / 2) * waveScale;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const spokes = Math.cos(angle * 8 + t * 2);
          const pulse = Math.sin(dist * 10 - t);
          const wave = 0.55 * pulse + 0.45 * spokes;
          const radius = Math.min(rMax, Math.max(rMin, base + amp * wave));

          ctx.beginPath();
          ctx.fillStyle = foreground;
          ctx.ellipse(cx, cy, radius, radius, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const tick = () => {
      frameRef.current = (frameRef.current + 1) % frames;
      drawFrame(frameRef.current);
      animationRef.current = requestAnimationFrame(tick);
    };

    drawFrame(frameRef.current);
    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="w-24 h-16 rounded-lg border border-neutral-800 bg-neutral-950/70 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

const CellularAutomataThumbnail: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const cols = 22;
  const rows = 14;
  const cellSize = 8;
  const width = cols * cellSize;
  const height = rows * cellSize;
  const stepMs = 180;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return undefined;
    }

    canvas.width = width;
    canvas.height = height;

    const makeGrid = () => Array.from({ length: rows }, () => Array(cols).fill(0));

    const placePattern = (target: number[][], pattern: number[][]) => {
      const offsetX = Math.floor((cols - pattern[0].length) / 2);
      const offsetY = Math.floor((rows - pattern.length) / 2);
      pattern.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell && target[offsetY + y] && target[offsetY + y][offsetX + x] !== undefined) {
            target[offsetY + y][offsetX + x] = 1;
          }
        });
      });
    };

    const diehardPattern = [
      [0, 0, 0, 0, 0, 0, 1, 0],
      [1, 1, 0, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 1, 1, 1]
    ];

    let grid = makeGrid();
    placePattern(grid, diehardPattern);

    const countNeighbors = (x: number, y: number) => {
      let count = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = (x + dx + cols) % cols;
          const ny = (y + dy + rows) % rows;
          count += grid[ny][nx];
        }
      }
      return count;
    };

    const step = () => {
      const next = Array.from({ length: rows }, () => Array(cols).fill(0));
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          const neighbors = countNeighbors(x, y);
          const alive = grid[y][x] === 1;
          next[y][x] = alive ? (neighbors === 2 || neighbors === 3 ? 1 : 0) : neighbors === 3 ? 1 : 0;
        }
      }
      grid = next;
    };

    const draw = () => {
      ctx.fillStyle = '#0b0f1b';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= cols; x += 1) {
        ctx.beginPath();
        ctx.moveTo(x * cellSize + 0.5, 0);
        ctx.lineTo(x * cellSize + 0.5, height);
        ctx.stroke();
      }
      for (let y = 0; y <= rows; y += 1) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellSize + 0.5);
        ctx.lineTo(width, y * cellSize + 0.5);
        ctx.stroke();
      }

      ctx.fillStyle = '#5eead4';
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          if (grid[y][x]) {
            ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
          }
        }
      }
    };

    const tick = (time: number) => {
      if (time - lastTickRef.current >= stepMs) {
        step();
        draw();
        lastTickRef.current = time;
      }
      animationRef.current = requestAnimationFrame(tick);
    };

    draw();
    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="w-24 h-16 rounded-lg border border-neutral-800 bg-neutral-950/70 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};


const PlaygroundThumbnail: React.FC<{ id: string; title: string; previewPath?: string }> = ({
  id,
  title,
  previewPath
}) => {
  if (id === 'cellular-automata' && previewPath) {
    return <CellularAutomataThumbnail />;
  }
  if (id === 'halftone-loop') {
    return <HalftoneThumbnail />;
  }
  if (id === 'location-pulse') {
    return <LocationPulseThumbnail />;
  }
  return (
    <div className="w-24 h-16 rounded-lg border border-neutral-800 bg-neutral-950/70 flex items-center justify-center">
      <span className="text-[10px] uppercase tracking-widest text-neutral-500">
        {title.split(' ')[0]}
      </span>
    </div>
  );
};

const LocationPulseThumbnail: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return undefined;
    }

    const width = 120;
    const height = 80;
    canvas.width = width;
    canvas.height = height;

    const draw = (time: number) => {
      const t = (time / 1000) % 2;
      const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI);

      ctx.fillStyle = '#050608';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#111827';
      ctx.fillRect(6, 6, 80, 10);
      ctx.fillRect(6, 20, 80, 8);
      ctx.fillRect(6, 32, 46, 12);
      ctx.fillRect(56, 32, 30, 12);
      ctx.fillRect(6, 48, 40, 10);
      ctx.fillRect(50, 48, 36, 10);

      const mapX = 90;
      const mapY = 6;
      const mapW = 24;
      const mapH = 20;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(mapX, mapY, mapW, mapH);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.strokeRect(mapX, mapY, mapW, mapH);

      const centerX = mapX + mapW * 0.55;
      const centerY = mapY + mapH * 0.55;
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 1.6 + pulse * 0.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(244, 63, 94, 0.5)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3 + pulse * 2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#0b0f1b';
      ctx.fillRect(mapX, mapY + mapH + 4, mapW, 8);
    };

    const tick = (time: number) => {
      draw(time);
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="w-24 h-16 rounded-lg border border-neutral-800 bg-neutral-950/70 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

const Playground: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-6 pb-24 animate-in fade-in duration-500">
      <div className="mb-16">
        <h1 className="text-4xl font-bold text-white mb-4">Playground</h1>
        <p className="text-neutral-300 text-lg max-w-2xl">
          Experiments, visualizers, and interactive prototypes.
        </p>
      </div>

      <div className="space-y-4">
        {PLAYGROUND_ITEMS.map((item) => (
          <Link
            key={item.id}
            to={`/playground/${item.id}`}
            className="flex gap-4 items-start border border-neutral-800/70 rounded-xl px-6 py-5 bg-neutral-900/30 hover:border-neutral-600 transition-colors"
          >
            <PlaygroundThumbnail id={item.id} title={item.title} previewPath={item.previewPath} />
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">{item.title}</h2>
              <p className="text-neutral-300">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Playground;
