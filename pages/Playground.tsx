import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PLAYGROUND_ITEMS } from '../data/playground';
import orcidData from '../data/orcid-publications.json';

const PREVIEW_BASE_WIDTH = 1200;
const PREVIEW_BASE_HEIGHT = 800;
const PREVIEW_SCALE = 0.1;
const CANVAS_OFFSET_X = 360;
const CANVAS_OFFSET_Y = 40;
// Keep in sync with the initial canvas layout in pages/SynthCanvasPage.tsx.
const SYNTH_THUMB_MODULES = [
  { id: 'kbd1', type: 'keyboard', x: 20, y: 20, width: 220 },
  { id: 'osc1', type: 'osc', x: 320, y: 20, width: 220 },
  { id: 'flt1', type: 'filter', x: 620, y: 20, width: 220 },
  { id: 'env1', type: 'adsr', x: 320, y: 360, width: 220 },
  { id: 'vca1', type: 'vca', x: 620, y: 360, width: 220 },
  { id: 'out1', type: 'output', x: 920, y: 280, width: 220 },
  { id: 'lfo1', type: 'lfo', x: 20, y: 360, width: 220 },
  { id: 'scp1', type: 'scope', x: 920, y: 20, width: 240 }
];
const SYNTH_THUMB_CABLES = [
  { from: { moduleId: 'kbd1' }, to: { moduleId: 'osc1' } },
  { from: { moduleId: 'kbd1' }, to: { moduleId: 'env1' } },
  { from: { moduleId: 'env1' }, to: { moduleId: 'vca1' } },
  { from: { moduleId: 'osc1' }, to: { moduleId: 'flt1' } },
  { from: { moduleId: 'flt1' }, to: { moduleId: 'vca1' } },
  { from: { moduleId: 'vca1' }, to: { moduleId: 'out1' } },
  { from: { moduleId: 'lfo1' }, to: { moduleId: 'flt1' } },
  { from: { moduleId: 'vca1' }, to: { moduleId: 'scp1' } }
];

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

const computeThumbnailLayout = (
  nodes: string[],
  edges: Array<{ source: string; target: string; weight: number }>,
  width: number,
  height: number
) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.28;
  const positions = nodes.map((node, index) => {
    const angle = (index / nodes.length) * Math.PI * 2;
    return {
      id: node,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    };
  });
  const velocities = nodes.map(() => ({ x: 0, y: 0 }));
  const nodeIndex = new Map(nodes.map((node, index) => [node, index]));
  const steps = 140;
  const repulsion = 1200;
  const attraction = 0.05;
  const damping = 0.85;
  const margin = 6;

  for (let step = 0; step < steps; step += 1) {
    for (let i = 0; i < positions.length; i += 1) {
      for (let j = i + 1; j < positions.length; j += 1) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        velocities[i].x += fx;
        velocities[i].y += fy;
        velocities[j].x -= fx;
        velocities[j].y -= fy;
      }
    }

    edges.forEach((edge) => {
      const sourceIndex = nodeIndex.get(edge.source);
      const targetIndex = nodeIndex.get(edge.target);
      if (sourceIndex === undefined || targetIndex === undefined) {
        return;
      }
      const dx = positions[targetIndex].x - positions[sourceIndex].x;
      const dy = positions[targetIndex].y - positions[sourceIndex].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const strength = attraction * edge.weight;
      const fx = (dx / dist) * strength;
      const fy = (dy / dist) * strength;
      velocities[sourceIndex].x += fx;
      velocities[sourceIndex].y += fy;
      velocities[targetIndex].x -= fx;
      velocities[targetIndex].y -= fy;
    });

    for (let i = 0; i < positions.length; i += 1) {
      velocities[i].x *= damping;
      velocities[i].y *= damping;
      positions[i].x += velocities[i].x;
      positions[i].y += velocities[i].y;
      positions[i].x = Math.min(width - margin, Math.max(margin, positions[i].x));
      positions[i].y = Math.min(height - margin, Math.max(margin, positions[i].y));
    }
  }

  return new Map(positions.map((node) => [node.id, { x: node.x, y: node.y }]));
};

