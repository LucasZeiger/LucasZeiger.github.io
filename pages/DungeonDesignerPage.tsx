import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DungeonGenerator, DungeonConfig } from '../playground/dungeon/generator';
import { GenEvent, Overlay, Tile } from '../playground/dungeon/types';

const BASE_CELL = 10;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;

const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

const DEFAULTS = {
  seed: 'dungeon-001',
  gridW: 80,
  gridH: 50,
  speed: 60,
  zoom: 1,
  maxDepth: 5,
  minLeafSize: 14,
  roomMinSize: 6,
  roomMargin: 2,
  targetFill: 0.55,
  roomBuffer: 1,
  kNearest: 4,
  maxLoops: 6,
  extraLoopChance: 0.35,
  roomPenalty: 40,
  turnPenalty: 0,
  reuseCorridorsBias: 1.1
};

function tileColor(t: number): string {
  // Keep simple + legible. Adjust later if you want theming.
  switch (t) {
    case Tile.Wall:
      return '#101218';
    case Tile.Room:
      return '#2a6fdb';
    case Tile.Corridor:
      return '#e5b454';
    case Tile.Door:
      return '#e46a6a';
    default:
      return '#000000';
  }
}

function drawRectOutline(
  ctx: CanvasRenderingContext2D,
  r: { x: number; y: number; w: number; h: number },
  cell: number,
  stroke: string
) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1, Math.floor(cell / 8));
  ctx.strokeRect(r.x * cell + 0.5, r.y * cell + 0.5, r.w * cell, r.h * cell);
}

function drawDungeon(params: {
  ctx: CanvasRenderingContext2D;
  tiles: Uint8Array;
  width: number;
  height: number;
  cell: number;
  overlay: Overlay | null;
}) {
  const { ctx, tiles, width, height, cell, overlay } = params;

  ctx.clearRect(0, 0, width * cell, height * cell);

  // grid cells
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = tiles[y * width + x];
      ctx.fillStyle = tileColor(t);
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  // overlays (transparent decision aids)
  if (!overlay) return;

  ctx.save();
  ctx.globalAlpha = 0.9;

  if (overlay.partitions) {
    for (const r of overlay.partitions) drawRectOutline(ctx, r, cell, 'rgba(255,255,255,0.22)');
  }

  if (overlay.roomLeaf) drawRectOutline(ctx, overlay.roomLeaf, cell, 'rgba(255,255,255,0.6)');
  if (overlay.roomCandidates) {
    ctx.globalAlpha = 0.55;
    for (const c of overlay.roomCandidates) drawRectOutline(ctx, c.rect, cell, 'rgba(0,255,255,0.35)');
    ctx.globalAlpha = 0.9;
  }
  if (overlay.chosenRoom) drawRectOutline(ctx, overlay.chosenRoom, cell, 'rgba(0,255,255,0.9)');

  if (overlay.corridorPlan?.path) {
    // show planned corridor path (full), and how far carving progressed
    const path = overlay.corridorPlan.path;
    const n = overlay.carvingIndex ?? 0;

    ctx.globalAlpha = 0.35;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      ctx.fillRect(p.x * cell, p.y * cell, cell, cell);
    }

    ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < Math.min(n, path.length); i++) {
      const p = path[i];
      ctx.fillRect(p.x * cell, p.y * cell, cell, cell);
    }
  }

  ctx.restore();
}

function formatEventSummary(e: GenEvent): string {
  switch (e.type) {
    case 'init':
      return `Seed "${e.seed}", grid ${e.width}x${e.height}`;
    case 'split-chosen':
      return `Split ${e.chosen.orientation} @ ${e.chosen.line} (candidates: ${e.candidates.length})`;
    case 'split-skipped':
      return `Split skipped: ${e.reason}`;
    case 'room-chosen':
      return `Room chosen in leaf ${e.leafId} (candidates: ${e.candidates.length})`;
    case 'room-fallback':
      return `Room fallback in leaf ${e.leafId}: ${e.reason}`;
    case 'graph-edge-considered':
      return `${e.accepted ? 'Accepted' : 'Rejected'} edge ${e.edge.a}-${e.edge.b} (${e.reason})`;
    case 'graph-loop-added':
      return `Loop edge added ${e.edge.a}-${e.edge.b}`;
    case 'corridor-path-found':
      return `Corridor path planned ${e.plan.fromRoom}->${e.plan.toRoom} (len ${e.plan.stats.pathLen}, visited ${e.plan.stats.visited})`;
    case 'corridor-carve-cell':
      return `Carving corridor: ${e.index}/${e.total}`;
    case 'door-placed':
      return `Door placed for room ${e.roomId}`;
    case 'done':
      return `Done: rooms=${e.rooms}, corridors=${e.corridors}`;
    default:
      return 'Event';
  }
}

