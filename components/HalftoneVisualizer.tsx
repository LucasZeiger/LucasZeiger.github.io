import React, { useEffect, useMemo, useRef, useState } from 'react';

type Preset = {
  id: string;
  label: string;
  width: number;
  height: number;
  frames: number;
  fps: number;
  spacing: number;
  rMin: number;
  rMax: number;
  waveStrength: number;
  waveScale: number;
  waveSpeed: number;
  background: string;
  foreground: string;
  pattern:
    | 'crossfade'
    | 'radial'
    | 'vortex'
    | 'checker'
    | 'tide'
    | 'noise-field'
    | 'spiral-lattice'
    | 'radial-burst'
    | 'moire'
    | 'tessellation';
};

const PRESETS: Preset[] = [
  {
    id: 'aurora',
    label: 'Aurora Drift',
    width: 560,
    height: 520,
    frames: 84,
    fps: 24,
    spacing: 14,
    rMin: 1,
    rMax: 8,
    waveStrength: 0.7,
    waveScale: 0.022,
    waveSpeed: 1,
    background: '#0b1020',
    foreground: '#b7f7dc',
    pattern: 'crossfade'
  },
  {
    id: 'sunburst',
    label: 'Solar Bloom',
    width: 540,
    height: 540,
    frames: 72,
    fps: 24,
    spacing: 16,
    rMin: 1,
    rMax: 9,
    waveStrength: 0.8,
    waveScale: 0.018,
    waveSpeed: 1,
    background: '#120b05',
    foreground: '#ffe5a3',
    pattern: 'radial'
  },
  {
    id: 'vortex',
    label: 'Vortex Ribbons',
    width: 560,
    height: 520,
    frames: 96,
    fps: 24,
    spacing: 13,
    rMin: 1,
    rMax: 7,
    waveStrength: 0.75,
    waveScale: 0.02,
    waveSpeed: 2,
    background: '#0d1015',
    foreground: '#8dd5ff',
    pattern: 'vortex'
  },
  {
    id: 'checker',
    label: 'Pulse Grid',
    width: 520,
    height: 520,
    frames: 60,
    fps: 24,
    spacing: 12,
    rMin: 1,
    rMax: 6,
    waveStrength: 0.65,
    waveScale: 0.028,
    waveSpeed: 1,
    background: '#07090f',
    foreground: '#ffd1f2',
    pattern: 'checker'
  },
  {
    id: 'tide',
    label: 'Lagoon Tide',
    width: 580,
    height: 520,
    frames: 90,
    fps: 24,
    spacing: 15,
    rMin: 1,
    rMax: 8,
    waveStrength: 0.7,
    waveScale: 0.02,
    waveSpeed: 1,
    background: '#06131a',
    foreground: '#b4ffe3',
    pattern: 'tide'
  },
  {
    id: 'static-noise',
    label: 'Static Mirage',
    width: 560,
    height: 520,
    frames: 96,
    fps: 24,
    spacing: 11,
    rMin: 0.8,
    rMax: 6.5,
    waveStrength: 0.9,
    waveScale: 0.03,
    waveSpeed: 2,
    background: '#0b0a13',
    foreground: '#ffd6a5',
    pattern: 'noise-field'
  },
  {
    id: 'orbit',
    label: 'Orbiting Choir',
    width: 600,
    height: 520,
    frames: 120,
    fps: 24,
    spacing: 16,
    rMin: 1,
    rMax: 10,
    waveStrength: 0.85,
    waveScale: 0.016,
    waveSpeed: 2,
    background: '#05070d',
    foreground: '#c8d3ff',
    pattern: 'spiral-lattice'
  },
  {
    id: 'ripple-loom',
    label: 'Ripple Loom',
    width: 560,
    height: 540,
    frames: 84,
    fps: 24,
    spacing: 12,
    rMin: 1,
    rMax: 7,
    waveStrength: 0.8,
    waveScale: 0.024,
    waveSpeed: 1,
    background: '#0f0b0f',
    foreground: '#e6ffb0',
    pattern: 'radial-burst'
  },
  {
    id: 'halo',
    label: 'Halo Cascade',
    width: 540,
    height: 540,
    frames: 72,
    fps: 24,
    spacing: 14,
    rMin: 1,
    rMax: 9,
    waveStrength: 0.75,
    waveScale: 0.02,
    waveSpeed: 2,
    background: '#0a0f18',
    foreground: '#ffb3c8',
    pattern: 'spiral-lattice'
  },
  {
    id: 'glass-grid',
    label: 'Glass Grid',
    width: 520,
    height: 520,
    frames: 60,
    fps: 24,
    spacing: 10,
    rMin: 0.8,
    rMax: 5.5,
    waveStrength: 0.7,
    waveScale: 0.03,
    waveSpeed: 1,
    background: '#0a0a0c',
    foreground: '#b7f1ff',
    pattern: 'radial-burst'
  },
  {
    id: 'moire-lens',
    label: 'Moire Lens',
    width: 560,
    height: 520,
    frames: 96,
    fps: 24,
    spacing: 10,
    rMin: 0.8,
    rMax: 6,
    waveStrength: 0.75,
    waveScale: 0.03,
    waveSpeed: 2,
    background: '#090c12',
    foreground: '#c4f0ff',
    pattern: 'moire'
  },
  {
    id: 'tessellate',
    label: 'Tessellated Bloom',
    width: 580,
    height: 520,
    frames: 84,
    fps: 24,
    spacing: 13,
    rMin: 1,
    rMax: 8,
    waveStrength: 0.8,
    waveScale: 0.022,
    waveSpeed: 1,
    background: '#080a0f',
    foreground: '#ffdcb2',
    pattern: 'tessellation'
  }
];