const PublicationsExplorerThumbnail: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const counts = new Map<string, number>();
    orcidData.publications.forEach((pub) => {
      const raw = pub.authors.includes(';') ? pub.authors.split(';') : pub.authors.split(',');
      raw
        .map((author) => author.trim())
        .filter(Boolean)
        .forEach((author) => {
          counts.set(author, (counts.get(author) ?? 0) + 1);
        });
    });

    const nodeLimit = Math.min(16, counts.size);
    const nodes = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, nodeLimit)
      .map(([author]) => author);

    const nodeSet = new Set(nodes);
    const edgeCounts = new Map<string, number>();
    orcidData.publications.forEach((pub) => {
      const raw = pub.authors.includes(';') ? pub.authors.split(';') : pub.authors.split(',');
      const filtered = raw
        .map((author) => author.trim())
        .filter((author) => nodeSet.has(author));
      for (let i = 0; i < filtered.length; i += 1) {
        for (let j = i + 1; j < filtered.length; j += 1) {
          const source = filtered[i];
          const target = filtered[j];
          const key = source < target ? `${source}|||${target}` : `${target}|||${source}`;
          edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
        }
      }
    });

    const edges = Array.from(edgeCounts.entries()).map(([key, weight]) => {
      const [source, target] = key.split('|||');
      return { source, target, weight };
    });
    const positions = computeThumbnailLayout(nodes, edges, width, height);

    ctx.fillStyle = '#050608';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    edges.forEach(({ source, target }) => {
      const sourcePos = positions.get(source);
      const targetPos = positions.get(target);
      if (!sourcePos || !targetPos) {
        return;
      }
      ctx.beginPath();
      ctx.moveTo(sourcePos.x, sourcePos.y);
      ctx.lineTo(targetPos.x, targetPos.y);
      ctx.stroke();
    });

    nodes.forEach((node, index) => {
      const pos = positions.get(node);
      if (!pos) {
        return;
      }
      const isPrimary = node.toLowerCase().includes('zeiger');
      ctx.beginPath();
      ctx.fillStyle = isPrimary ? '#f472b6' : index % 2 === 0 ? '#60a5fa' : '#34d399';
      ctx.arc(pos.x, pos.y, isPrimary ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
    });

    return undefined;
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
  if (id === 'publications-explorer') {
    return <PublicationsExplorerThumbnail />;
  }
  if (id === 'modular-synth') {
    return <SynthThumbnail />;
  }
  if (id === 'dungeon-designer' && previewPath) {
    return (
      <div className="w-24 h-16 rounded-lg border border-neutral-800 bg-neutral-950/70 overflow-hidden">
        <img src={previewPath} alt={`${title} preview`} className="w-full h-full object-cover" loading="lazy" />
      </div>
    );
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

const SynthThumbnail: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const modules = SYNTH_THUMB_MODULES;
    const cables = SYNTH_THUMB_CABLES;
    const moduleHeights: Record<string, number> = {
      scope: 190,
      output: 140,
      default: 160
    };
    const moduleColors: Record<string, string> = {
      keyboard: '#0f172a',
      osc: '#111827',
      filter: '#0b1120',
      adsr: '#111827',
      vca: '#0f172a',
      output: '#111827',
      lfo: '#0b1120',
      scope: '#0f172a'
    };

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    modules.forEach((module) => {
      const moduleHeight = moduleHeights[module.type] ?? moduleHeights.default;
      minX = Math.min(minX, module.x);
      minY = Math.min(minY, module.y);
      maxX = Math.max(maxX, module.x + module.width);
      maxY = Math.max(maxY, module.y + moduleHeight);
    });

    const padding = 6;
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = Math.min((width - padding * 2) / rangeX, (height - padding * 2) / rangeY);
    const extraX = width - padding * 2 - rangeX * scale;
    const extraY = height - padding * 2 - rangeY * scale;
    const offsetX = padding + extraX / 2 - minX * scale;
    const offsetY = padding + extraY / 2 - minY * scale;

    const mapPoint = (x: number, y: number) => ({
      x: x * scale + offsetX,
      y: y * scale + offsetY
    });

    ctx.fillStyle = '#050608';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
    ctx.lineWidth = 1;
    const gridSize = 120;
    const gridStartX = Math.floor(minX / gridSize) * gridSize;
    const gridStartY = Math.floor(minY / gridSize) * gridSize;
    for (let x = gridStartX; x <= maxX; x += gridSize) {
      const mappedX = mapPoint(x, minY).x;
      ctx.beginPath();
      ctx.moveTo(mappedX, padding);
      ctx.lineTo(mappedX, height - padding);
      ctx.stroke();
    }
    for (let y = gridStartY; y <= maxY; y += gridSize) {
      const mappedY = mapPoint(minX, y).y;
      ctx.beginPath();
      ctx.moveTo(padding, mappedY);
      ctx.lineTo(width - padding, mappedY);
      ctx.stroke();
    }

    const moduleCenters = new Map<string, { x: number; y: number }>();

    modules.forEach((module) => {
      const moduleHeight = moduleHeights[module.type] ?? moduleHeights.default;
      const center = mapPoint(module.x + module.width / 2, module.y + moduleHeight / 2);
      moduleCenters.set(module.id, center);
    });

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1.5;
    cables.forEach((cable) => {
      const from = moduleCenters.get(cable.from.moduleId);
      const to = moduleCenters.get(cable.to.moduleId);
      if (!from || !to) {
        return;
      }
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    });

    const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    modules.forEach((module) => {
      const moduleHeight = moduleHeights[module.type] ?? moduleHeights.default;
      const topLeft = mapPoint(module.x, module.y);
      const moduleWidth = module.width * scale;
      const scaledHeight = moduleHeight * scale;
      const fill = moduleColors[module.type] ?? '#0f172a';
      drawRoundedRect(topLeft.x, topLeft.y, moduleWidth, scaledHeight, 6);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(topLeft.x, topLeft.y, moduleWidth, Math.min(10 * scale + 4, scaledHeight));

      if (module.type === 'scope') {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.beginPath();
        ctx.moveTo(topLeft.x + moduleWidth * 0.2, topLeft.y + scaledHeight * 0.6);
        ctx.lineTo(topLeft.x + moduleWidth * 0.45, topLeft.y + scaledHeight * 0.5);
        ctx.lineTo(topLeft.x + moduleWidth * 0.7, topLeft.y + scaledHeight * 0.6);
        ctx.stroke();
      }
    });

    return undefined;
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