function encodeTilesRle(data: Uint8Array): number[][] {
  const out: number[][] = [];
  if (data.length === 0) return out;
  let current = data[0];
  let count = 1;
  for (let i = 1; i < data.length; i++) {
    const v = data[i];
    if (v === current) {
      count++;
    } else {
      out.push([current, count]);
      current = v;
      count = 1;
    }
  }
  out.push([current, count]);
  return out;
}

export default function DungeonDesignerPage() {
  const description =
    'Traditional rooms + corridors built step-by-step with transparent decisions (binary space partitioning -> rooms -> minimum spanning tree -> A* path carving).';
  const getTouchDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const [seed, setSeed] = useState(DEFAULTS.seed);
  const [mode, setMode] = useState<'basic' | 'advanced'>('basic');
  const [gridW, setGridW] = useState(DEFAULTS.gridW);
  const [gridH, setGridH] = useState(DEFAULTS.gridH);
  const [speed, setSpeed] = useState(DEFAULTS.speed); // steps/sec
  const [zoom, setZoom] = useState(DEFAULTS.zoom);
  const [maxDepth, setMaxDepth] = useState(DEFAULTS.maxDepth);
  const [minLeafSize, setMinLeafSize] = useState(DEFAULTS.minLeafSize);
  const [roomMinSize, setRoomMinSize] = useState(DEFAULTS.roomMinSize);
  const [roomMargin, setRoomMargin] = useState(DEFAULTS.roomMargin);
  const [targetFill, setTargetFill] = useState(DEFAULTS.targetFill);
  const [roomBuffer, setRoomBuffer] = useState(DEFAULTS.roomBuffer);
  const [kNearest, setKNearest] = useState(DEFAULTS.kNearest);
  const [maxLoops, setMaxLoops] = useState(DEFAULTS.maxLoops);
  const [extraLoopChance, setExtraLoopChance] = useState(DEFAULTS.extraLoopChance);
  const [roomPenalty, setRoomPenalty] = useState(DEFAULTS.roomPenalty);
  const [turnPenalty, setTurnPenalty] = useState(DEFAULTS.turnPenalty);
  const [reuseCorridorsBias, setReuseCorridorsBias] = useState(DEFAULTS.reuseCorridorsBias);

  const [running, setRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [eventLog, setEventLog] = useState<GenEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<GenEvent | null>(null);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [renderTick, setRenderTick] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const genRef = useRef<DungeonGenerator | null>(null);
  const fullscreenRef = useRef<HTMLDivElement | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const gridDirtyRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accRef = useRef<number>(0);
  const panRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0
  });
  const pinchRef = useRef({
    active: false,
    startDist: 0,
    startZoom: 1
  });

  const config: DungeonConfig = useMemo(
    () => ({
      width: gridW,
      height: gridH,
      maxDepth,
      minLeafSize,
      splitCandidates: 10,

      roomMinSize,
      roomMargin,
      roomCandidates: 30,
      targetFill,
      roomBuffer,

      kNearest,
      extraLoopChance,
      maxLoops,

      roomPenalty,
      reuseCorridorsBias,
      turnPenalty
    }),
    [
      gridW,
      gridH,
      maxDepth,
      minLeafSize,
      roomMinSize,
      roomMargin,
      targetFill,
      roomBuffer,
      kNearest,
      maxLoops,
      extraLoopChance,
      roomPenalty,
      reuseCorridorsBias,
      turnPenalty
    ]
  );

  const cell = Math.max(1, Math.round(BASE_CELL * zoom));
  const zoomPercent = Math.round(zoom * 100);
  const modeButtonStyle = (active: boolean) => ({
    padding: '6px 10px',
    border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: 8,
    background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
    color: 'inherit'
  });
  const isDefaults =
    seed === DEFAULTS.seed &&
    gridW === DEFAULTS.gridW &&
    gridH === DEFAULTS.gridH &&
    speed === DEFAULTS.speed &&
    zoom === DEFAULTS.zoom &&
    mode === 'basic' &&
    maxDepth === DEFAULTS.maxDepth &&
    minLeafSize === DEFAULTS.minLeafSize &&
    roomMinSize === DEFAULTS.roomMinSize &&
    roomMargin === DEFAULTS.roomMargin &&
    targetFill === DEFAULTS.targetFill &&
    roomBuffer === DEFAULTS.roomBuffer &&
    kNearest === DEFAULTS.kNearest &&
    maxLoops === DEFAULTS.maxLoops &&
    extraLoopChance === DEFAULTS.extraLoopChance &&
    roomPenalty === DEFAULTS.roomPenalty &&
    turnPenalty === DEFAULTS.turnPenalty &&
    reuseCorridorsBias === DEFAULTS.reuseCorridorsBias;

  function reset(newSeed?: string) {
    const s = (newSeed ?? seed).trim() || 'dungeon';
    const g = new DungeonGenerator(s, config);
    genRef.current = g;

    setEventLog([]);
    setCurrentEvent(null);
    setOverlay(g.getOverlay());
    setRenderTick((x) => x + 1);
  }

  function stepOnce() {
    const g = genRef.current;
    if (!g) return;
    const ev = g.nextStep();
    const ov = g.getOverlay();

    setCurrentEvent(ev);
    setOverlay(ov);
    setEventLog((prev) => {
      const next = prev.length > 2500 ? prev.slice(prev.length - 2000) : prev;
      return [...next, ev];
    });
    setRenderTick((x) => x + 1);
  }

  function fitZoomToCanvas() {
    const container = canvasWrapRef.current;
    if (!container) return;
    const innerWidth = Math.max(1, container.clientWidth - 24);
    const innerHeight = Math.max(1, container.clientHeight - 24);
    const fitZoom = Math.min(innerWidth / (gridW * BASE_CELL), innerHeight / (gridH * BASE_CELL));
    if (!Number.isFinite(fitZoom)) return;
    setZoom(clampZoom(fitZoom));
  }

  function handlePlayToggle() {
    if (!running && gridDirtyRef.current) {
      fitZoomToCanvas();
      gridDirtyRef.current = false;
    }
    setRunning((v) => !v);
  }

  function handleGridWChange(value: number) {
    setGridW(value);
    gridDirtyRef.current = true;
  }

  function handleGridHChange(value: number) {
    setGridH(value);
    gridDirtyRef.current = true;
  }

  function resetDefaults() {
    setSeed(DEFAULTS.seed);
    setGridW(DEFAULTS.gridW);
    setGridH(DEFAULTS.gridH);
    setSpeed(DEFAULTS.speed);
    setZoom(DEFAULTS.zoom);
    setMaxDepth(DEFAULTS.maxDepth);
    setMinLeafSize(DEFAULTS.minLeafSize);
    setRoomMinSize(DEFAULTS.roomMinSize);
    setRoomMargin(DEFAULTS.roomMargin);
    setTargetFill(DEFAULTS.targetFill);
    setRoomBuffer(DEFAULTS.roomBuffer);
    setKNearest(DEFAULTS.kNearest);
    setMaxLoops(DEFAULTS.maxLoops);
    setExtraLoopChance(DEFAULTS.extraLoopChance);
    setRoomPenalty(DEFAULTS.roomPenalty);
    setTurnPenalty(DEFAULTS.turnPenalty);
    setReuseCorridorsBias(DEFAULTS.reuseCorridorsBias);
    setMode('basic');
    gridDirtyRef.current = true;
  }

  function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function buildExportBundle() {
    const g = genRef.current;
    if (!g) return null;
    const st = g.getState();
    const { width, height } = st;
    const tiles = st.tiles;

    const tilesRle = encodeTilesRle(tiles);

    const connections = st.corridorPlans.map((plan, index) => ({
      id: `c${index + 1}`,
      fromRoomId: plan.fromRoom,
      toRoomId: plan.toRoom,
      doors: [plan.start, plan.goal],
      length: plan.path.length
    }));

    const neighbors = new Map<string, Set<string>>();
    for (const room of st.rooms) {
      neighbors.set(room.id, new Set());
    }
    for (const edge of st.graphAcceptedEdges) {
      neighbors.get(edge.a)?.add(edge.b);
      neighbors.get(edge.b)?.add(edge.a);
    }

    const rooms = st.rooms.map((room) => ({
      id: room.id,
      rect: room.rect,
      center: room.center,
      area: room.rect.w * room.rect.h,
      neighbors: Array.from(neighbors.get(room.id) ?? [])
    }));

    let doorCount = 0;
    let corridorTiles = 0;
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] === Tile.Door) doorCount++;
      if (tiles[i] === Tile.Corridor) corridorTiles++;
    }

    const roomVisited = new Set<string>();
    if (rooms.length > 0) {
      const queue = [rooms[0].id];
      roomVisited.add(rooms[0].id);
      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const next of neighbors.get(current) ?? []) {
          if (!roomVisited.has(next)) {
            roomVisited.add(next);
            queue.push(next);
          }
        }
      }
    }
    const roomsConnected = rooms.length <= 1 ? true : roomVisited.size === rooms.length;

    return {
      seed: g.seedString,
      config: g.config,
      size: { width, height },
      tileSize: 1,
      origin: { x: 0, y: 0 },
      tileLegend: { wall: Tile.Wall, room: Tile.Room, corridor: Tile.Corridor, door: Tile.Door },
      tiles: { width, height, encoding: 'rle', data: tilesRle },
      rooms,
      connections,
      validation: {
        roomCount: rooms.length,
        corridorTiles,
        doorCount,
        corridorLength: st.corridorPlans.reduce((sum, plan) => sum + plan.path.length, 0),
        roomsConnected
      }
    };
  }

  function handleExportJson() {
    const bundle = buildExportBundle();
    if (!bundle) return;
    const safeSeed = bundle.seed.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'dungeon';
    const json = JSON.stringify(bundle, null, 2);
    downloadBlob(`${safeSeed}-level.json`, new Blob([json], { type: 'application/json' }));
  }

  function handleExportCsv() {
    const g = genRef.current;
    if (!g) return;
    const { width, height, tiles } = g.getState();
    const safeSeed = g.seedString.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'dungeon';
    const rows: string[] = [];
    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        row.push(tiles[y * width + x]);
      }
      rows.push(row.join(','));
    }
    const csv = rows.join('\n');
    downloadBlob(`${safeSeed}-tiles.csv`, new Blob([csv], { type: 'text/csv' }));
  }

  function toggleFullscreen() {
    const target = fullscreenRef.current;
    if (!target) return;

    if (!document.fullscreenElement) {
      target.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // initialize generator on mount / config changes
  useEffect(() => {
    reset(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gridW,
    gridH,
    maxDepth,
    minLeafSize,
    roomMinSize,
    roomMargin,
    targetFill,
    roomBuffer,
    kNearest,
    maxLoops,
    extraLoopChance,
    roomPenalty,
    reuseCorridorsBias,
    turnPenalty
  ]);

  useEffect(() => {
    if (running && mode === 'advanced') {
      setMode('basic');
    }
  }, [running, mode]);

  // drawing
  useEffect(() => {
    const g = genRef.current;
    const canvas = canvasRef.current;
    if (!g || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(config.width * cell * dpr);
    canvas.height = Math.floor(config.height * cell * dpr);
    canvas.style.width = `${config.width * cell}px`;
    canvas.style.height = `${config.height * cell}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const st = g.getState();
    drawDungeon({
      ctx,
      tiles: st.tiles,
      width: st.width,
      height: st.height,
      cell,
      overlay
    });
  }, [renderTick, config.width, config.height, cell, overlay]);

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      if (!panRef.current.active) return;
      const container = canvasWrapRef.current;
      if (!container) return;
      const dx = event.clientX - panRef.current.startX;
      const dy = event.clientY - panRef.current.startY;
      container.scrollLeft = panRef.current.scrollLeft - dx;
      container.scrollTop = panRef.current.scrollTop - dy;
    };

    const handleUp = () => {
      if (!panRef.current.active) return;
      panRef.current.active = false;
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === fullscreenRef.current);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
    };
  }, []);

  // play loop (steps/sec)
  useEffect(() => {
    if (!running) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    const loop = (t: number) => {
      const g = genRef.current;
      if (!g) return;

      if (!lastTimeRef.current) lastTimeRef.current = t;
      const dt = (t - lastTimeRef.current) / 1000;
      lastTimeRef.current = t;
      accRef.current += dt;

      const stepInterval = 1 / Math.max(1, speed);
      let steps = 0;

      while (accRef.current >= stepInterval && steps < 200) {
        accRef.current -= stepInterval;
        stepOnce();
        steps++;
        if (g.isDone()) {
          setRunning(false);
          break;
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTimeRef.current = 0;
      accRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, speed]);

  const currentSummary = currentEvent ? formatEventSummary(currentEvent) : 'No events yet.';

  return (
    <div className="max-w-7xl mx-auto px-6 pb-24 animate-in fade-in duration-500">
      <div className="mb-10">
        <Link to="/playground" className="text-sm text-neutral-300 hover:text-white">
          {'<- Back to Playground'}
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-white mt-4">Procedural Dungeon Designer</h1>
        <p className="text-neutral-300 mt-3 max-w-2xl">{description}</p>
      </div>

      <div
        ref={fullscreenRef}
        className={`grid gap-4 items-stretch lg:grid-cols-[minmax(320px,1fr)_420px] ${
          isFullscreen ? 'w-full h-full bg-neutral-950 p-4' : ''
        }`}
      >
        <div className="flex flex-col min-h-0">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>Seed</span>
              <input
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                style={{ width: 220, padding: '6px 8px' }}
              />
            </label>

            <button onClick={() => reset(seed)} style={{ padding: '6px 10px' }} type="button">
              Reset
            </button>

            <button
              onClick={resetDefaults}
              style={{ padding: '6px 10px' }}
              type="button"
              disabled={isDefaults}
              title={isDefaults ? 'Already at defaults' : 'Reset all settings to defaults'}
            >
              Reset defaults
            </button>

            <button onClick={handlePlayToggle} style={{ padding: '6px 10px' }} type="button">
              {running ? 'Pause' : 'Play'}
            </button>

            <button onClick={() => stepOnce()} style={{ padding: '6px 10px' }} type="button">
              Step
            </button>

            <button onClick={toggleFullscreen} style={{ padding: '6px 10px' }} type="button">
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span>Mode</span>
              <button
                onClick={() => setMode('basic')}
                style={modeButtonStyle(mode === 'basic')}
                type="button"
              >
                Basic
              </button>
              <button
                onClick={() => setMode('advanced')}
                style={modeButtonStyle(mode === 'advanced')}
                type="button"
              >
                Advanced
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'nowrap',
              alignItems: 'center',
              marginBottom: 12
            }}
          >
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>Steps/s</span>
              <input
                type="range"
                min={1}
                max={240}
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
                style={{ width: 120 }}
              />
              <span style={{ width: 40, textAlign: 'right' }}>{speed}</span>
            </label>

            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>Zoom</span>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(clampZoom(parseFloat(e.target.value)))}
                style={{ width: 120 }}
              />
              <span style={{ width: 40, textAlign: 'right' }}>{zoomPercent}%</span>
            </label>

            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>W</span>
              <input
                type="number"
                min={40}
                max={140}
                value={gridW}
                onChange={(e) => handleGridWChange(parseInt(e.target.value, 10))}
                style={{ width: 60, padding: '6px 8px' }}
              />
            </label>

            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>H</span>
              <input
                type="number"
                min={30}
                max={110}
                value={gridH}
                onChange={(e) => handleGridHChange(parseInt(e.target.value, 10))}
                style={{ width: 60, padding: '6px 8px' }}
              />
            </label>
          </div>

          {mode === 'advanced' ? (
            <div
              style={{
                display: 'grid',
                gap: 12,
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                marginBottom: 12
              }}
            >
              <label
                style={{ display: 'grid', gap: 6 }}
                title="Higher = more partitions and more (smaller) rooms."
              >
                <span>Max depth</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="range"
                    min={2}
                    max={8}
                    step={1}
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(parseInt(e.target.value, 10))}
                  />
                  <span style={{ width: 36, textAlign: 'right' }}>{maxDepth}</span>
                </div>
              </label>

              <label
                style={{ display: 'grid', gap: 6 }}
                title="Higher = fewer splits and larger leaves (more open feel)."
              >
                <span>Min leaf size</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="range"
                    min={8}
                    max={24}
                    step={1}
                    value={minLeafSize}
                    onChange={(e) => setMinLeafSize(parseInt(e.target.value, 10))}
                  />
                  <span style={{ width: 36, textAlign: 'right' }}>{minLeafSize}</span>
                </div>
              </label>

              <label
                style={{ display: 'grid', gap: 6 }}
                title="Higher = fewer but chunkier rooms."
              >
                <span>Room min size</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="range"
                    min={4}
                    max={14}
                    step={1}
                    value={roomMinSize}
                    onChange={(e) => setRoomMinSize(parseInt(e.target.value, 10))}
                  />
                  <span style={{ width: 36, textAlign: 'right' }}>{roomMinSize}</span>
                </div>
              </label>

              <label
                style={{ display: 'grid', gap: 6 }}
                title="Higher = rooms sit further from partition edges."
              >
                <span>Room margin</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="range"
                    min={0}
                    max={6}
                    step={1}
                    value={roomMargin}
                    onChange={(e) => setRoomMargin(parseInt(e.target.value, 10))}
                  />
                  <span style={{ width: 36, textAlign: 'right' }}>{roomMargin}</span>
                </div>
              </label>

              <label
                style={{ display: 'grid', gap: 6 }}
                title="Lower = smaller rooms; higher = rooms fill more of each leaf."
              >
                <span>Room fill target</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="range"
                    min={0.3}
                    max={0.8}
                    step={0.05}
                    value={targetFill}
                    onChange={(e) => setTargetFill(parseFloat(e.target.value))}
                  />
                  <span style={{ width: 48, textAlign: 'right' }}>{targetFill.toFixed(2)}</span>
                </div>
              </label>

              <label
                style={{ display: 'grid', gap: 6 }}
                title="Extra spacing between rooms (adds corridor air gaps)."
              >
                <span>Room buffer</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={1}
                    value={roomBuffer}
                    onChange={(e) => setRoomBuffer(parseInt(e.target.value, 10))}
                  />
                  <span style={{ width: 36, textAlign: 'right' }}>{roomBuffer}</span>
                </div>
              </label>

              <label
                style={{ display: 'grid', gap: 6 }}
                title="Lower = tree-like graph; higher = more local connections."
              >
                <span>K-nearest</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    step={1}
                    value={kNearest}
                    onChange={(e) => setKNearest(parseInt(e.target.value, 10))}
                  />
                  <span style={{ width: 36, textAlign: 'right' }}>{kNearest}</span>
                </div>
              </label>

              <label
                style={{ display: 'grid', gap: 6 }}
                title="Upper cap on extra cycles beyond the minimum spanning tree."
              >
                <span>Max loops</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="range"
                    min={0}
                    max={12}
                    step={1}
                    value={maxLoops}
                    onChange={(e) => setMaxLoops(parseInt(e.target.value, 10))}
                  />
                  <span style={{ width: 36, textAlign: 'right' }}>{maxLoops}</span>
                </div>
              </label>

              <label
                style={{ display: 'grid', gap: 6 }}
                title="Chance to add a non-tree edge each step (more loopiness)."
              >
                <span>Extra loop chance</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={extraLoopChance}
                    onChange={(e) => setExtraLoopChance(parseFloat(e.target.value))}
                  />
                  <span style={{ width: 48, textAlign: 'right' }}>{Math.round(extraLoopChance * 100)}%</span>
                </div>
              </label>

              <label
                style={{ display: 'grid', gap: 6 }}
                title="Higher = corridors avoid cutting through rooms."
              >
                <span>Room penalty</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="range"
                    min={1}
                    max={80}
                    step={1}
                    value={roomPenalty}
                    onChange={(e) => setRoomPenalty(parseInt(e.target.value, 10))}
                  />
                  <span style={{ width: 40, textAlign: 'right' }}>{roomPenalty}</span>
                </div>
              </label>

              <label
                style={{ display: 'grid', gap: 6 }}
                title="Higher = straighter corridors (turns cost more)."
              >
                <span>Turn penalty</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="range"
                    min={0}
                    max={4}
                    step={0.1}
                    value={turnPenalty}
                    onChange={(e) => setTurnPenalty(parseFloat(e.target.value))}
                  />
                  <span style={{ width: 48, textAlign: 'right' }}>{turnPenalty.toFixed(1)}</span>
                </div>
              </label>

              <label
                style={{ display: 'grid', gap: 6 }}
                title="Lower = new corridors prefer to reuse existing ones."
              >
                <span>Reuse corridor bias</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="range"
                    min={0.6}
                    max={1.4}
                    step={0.05}
                    value={reuseCorridorsBias}
                    onChange={(e) => setReuseCorridorsBias(parseFloat(e.target.value))}
                  />
                  <span style={{ width: 48, textAlign: 'right' }}>{reuseCorridorsBias.toFixed(2)}</span>
                </div>
              </label>
            </div>
          ) : null}

          <div
            ref={canvasWrapRef}
            onMouseDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              const container = canvasWrapRef.current;
              if (!container) return;
              panRef.current = {
                active: true,
                startX: event.clientX,
                startY: event.clientY,
                scrollLeft: container.scrollLeft,
                scrollTop: container.scrollTop
              };
              setIsPanning(true);
            }}
            onTouchStart={(event) => {
              if (!canvasWrapRef.current) return;
              event.preventDefault();
              if (event.touches.length === 1) {
                const touch = event.touches[0];
                panRef.current = {
                  active: true,
                  startX: touch.clientX,
                  startY: touch.clientY,
                  scrollLeft: canvasWrapRef.current.scrollLeft,
                  scrollTop: canvasWrapRef.current.scrollTop
                };
                pinchRef.current.active = false;
                setIsPanning(true);
              } else if (event.touches.length === 2) {
                const dist = getTouchDistance(event.touches);
                pinchRef.current = {
                  active: true,
                  startDist: dist,
                  startZoom: zoom
                };
                panRef.current.active = false;
                setIsPanning(false);
              }
            }}
            onTouchMove={(event) => {
              if (!canvasWrapRef.current) return;
              if (pinchRef.current.active && event.touches.length === 2) {
                event.preventDefault();
                const dist = getTouchDistance(event.touches);
                if (pinchRef.current.startDist > 0) {
                  const nextZoom = pinchRef.current.startZoom * (dist / pinchRef.current.startDist);
                  setZoom(clampZoom(nextZoom));
                }
                return;
              }
              if (panRef.current.active && event.touches.length === 1) {
                event.preventDefault();
                const touch = event.touches[0];
                const dx = touch.clientX - panRef.current.startX;
                const dy = touch.clientY - panRef.current.startY;
                canvasWrapRef.current.scrollLeft = panRef.current.scrollLeft - dx;
                canvasWrapRef.current.scrollTop = panRef.current.scrollTop - dy;
              }
            }}
            onTouchEnd={(event) => {
              if (!canvasWrapRef.current) return;
              if (event.touches.length === 1) {
                const touch = event.touches[0];
                panRef.current = {
                  active: true,
                  startX: touch.clientX,
                  startY: touch.clientY,
                  scrollLeft: canvasWrapRef.current.scrollLeft,
                  scrollTop: canvasWrapRef.current.scrollTop
                };
                pinchRef.current.active = false;
                setIsPanning(true);
                return;
              }
              panRef.current.active = false;
              pinchRef.current.active = false;
              setIsPanning(false);
            }}
            onTouchCancel={() => {
              panRef.current.active = false;
              pinchRef.current.active = false;
              setIsPanning(false);
            }}
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              padding: 12,
              overflow: 'auto',
              cursor: isPanning ? 'grabbing' : 'grab',
              touchAction: 'none'
            }}
            className="flex-1 min-h-[260px]"
          >
            <canvas ref={canvasRef} />
          </div>

          {!isFullscreen ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <button onClick={handleExportJson} style={{ padding: '6px 10px' }} type="button">
                Export JSON
              </button>
              <button onClick={handleExportCsv} style={{ padding: '6px 10px' }} type="button">
                Export CSV
              </button>
            </div>
          ) : null}

          <div style={{ marginTop: 10, opacity: 0.9 }}>
            <strong>Current:</strong> {currentSummary}
          </div>
        </div>

        <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 12 }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700 }}>Decision trace</div>
            <div style={{ opacity: 0.85, marginTop: 6, fontSize: 13 }}>{overlay?.message ?? '-'}</div>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Latest event</div>
              <pre
                style={{
                  margin: 0,
                  padding: 10,
                  borderRadius: 10,
                  background: 'rgba(0,0,0,0.25)',
                  maxHeight: 220,
                  overflow: 'auto'
                }}
              >
                {currentEvent ? JSON.stringify(currentEvent, null, 2) : '-'}
              </pre>
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Event log (most recent last)</div>
              <div style={{ maxHeight: 360, overflow: 'auto', borderRadius: 10, background: 'rgba(0,0,0,0.25)' }}>
                {eventLog.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 10px',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      fontSize: 13
                    }}
                  >
                    <span style={{ opacity: 0.8, marginRight: 8 }}>{i + 1}.</span>
                    <span>{formatEventSummary(e)}</span>
                  </div>
                ))}
                {eventLog.length === 0 && <div style={{ padding: 10, opacity: 0.8 }}>-</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