const DEFAULTS = PRESETS[0];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex: string) => {
  const clean = hex.replace('#', '');
  const value = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const intValue = parseInt(value, 16);
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255
  };
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;

const rgbToHsl = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / delta) % 6;
        break;
      case gn:
        h = (bn - rn) / delta + 2;
        break;
      default:
        h = (rn - gn) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
};

const hslToRgb = (h: number, s: number, l: number) => {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
};

const buildGrid = (width: number, height: number, spacing: number) => {
  const xs: number[] = [];
  for (let x = Math.floor(spacing / 2); x < width; x += spacing) {
    xs.push(x);
  }
  const ys: number[] = [];
  for (let y = Math.floor(spacing / 2); y < height; y += spacing) {
    ys.push(y);
  }
  return { xs, ys };
};

const HalftoneVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameRef = useRef<number>(0);

  const [presetId, setPresetId] = useState(DEFAULTS.id);
  const [width, setWidth] = useState(DEFAULTS.width);
  const [height, setHeight] = useState(DEFAULTS.height);
  const [frames, setFrames] = useState(DEFAULTS.frames);
  const [fps, setFps] = useState(DEFAULTS.fps);
  const [spacing, setSpacing] = useState(DEFAULTS.spacing);
  const [rMin, setRMin] = useState(DEFAULTS.rMin);
  const [rMax, setRMax] = useState(DEFAULTS.rMax);
  const [waveStrength, setWaveStrength] = useState(DEFAULTS.waveStrength);
  const [waveScale, setWaveScale] = useState(DEFAULTS.waveScale);
  const [waveSpeed, setWaveSpeed] = useState(DEFAULTS.waveSpeed);
  const [background, setBackground] = useState(DEFAULTS.background);
  const [foreground, setForeground] = useState(DEFAULTS.foreground);
  const [backgroundHue, setBackgroundHue] = useState(() => rgbToHsl(hexToRgb(DEFAULTS.background)).h);
  const [foregroundHue, setForegroundHue] = useState(() => rgbToHsl(hexToRgb(DEFAULTS.foreground)).h);
  const [backgroundSaturation, setBackgroundSaturation] = useState(
    () => rgbToHsl(hexToRgb(DEFAULTS.background)).s
  );
  const [foregroundSaturation, setForegroundSaturation] = useState(
    () => rgbToHsl(hexToRgb(DEFAULTS.foreground)).s
  );
  const [backgroundLightness, setBackgroundLightness] = useState(() => rgbToHsl(hexToRgb(DEFAULTS.background)).l);
  const [foregroundLightness, setForegroundLightness] = useState(() => rgbToHsl(hexToRgb(DEFAULTS.foreground)).l);
  const [pattern, setPattern] = useState<Preset['pattern']>(DEFAULTS.pattern);
  const [isRunning, setIsRunning] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const currentPreset = useMemo(() => PRESETS.find((item) => item.id === presetId) ?? PRESETS[0], [presetId]);
  const isLoopPerfect = Number.isInteger(waveSpeed) && frames > 0;

  const grid = useMemo(() => buildGrid(width, height, spacing), [spacing, width, height]);

  const renderFrame = (
    ctx: CanvasRenderingContext2D,
    frameIndex: number,
    activeGrid: { xs: number[]; ys: number[] },
    opts: {
      width: number;
      height: number;
      frames: number;
      spacing: number;
      rMin: number;
      rMax: number;
      waveStrength: number;
      waveScale: number;
      waveSpeed: number;
      background: string;
      foreground: string;
      pattern: Preset['pattern'];
    }
  ) => {
    const t = (2 * Math.PI * opts.waveSpeed * frameIndex) / opts.frames;

    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, opts.width, opts.height);

    const base = (opts.rMin + opts.rMax) / 2;
    const amp = (opts.rMax - opts.rMin) / 2;

    for (const cy of activeGrid.ys) {
      for (const cx of activeGrid.xs) {
        const dx = (cx - opts.width / 2) * opts.waveScale;
        const dy = (cy - opts.height / 2) * opts.waveScale;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        let wave = 0;
        switch (opts.pattern) {
          case 'radial': {
            wave = Math.sin(dist * 6 - t) * 0.7 + Math.cos(angle * 4 + t) * 0.3;
            break;
          }
          case 'vortex': {
            wave = Math.sin(dist * 5 + angle * 3 - t * 2) * 0.6 + Math.cos(dist * 3 - t) * 0.4;
            break;
          }
          case 'checker': {
            const cell = (Math.floor(cx / opts.spacing) + Math.floor(cy / opts.spacing)) % 2;
            wave = Math.sin(dx * 3 + t) * 0.5 + Math.cos(dy * 3 - t * 2) * 0.5;
            wave += cell ? 0.2 : -0.2;
            break;
          }
          case 'tide': {
            wave = Math.sin(dx * 2 + t) * 0.6 + Math.sin(dy * 3 - t) * 0.4;
            break;
          }
          case 'noise-field': {
            const seed = Math.sin(dx * 12.3 + dy * 7.1 + t * 2) * Math.cos(dx * 5.7 - dy * 9.2 + t);
            const ripples = Math.sin(dist * 8 - t * 2);
            wave = 0.65 * seed + 0.35 * ripples;
            break;
          }
          case 'spiral-lattice': {
            const spiral = Math.sin(dist * 6 + angle * 5 - t * 2);
            const lattice = Math.cos(dx * 4 - dy * 4 + t);
            wave = 0.6 * spiral + 0.4 * lattice;
            break;
          }
          case 'radial-burst': {
            const spokes = Math.cos(angle * 8 + t * 2);
            const pulse = Math.sin(dist * 10 - t);
            wave = 0.55 * pulse + 0.45 * spokes;
            break;
          }
          case 'moire': {
            const gridA = Math.sin((dx + dy) * 6 + t);
            const gridB = Math.sin((dx - dy) * 6 - t * 2);
            const lens = Math.cos(dist * 4 - t);
            wave = 0.5 * (gridA + gridB) + 0.2 * lens;
            break;
          }
          case 'tessellation': {
            const tri = Math.sin(dx * 5 + t) + Math.sin((dx * 2.5 + dy * 4) - t);
            const hex = Math.cos((dx * 3 - dy * 1.5) + t * 2);
            wave = 0.5 * tri + 0.5 * hex;
            break;
          }
          case 'crossfade':
          default: {
            const w1 = Math.sin(1.3 * dx + 1.7 * dy + t);
            const w2 = Math.sin(-1.9 * dx + 1.1 * dy - t);
            const w3 = Math.sin(dist * 4 - t * 2);
            wave = 0.5 * (w1 + w2) + w3 * 0.2;
            break;
          }
        }

        const radius = clamp(base + amp * (opts.waveStrength * wave), opts.rMin, opts.rMax);

        ctx.beginPath();
        ctx.fillStyle = opts.foreground;
        ctx.ellipse(cx, cy, radius, radius, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

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

    const drawFrame = (frameIndex: number) =>
      renderFrame(ctx, frameIndex, grid, {
        width,
        height,
        frames,
        spacing,
        rMin,
        rMax,
        waveStrength,
        waveScale,
        waveSpeed,
        background,
        foreground,
        pattern
      });

    const tick = (time: number) => {
      if (isRunning) {
        const interval = 1000 / fps;
        if (time - lastTimeRef.current >= interval) {
          frameRef.current = (frameRef.current + 1) % frames;
          lastTimeRef.current = time;
          drawFrame(frameRef.current);
        }
      }
      animationRef.current = requestAnimationFrame(tick);
    };

    drawFrame(frameRef.current);
    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    width,
    height,
    frames,
    fps,
    spacing,
    rMin,
    rMax,
    waveStrength,
    waveScale,
    waveSpeed,
    background,
    foreground,
    pattern,
    grid,
    isRunning
  ]);

  useEffect(() => {
    frameRef.current = 0;
    lastTimeRef.current = 0;
  }, [frames]);

  useEffect(() => {
    const preset = PRESETS.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }
    setWidth(preset.width);
    setHeight(preset.height);
    setFrames(preset.frames);
    setFps(preset.fps);
    setSpacing(preset.spacing);
    setRMin(preset.rMin);
    setRMax(preset.rMax);
    setWaveStrength(preset.waveStrength);
    setWaveScale(preset.waveScale);
    setWaveSpeed(preset.waveSpeed);
    setBackground(preset.background);
    setForeground(preset.foreground);
    const bgHsl = rgbToHsl(hexToRgb(preset.background));
    const fgHsl = rgbToHsl(hexToRgb(preset.foreground));
    setBackgroundHue(bgHsl.h);
    setForegroundHue(fgHsl.h);
    setBackgroundSaturation(bgHsl.s);
    setForegroundSaturation(fgHsl.s);
    setBackgroundLightness(bgHsl.l);
    setForegroundLightness(fgHsl.l);
    setPattern(preset.pattern);
  }, [presetId]);

  useEffect(() => {
    const nextRgb = hslToRgb(backgroundHue, backgroundSaturation, backgroundLightness);
    setBackground(rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
  }, [backgroundHue, backgroundSaturation, backgroundLightness]);

  useEffect(() => {
    const nextRgb = hslToRgb(foregroundHue, foregroundSaturation, foregroundLightness);
    setForeground(rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
  }, [foregroundHue, foregroundSaturation, foregroundLightness]);

  const handleColorChange = (
    color: string,
    setColor: React.Dispatch<React.SetStateAction<string>>,
    setHue: React.Dispatch<React.SetStateAction<number>>,
    setSaturation: React.Dispatch<React.SetStateAction<number>>,
    setLightness: React.Dispatch<React.SetStateAction<number>>
  ) => {
    setColor(color);
    const hsl = rgbToHsl(hexToRgb(color));
    setHue(hsl.h);
    setSaturation(hsl.s);
    setLightness(hsl.l);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportVideo = async () => {
    if (!canvasRef.current || isExporting) {
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setExportStatus('MediaRecorder is not available in this browser.');
      return;
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const exportGrid = buildGrid(width, height, spacing);
    const duration = 1000 / fps;

    const mimeCandidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];

    const mimeType = mimeCandidates.find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) {
      setExportStatus(`${format.toUpperCase()} export is not supported in this browser.`);
      return;
    }

    const wasRunning = isRunning;
    if (wasRunning) {
      setIsRunning(false);
    }

    setIsExporting(true);
    setExportStatus('Rendering WEBM...');

    const stream = exportCanvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    const stopPromise = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.start();

    for (let k = 0; k < frames; k += 1) {
      renderFrame(ctx, k, exportGrid, {
        width,
        height,
        frames,
        spacing,
        rMin,
        rMax,
        waveStrength,
        waveScale,
        waveSpeed,
        background,
        foreground,
        pattern
      });
      await new Promise((resolve) => setTimeout(resolve, duration));
    }

    recorder.stop();
    await stopPromise;

    const blob = new Blob(chunks, { type: mimeType });
    const safeLabel = currentPreset.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    downloadBlob(blob, `${safeLabel || currentPreset.id}.webm`);

    setIsExporting(false);
    setExportStatus('Exported WEBM.');

    if (wasRunning) {
      setIsRunning(true);
    }
  };


  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-6">
      <div className="border border-neutral-800/70 rounded-xl p-5 bg-neutral-900/30 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">Controls</h3>
            <span
              className={`text-[11px] uppercase tracking-widest px-2 py-1 rounded-full border ${
                isLoopPerfect
                  ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                  : 'border-amber-500/40 text-amber-300 bg-amber-500/10'
              }`}
            >
              {isLoopPerfect ? 'Perfect loop' : 'Loop warning'}
            </span>
          </div>
          <button
            className="text-xs uppercase tracking-wider px-3 py-1 rounded-full border border-neutral-800 text-neutral-300 hover:text-white"
            onClick={() => setIsRunning((prev) => !prev)}
          >
            {isRunning ? 'Pause' : 'Play'}
          </button>
        </div>

        <div className="space-y-3 text-sm text-neutral-300">
          <label className="flex items-center justify-between gap-4">
            <span>Preset</span>
            <select
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
              className="w-44 bg-neutral-950/60 border border-neutral-800 rounded px-2 py-1 text-right"
            >
              {PRESETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>Width</span>
            <input
              type="number"
              min={240}
              max={1200}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="w-24 bg-neutral-950/60 border border-neutral-800 rounded px-2 py-1 text-right"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>Height</span>
            <input
              type="number"
              min={240}
              max={1200}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-24 bg-neutral-950/60 border border-neutral-800 rounded px-2 py-1 text-right"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>Frames</span>
            <input
              type="number"
              min={24}
              max={240}
              value={frames}
              onChange={(e) => setFrames(Number(e.target.value))}
              className="w-24 bg-neutral-950/60 border border-neutral-800 rounded px-2 py-1 text-right"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>FPS</span>
            <input
              type="number"
              min={6}
              max={60}
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              className="w-24 bg-neutral-950/60 border border-neutral-800 rounded px-2 py-1 text-right"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>Spacing</span>
            <input
              type="number"
              min={6}
              max={40}
              value={spacing}
              onChange={(e) => setSpacing(Number(e.target.value))}
              className="w-24 bg-neutral-950/60 border border-neutral-800 rounded px-2 py-1 text-right"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>Radius Min</span>
            <input
              type="number"
              min={0.5}
              max={20}
              step={0.5}
              value={rMin}
              onChange={(e) => setRMin(Number(e.target.value))}
              className="w-24 bg-neutral-950/60 border border-neutral-800 rounded px-2 py-1 text-right"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>Radius Max</span>
            <input
              type="number"
              min={1}
              max={30}
              step={0.5}
              value={rMax}
              onChange={(e) => setRMax(Number(e.target.value))}
              className="w-24 bg-neutral-950/60 border border-neutral-800 rounded px-2 py-1 text-right"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>Wave Strength</span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={waveStrength}
              onChange={(e) => setWaveStrength(Number(e.target.value))}
              className="w-24 bg-neutral-950/60 border border-neutral-800 rounded px-2 py-1 text-right"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>Wave Scale</span>
            <input
              type="number"
              min={0.005}
              max={0.08}
              step={0.005}
              value={waveScale}
              onChange={(e) => setWaveScale(Number(e.target.value))}
              className="w-24 bg-neutral-950/60 border border-neutral-800 rounded px-2 py-1 text-right"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>Wave Speed</span>
            <input
              type="number"
              min={1}
              max={4}
              step={1}
              value={waveSpeed}
              onChange={(e) => setWaveSpeed(Math.round(Number(e.target.value)) || 1)}
              className="w-24 bg-neutral-950/60 border border-neutral-800 rounded px-2 py-1 text-right"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>Background</span>
            <input
              type="color"
              value={background}
              onChange={(e) =>
                handleColorChange(
                  e.target.value,
                  setBackground,
                  setBackgroundHue,
                  setBackgroundSaturation,
                  setBackgroundLightness
                )
              }
              className="h-8 w-20 bg-transparent border border-neutral-800 rounded"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>Background Hue</span>
            <input
              type="range"
              min={0}
              max={360}
              value={backgroundHue}
              onChange={(e) => setBackgroundHue(Number(e.target.value))}
              className="w-40 accent-emerald-400"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>Background Sat</span>
            <input
              type="range"
              min={0}
              max={100}
              value={backgroundSaturation}
              onChange={(e) => setBackgroundSaturation(Number(e.target.value))}
              className="w-40 accent-emerald-400"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>Background Light</span>
            <input
              type="range"
              min={5}
              max={90}
              value={backgroundLightness}
              onChange={(e) => setBackgroundLightness(Number(e.target.value))}
              className="w-40 accent-emerald-400"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>Foreground</span>
            <input
              type="color"
              value={foreground}
              onChange={(e) =>
                handleColorChange(
                  e.target.value,
                  setForeground,
                  setForegroundHue,
                  setForegroundSaturation,
                  setForegroundLightness
                )
              }
              className="h-8 w-20 bg-transparent border border-neutral-800 rounded"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>Foreground Hue</span>
            <input
              type="range"
              min={0}
              max={360}
              value={foregroundHue}
              onChange={(e) => setForegroundHue(Number(e.target.value))}
              className="w-40 accent-pink-300"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>Foreground Sat</span>
            <input
              type="range"
              min={0}
              max={100}
              value={foregroundSaturation}
              onChange={(e) => setForegroundSaturation(Number(e.target.value))}
              className="w-40 accent-pink-300"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>Foreground Light</span>
            <input
              type="range"
              min={10}
              max={95}
              value={foregroundLightness}
              onChange={(e) => setForegroundLightness(Number(e.target.value))}
              className="w-40 accent-pink-300"
            />
          </label>
        </div>

        <div className="border-t border-neutral-800 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-neutral-400">Export Loop</span>
            {exportStatus && <span className="text-xs text-neutral-400">{exportStatus}</span>}
          </div>
          <div className="text-xs uppercase tracking-wider">
            <button
              onClick={() => exportVideo()}
              disabled={isExporting}
              className="w-full rounded-lg border border-neutral-800 px-3 py-2 text-neutral-200 hover:text-white hover:border-neutral-600 disabled:opacity-40"
            >
              Export WebM
            </button>
          </div>
        </div>
      </div>

      <div className="border border-neutral-800/70 rounded-xl p-4 bg-neutral-900/30">
        <canvas ref={canvasRef} className="w-full rounded-lg bg-neutral-950" />
      </div>
    </div>
  );
};

export default HalftoneVisualizer;
