import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AudioEngine } from '../synth/AudioEngine';
import { loadWorklets } from '../synth/loadWorklets';
import { MODULE_DEFS } from '../synth/moduleDefs';
import type { CableModel, ModuleModel } from '../synth/types';
import './SynthCanvasPage.css';

type DragState =
  | { kind: 'none' }
  | { kind: 'move'; moduleId: string; dx: number; dy: number }
  | { kind: 'resize'; moduleId: string; startX: number; startWidth: number }
  | { kind: 'pan'; startX: number; startY: number; scrollLeft: number; scrollTop: number }
  | { kind: 'cable'; from: { moduleId: string; portId: string }; x: number; y: number };

type SynthCanvasPageProps = {
  embedded?: boolean;
};

const KEYMAP: Record<string, number> = {
  a: 60,
  w: 61,
  s: 62,
  e: 63,
  d: 64,
  f: 65,
  t: 66,
  g: 67,
  y: 68,
  h: 69,
  u: 70,
  j: 71,
  k: 72
};

const KNOB_PARAM_IDS = new Set([
  'baseHz',
  'cutoff',
  'attack',
  'decay',
  'release',
  'rate',
  'bpm',
  'vol',
  'level',
  'depth',
  'q'
]);
const SURFACE_WIDTH = 1600;
const SURFACE_HEIGHT = 1200;
const BASE_ZOOM = 0.7;
const MODULE_DESCRIPTIONS: Record<string, string> = {
  keyboard: 'Keyboard pitch + gate source from your computer keys.',
  osc: 'Primary sound source with wave selection and FM input.',
  filter: 'Lowpass filter with CV cutoff modulation.',
  vca: 'Amplitude control driven by CV (envelopes).',
  adsr: 'Envelope generator from gate signal.',
  lfo: 'Low-frequency mod source for CV.',
  arp: 'Clocked arpeggiator. Patch a root pitch input to follow the keyboard.',
  clock: 'Pulse clock for sync and sequencing.',
  output: 'Master output with light limiting.',
  offset: 'DC offset/bias source (constant CV).',
  attenuverter: 'Scale/invert signals (-1..1). Works for audio or CV.',
  mixer: '4-channel audio mixer with per-channel levels + master.',
  scope: 'Oscilloscope/spectrum visualizer. Thru=1 inline, Thru=0 tap-only.',
  vcmixer: '4-channel mixer with per-channel CV control of gain.',
  cvproc: 'Scale and offset a signal (audio or CV).',
  crossfader: 'Blend A/B with manual position and CV.',
  slew: 'Slew limiter (lag processor) for CV/audio. AudioWorklet.',
  samplehold: 'Sample input on rising clock edge and hold. AudioWorklet.',
  quantizer: 'Quantize pitch (Hz) to a scale. Root/scale/transpose.',
  logic: 'Gate logic (AND/OR/XOR/NAND/NOR/XNOR/NOT). Two inputs.',
  noise: 'Noise source (white/pink).',
  delay: 'Delay with feedback and CV-able time/feedback/mix.',
  distortion: 'Waveshaper distortion with CV drive and wet/dry mix.',
  chorus: 'Chorus (modulated delay) with CV-able rate/depth/mix.',
  phaser: 'Phaser (all-pass chain) with CV-able freq/rate/mix and feedback.',
  reverb: 'Convolution reverb (generated IR) with predelay, damping, and mix CV.',
  bitcrusher: 'Bitcrusher (AudioWorklet) with bits/downsample and mix CV.',
  compressor: 'Compressor with makeup gain and mix CV (parallel capable).',
  flanger: 'Flanger (short modulated delay) with CV-able rate/depth/mix and feedback.',
  stereochorus: 'Stereo chorus widening with rate/depth/width and mix CV.',
  eq3: '3-band EQ (low shelf, mid peak, high shelf).',
  wavefolder: 'Wavefolder (AudioWorklet) with drive/folds and mix CV.',
  irverb: 'Convolver reverb with generated IR presets, predelay, damping, and mix CV.'
};
type Preset = {
  id: string;
  label: string;
  modules?: ModuleModel[];
  params: Record<string, Record<string, number>>;
  cables?: CableModel[];
};
type UserPreset = {
  id: string;
  label: string;
  modules: ModuleModel[];
  cables: CableModel[];
  createdAt: number;
};

const USER_PRESETS_KEY = 'synthUserPresets';

const PRESETS: Preset[] = [
  {
    id: 'acid-arp-bass',
    label: 'Acid Arp Bass',
    modules: [
      { id: 'clk1', type: 'clock', x: 20, y: 520, width: 220, collapsed: true, params: {} },
      { id: 'arp1', type: 'arp', x: 320, y: 520, width: 220, collapsed: true, params: {} },
      { id: 'quant1', type: 'quantizer', x: 620, y: 520, width: 220, collapsed: true, params: {} },
      { id: 'log1', type: 'logic', x: 920, y: 520, width: 220, collapsed: true, params: {} },
      { id: 'dist1', type: 'distortion', x: 20, y: 820, width: 220, collapsed: true, params: {} },
      { id: 'delay1', type: 'delay', x: 320, y: 820, width: 220, collapsed: true, params: {} },
      { id: 'comp1', type: 'compressor', x: 620, y: 820, width: 220, collapsed: true, params: {} },
      {
        id: 'scp1',
        type: 'scope',
        x: 920,
        y: 120,
        width: 240,
        collapsed: true,
        params: {
          thru: 0,
          view: 0,
          fftSize: 2048,
          smoothing: 0.85,
          minDb: -90,
          maxDb: -10
        }
      }
    ],
    params: {
      osc1: { wave: 1, level: 0.2, fmDepthHz: 0, baseHz: 0 },
      flt1: { cutoff: 520, cutoffDepthHz: 1400, q: 9 },
      env1: { attack: 0.004, decay: 0.12, sustain: 0.04, release: 0.1 },
      vca1: { bias: 0, cvDepth: 1 },
      clk1: { bpm: 140, ppq: 4, duty: 0.12 },
      arp1: { rootHz: 0, interval: 7, steps: 3, pattern: 2, gateMs: 90 },
      log1: { mode: 0, threshold: 0.5 },
      quant1: { enabled: 1, root: 0, scale: 2, transpose: -24 },
      dist1: { drive: 0.75, mix: 0.85, post: 1.1 },
      delay1: { time: 0.12, feedback: 0.3, mix: 0.28 },
      comp1: { threshold: -22, ratio: 6, makeup: 1.2, mix: 1 },
      lfo1: { rate: 0.25, depth: 0.28, wave: 0 },
      kbd1: { gate: 0 }
    },
    cables: [
      { id: 'p1-1', from: { moduleId: 'kbd1', portId: 'pitch' }, to: { moduleId: 'arp1', portId: 'root' } },
      { id: 'p1-2', from: { moduleId: 'clk1', portId: 'out' }, to: { moduleId: 'log1', portId: 'a' } },
      { id: 'p1-3', from: { moduleId: 'kbd1', portId: 'gate' }, to: { moduleId: 'log1', portId: 'b' } },
      { id: 'p1-4', from: { moduleId: 'log1', portId: 'out' }, to: { moduleId: 'arp1', portId: 'clock' } },
      { id: 'p1-5', from: { moduleId: 'arp1', portId: 'pitch' }, to: { moduleId: 'quant1', portId: 'in' } },
      { id: 'p1-6', from: { moduleId: 'quant1', portId: 'out' }, to: { moduleId: 'osc1', portId: 'pitch' } },
      { id: 'p1-7', from: { moduleId: 'arp1', portId: 'gate' }, to: { moduleId: 'env1', portId: 'gate' } },
      { id: 'p1-8', from: { moduleId: 'env1', portId: 'env' }, to: { moduleId: 'vca1', portId: 'cv' } },
      { id: 'p1-9', from: { moduleId: 'env1', portId: 'env' }, to: { moduleId: 'flt1', portId: 'cutoffCv' } },
      { id: 'p1-10', from: { moduleId: 'osc1', portId: 'out' }, to: { moduleId: 'flt1', portId: 'in' } },
      { id: 'p1-11', from: { moduleId: 'flt1', portId: 'out' }, to: { moduleId: 'vca1', portId: 'in' } },
      { id: 'p1-12', from: { moduleId: 'vca1', portId: 'out' }, to: { moduleId: 'dist1', portId: 'in' } },
      { id: 'p1-13', from: { moduleId: 'dist1', portId: 'out' }, to: { moduleId: 'delay1', portId: 'in' } },
      { id: 'p1-14', from: { moduleId: 'delay1', portId: 'out' }, to: { moduleId: 'comp1', portId: 'in' } },
      { id: 'p1-15', from: { moduleId: 'comp1', portId: 'out' }, to: { moduleId: 'out1', portId: 'in' } },
      { id: 'p1-16', from: { moduleId: 'lfo1', portId: 'out' }, to: { moduleId: 'flt1', portId: 'cutoffCv' } },
      { id: 'p1-17', from: { moduleId: 'comp1', portId: 'out' }, to: { moduleId: 'scp1', portId: 'in' } }
    ]
  }
];

function uid() {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  return typeof c?.randomUUID === 'function' ? c.randomUUID() : Math.random().toString(16).slice(2);
}

function midiToHz(note: number) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function formatValue(value: number, step: number) {
  if (!Number.isFinite(value)) return String(value);
  if (step >= 1) return value.toFixed(0);
  if (step >= 0.1) return value.toFixed(1);
  if (step >= 0.01) return value.toFixed(2);
  return value.toFixed(3);
}

function roundToStep(value: number, step: number) {
  if (!Number.isFinite(step) || step <= 0) return value;
  const inv = 1 / step;
  return Math.round(value * inv) / inv;
}

function buildIdCounters(models: ModuleModel[]) {
  const counters: Record<string, number> = {};
  for (const model of models) {
    const match = model.id.match(/^([a-z]+)(\d+)$/i);
    if (!match) continue;
    const type = match[1];
    const idx = Number(match[2]);
    if (!Number.isFinite(idx)) continue;
    counters[type] = Math.max(counters[type] ?? 0, idx);
  }
  return counters;
}

function getNextModuleIndex(type: string, models: ModuleModel[]) {
  const used = new Set<number>();
  for (const module of models) {
    if (module.type !== type) continue;
    const match = module.id.match(/^[a-z]+(\d+)$/i);
    if (!match) continue;
    const idx = Number(match[1]);
    if (Number.isFinite(idx)) used.add(idx);
  }
  let i = 1;
  while (used.has(i)) i += 1;
  return i;
}

function normalizePresetModules(next: ModuleModel[]) {
  return next.map((module) => {
    const def = MODULE_DEFS[module.type];
    const params: Record<string, number> = {};
    def.params.forEach((param) => {
      params[param.id] = param.defaultValue;
    });
    return {
      ...module,
      width: module.width ?? 220,
      collapsed: module.collapsed ?? true,
      params: {
        ...params,
        ...module.params
      }
    };
  });
}

function slugifyLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || 'preset';
}

export default function SynthCanvasPage({ embedded }: SynthCanvasPageProps) {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const portRefs = useRef(new Map<string, HTMLDivElement>());
  const moduleRefs = useRef(new Map<string, HTMLDivElement>());
  const [drag, setDrag] = useState<DragState>({ kind: 'none' });
  const [selectedCableId, setSelectedCableId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [layoutTick, setLayoutTick] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [octaveShift, setOctaveShift] = useState(0);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [idCounters, setIdCounters] = useState<Record<string, number>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const resolveFrameRef = useRef<number | null>(null);
  const resolveTargetRef = useRef<{ anchorId: string | null; full: boolean } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
  }>({ x: 0, y: 0, visible: false });
  const pendingCenterRef = useRef(false);
  const copiedModuleRef = useRef<ModuleModel | null>(null);
  const presetImportRef = useRef<HTMLInputElement | null>(null);

  const [modules, setModules] = useState<ModuleModel[]>(() => initialModules());
  const [cables, setCables] = useState<CableModel[]>(() => initialCables());
  const [userPresets, setUserPresets] = useState<UserPreset[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(USER_PRESETS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as UserPreset[];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((preset) => preset && Array.isArray(preset.modules) && Array.isArray(preset.cables));
    } catch {
      return [];
    }
  });
  const [toast, setToast] = useState<string | null>(null);
  const isDev = import.meta.env.DEV;

  const [enabled, setEnabled] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = window.localStorage.getItem('synthTheme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  const ctxRef = useRef<AudioContext | null>(null);
  const engineRef = useRef<AudioEngine | null>(null);

  const portKey = (moduleId: string, portId: string) => `${moduleId}:${portId}`;
  const moduleKey = (moduleId: string) => `${moduleId}`;
  const effectiveZoom = zoom * BASE_ZOOM;

  const getLocalPoint = (clientX: number, clientY: number) => {
    const el = innerRef.current;
    if (!el) return { x: clientX, y: clientY };
    const rect = el.getBoundingClientRect();
    return { x: (clientX - rect.left) / effectiveZoom, y: (clientY - rect.top) / effectiveZoom };
  };

  const getPortCenter = (moduleId: string, portId: string) => {
    const el = portRefs.current.get(portKey(moduleId, portId));
    const root = innerRef.current;
    if (!el || !root) return null;
    const rect = el.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    return {
      x: (rect.left - rootRect.left + rect.width / 2) / effectiveZoom,
      y: (rect.top - rootRect.top + rect.height / 2) / effectiveZoom
    };
  };

  const ensureAudio = async () => {
    if (engineRef.current && ctxRef.current) return;
    const ctx = new AudioContext();
    await ctx.resume();
    await loadWorklets(ctx);

    const engine = new AudioEngine(ctx);
    engine.setModules(modules);
    engine.setCables(cables);

    ctxRef.current = ctx;
    engineRef.current = engine;
  };

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setModules(modules);
  }, [modules]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setCables(cables);
  }, [cables]);

  const updateKeyboardParams = (paramsUpdate: Record<string, number>) => {
    setModules((prev) => {
      let nextKeyboard: ModuleModel | null = null;
      const next = prev.map((module) => {
        if (module.id !== 'kbd1') return module;
        nextKeyboard = {
          ...module,
          params: {
            ...module.params,
            ...paramsUpdate
          }
        };
        return nextKeyboard;
      });
      if (nextKeyboard && engineRef.current) {
        engineRef.current.upsertModule(nextKeyboard);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!enabled) return;

    const down = new Set<string>();

    const onDown = (ev: KeyboardEvent) => {
      if (ev.repeat) return;
      const key = ev.key.toLowerCase();
      if (key === 'z') {
        setOctaveShift((prev) => Math.max(-3, prev - 1));
        return;
      }
      if (key === 'x') {
        setOctaveShift((prev) => Math.min(3, prev + 1));
        return;
      }
      const note = KEYMAP[key];
      if (note === undefined) return;
      down.add(key);
      const hz = midiToHz(note + octaveShift * 12);

      updateKeyboardParams({
        pitchHz: hz,
        pitch3Hz: hz,
        pitch5Hz: hz,
        gate: 1
      });
    };

    const onUp = (ev: KeyboardEvent) => {
      const key = ev.key.toLowerCase();
      if (!down.has(key)) return;
      down.delete(key);
      if (down.size === 0) {
        updateKeyboardParams({ gate: 0 });
      }
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [enabled, octaveShift]);

  useEffect(() => {
    const onResize = () => setLayoutTick((tick) => tick + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setLayoutTick((tick) => tick + 1));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('synthTheme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(userPresets));
  }, [userPresets]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setSelectedCableId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement !== null);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!pendingCenterRef.current) return;
    pendingCenterRef.current = false;
    requestAnimationFrame(() => {
      centerModules();
    });
  }, [zoom]);

  useEffect(() => {
    scheduleResolve();
  }, []);

  const applyPreset = (nextPresetId: string) => {
    const preset = PRESETS.find((entry) => entry.id === nextPresetId);
    if (preset) {
      setModules((prev) => {
        const next = [...prev];
        const existingIds = new Set(next.map((module) => module.id));

        if (preset.modules) {
          for (const module of preset.modules) {
            if (existingIds.has(module.id)) continue;
            const def = MODULE_DEFS[module.type];
            const params: Record<string, number> = {};
            def.params.forEach((param) => {
              params[param.id] = param.defaultValue;
            });
            next.push({
              ...module,
              params: {
                ...params,
                ...module.params
              }
            });
            existingIds.add(module.id);
          }
        }

        const withParams = next.map((module) => {
          const patch = preset.params[module.id as keyof typeof preset.params];
          if (!patch) return module;
          return {
            ...module,
            params: {
              ...module.params,
              ...patch
            }
          };
        });
        setIdCounters(buildIdCounters(withParams));
        return withParams;
      });
      if (preset.cables) {
        setCables(preset.cables.map((cable) => ({ ...cable, id: uid() })));
      }
      setPresetId(nextPresetId);
      setSelectedCableId(null);
      setSelectedModuleId(null);
      scheduleResolve({ full: true });
      return;
    }

    const userPreset = userPresets.find((entry) => entry.id === nextPresetId);
    if (!userPreset) return;
    const normalized = normalizePresetModules(userPreset.modules);
    setModules(normalized);
    setCables(userPreset.cables.map((cable) => ({ ...cable, id: uid() })));
    setIdCounters(buildIdCounters(normalized));
    setPresetId(nextPresetId);
    setSelectedCableId(null);
    setSelectedModuleId(null);
    scheduleResolve({ full: true });
  };

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 2200);
  };

  const capturePreset = (label: string) => {
    const modulesSnapshot = normalizePresetModules(
      modules.map((module) => ({
        ...module,
        params: { ...module.params }
      }))
    );
    const cablesSnapshot = cables.map((cable) => ({ ...cable }));
    return {
      id: uid(),
      label,
      modules: modulesSnapshot,
      cables: cablesSnapshot,
      createdAt: Date.now()
    };
  };

  const getPresetPayload = () => {
    const preset =
      userPresets.find((entry) => entry.id === presetId) ?? capturePreset('Current Patch');
    return JSON.stringify(preset, null, 2);
  };

  const copyPresetJson = () => {
    const payload = getPresetPayload();
    navigator.clipboard.writeText(payload).then(
      () => showToast('Preset JSON copied.'),
      () => showToast('Copy failed.')
    );
  };

  const buildBuiltinPresetSnippet = () => {
    const label = window.prompt('Built-in preset label?', 'New Preset');
    if (!label) return null;
    const id = slugifyLabel(window.prompt('Built-in preset id?', slugifyLabel(label)) ?? label);

    const modulesSnapshot = normalizePresetModules(
      modules.map((module) => ({
        ...module,
        params: {}
      }))
    );

    const params: Record<string, Record<string, number>> = {};
    for (const module of modules) {
      params[module.id] = { ...module.params };
    }

    const snippet = `{
  id: '${id}',
  label: '${label.replace(/'/g, "\\'")}',
  modules: ${JSON.stringify(modulesSnapshot, null, 2)},
  params: ${JSON.stringify(params, null, 2)},
  cables: ${JSON.stringify(cables, null, 2)}
}`;

    return snippet;
  };


  const saveUserPreset = () => {
    const label = window.prompt('Preset name?', 'My Preset');
    if (!label) return;
    const preset = capturePreset(label.trim() || 'My Preset');
    setUserPresets((prev) => [...prev, preset]);
    setPresetId(preset.id);
    showToast('Preset saved.');
  };

  const duplicateUserPreset = () => {
    const preset = userPresets.find((entry) => entry.id === presetId);
    if (!preset) return;
    const next = {
      ...preset,
      id: uid(),
      label: `${preset.label} Copy`,
      createdAt: Date.now()
    };
    setUserPresets((prev) => [...prev, next]);
    setPresetId(next.id);
    showToast('Preset duplicated.');
  };

  const renameUserPreset = () => {
    const preset = userPresets.find((entry) => entry.id === presetId);
    if (!preset) return;
    const label = window.prompt('Rename preset', preset.label);
    if (!label) return;
    setUserPresets((prev) =>
      prev.map((entry) =>
        entry.id === preset.id ? { ...entry, label: label.trim() || entry.label } : entry
      )
    );
    showToast('Preset renamed.');
  };

  const deleteUserPreset = () => {
    const preset = userPresets.find((entry) => entry.id === presetId);
    if (!preset) return;
    if (!window.confirm(`Delete preset "${preset.label}"?`)) return;
    setUserPresets((prev) => prev.filter((entry) => entry.id !== preset.id));
    setPresetId(null);
    showToast('Preset deleted.');
  };

  const exportPreset = () => {
    const preset =
      userPresets.find((entry) => entry.id === presetId) ?? capturePreset('Current Patch');
    const payload = JSON.stringify(preset, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${preset.label.replace(/[^a-z0-9_-]+/gi, '_').toLowerCase() || 'preset'}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('Preset exported.');
  };

  const importPreset = () => {
    presetImportRef.current?.click();
  };

  const onImportPresetChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = reader.result;
        if (typeof raw !== 'string') return;
        const parsed = JSON.parse(raw);
        const incoming = Array.isArray(parsed) ? parsed : [parsed];
        const next: UserPreset[] = [];
        for (const entry of incoming) {
          if (!entry || !Array.isArray(entry.modules) || !Array.isArray(entry.cables)) continue;
          const label = typeof entry.label === 'string' ? entry.label : 'Imported Preset';
          next.push({
            id: uid(),
            label,
            modules: normalizePresetModules(entry.modules),
            cables: entry.cables.map((cable: CableModel) => ({ ...cable })),
            createdAt: Date.now()
          });
        }
        if (next.length) {
          setUserPresets((prev) => [...prev, ...next]);
          setPresetId(next[next.length - 1].id);
          showToast('Preset imported.');
        }
      } catch {
        showToast('Preset import failed.');
      } finally {
        ev.target.value = '';
      }
    };
    reader.readAsText(file);
  };


  useEffect(() => {
    setLayoutTick((tick) => tick + 1);
  }, [effectiveZoom]);

  const onEnable = async () => {
    await ensureAudio();
    setEnabled(true);
  };

  const resolveOverlaps = (target?: { anchorId: string | null; full: boolean }) => {
    const inner = innerRef.current;
    if (!inner) return;
    const sizes = new Map<string, { w: number; h: number }>();
    for (const module of modules) {
      const el = moduleRefs.current.get(moduleKey(module.id));
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      sizes.set(module.id, {
        w: rect.width / effectiveZoom,
        h: rect.height / effectiveZoom
      });
    }

    const padding = 16;
    if (target?.full) {
      const placed: Array<{ id: string; x: number; y: number; w: number; h: number }> = [];
      const nextPositions = new Map<string, { x: number; y: number }>();
      const sorted = [...modules].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));

      for (const module of sorted) {
        const size = sizes.get(module.id);
        if (!size) continue;
        let x = module.x;
        let y = module.y;
        let moved = true;
        while (moved) {
          moved = false;
          for (const other of placed) {
            const overlapX = x < other.x + other.w + padding && x + size.w + padding > other.x;
            const overlapY = y < other.y + other.h + padding && y + size.h + padding > other.y;
            if (overlapX && overlapY) {
              y = other.y + other.h + padding;
              moved = true;
            }
          }
        }
        placed.push({ id: module.id, x, y, w: size.w, h: size.h });
        nextPositions.set(module.id, { x, y });
      }

      setModules((prev) => {
        let changed = false;
        const next = prev.map((module) => {
          const pos = nextPositions.get(module.id);
          if (!pos) return module;
          if (pos.x !== module.x || pos.y !== module.y) {
            changed = true;
            return { ...module, x: pos.x, y: pos.y };
          }
          return module;
        });
        return changed ? next : prev;
      });
      return;
    }

    const anchorId = target?.anchorId;
    if (!anchorId) return;
    const anchor = modules.find((module) => module.id === anchorId);
    if (!anchor) return;
    const size = sizes.get(anchorId);
    if (!size) return;

    let x = anchor.x;
    let y = anchor.y;
    let moved = true;
    while (moved) {
      moved = false;
      for (const other of modules) {
        if (other.id === anchorId) continue;
        const otherSize = sizes.get(other.id);
        if (!otherSize) continue;
        const overlapX = x < other.x + otherSize.w + padding && x + size.w + padding > other.x;
        const overlapY = y < other.y + otherSize.h + padding && y + size.h + padding > other.y;
        if (overlapX && overlapY) {
          y = other.y + otherSize.h + padding;
          moved = true;
        }
      }
    }

    if (x === anchor.x && y === anchor.y) return;
    setModules((prev) =>
      prev.map((module) => (module.id === anchorId ? { ...module, x, y } : module))
    );
  };

  const scheduleResolve = (target?: { anchorId?: string | null; full?: boolean }) => {
    if (resolveFrameRef.current) return;
    resolveTargetRef.current = {
      anchorId: target?.anchorId ?? null,
      full: target?.full ?? false
    };
    resolveFrameRef.current = window.requestAnimationFrame(() => {
      resolveFrameRef.current = null;
      const nextTarget = resolveTargetRef.current;
      resolveTargetRef.current = null;
      resolveOverlaps(nextTarget ?? undefined);
    });
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    if (drag.kind === 'none') return;
    const point = getLocalPoint(ev.clientX, ev.clientY);

    if (drag.kind === 'move') {
      setModules((prev) =>
        prev.map((module) =>
          module.id === drag.moduleId
            ? { ...module, x: point.x - drag.dx, y: point.y - drag.dy }
            : module
        )
      );
    } else if (drag.kind === 'cable') {
      setDrag({ ...drag, x: point.x, y: point.y });
    } else if (drag.kind === 'resize') {
      const delta = point.x - drag.startX;
      const nextWidth = Math.min(360, Math.max(180, drag.startWidth + delta));
      setModules((prev) =>
        prev.map((module) =>
          module.id === drag.moduleId ? { ...module, width: nextWidth } : module
        )
      );
    } else if (drag.kind === 'pan') {
      const container = containerRef.current;
      if (!container) return;
      const dx = point.x - drag.startX;
      const dy = point.y - drag.startY;
      container.scrollLeft = drag.scrollLeft - dx * effectiveZoom;
      container.scrollTop = drag.scrollTop - dy * effectiveZoom;
    }
  };

  const endDrag = () => {
    const kind = drag.kind;
    setDrag({ kind: 'none' });
    if (kind === 'move' || kind === 'resize') {
      if (kind === 'move') scheduleResolve({ anchorId: drag.moduleId });
      if (kind === 'resize') scheduleResolve({ anchorId: drag.moduleId });
    }
  };

  const onCanvasContextMenu = (ev: React.MouseEvent) => {
    const fullscreenActive = document.fullscreenElement !== null;
    if (!fullscreenActive) return;
    ev.stopPropagation();
    const target = ev.target as HTMLElement;
    if (target.closest('.synth-module') || target.closest('.synth-toolbar-panel')) return;
    ev.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    const x = rect ? ev.clientX - rect.left : ev.clientX;
    const y = rect ? ev.clientY - rect.top : ev.clientY;
    setContextMenu({ x, y, visible: true });
  };

  const onModulePointerDown = (ev: React.PointerEvent, moduleId: string) => {
    if (ev.button !== 0) return;
    ev.stopPropagation();
    const root = surfaceRef.current;
    if (!root) return;

    setSelectedModuleId(moduleId);
    const point = getLocalPoint(ev.clientX, ev.clientY);
    const module = modules.find((item) => item.id === moduleId);
    if (!module) return;

    ev.currentTarget.setPointerCapture(ev.pointerId);
    setDrag({ kind: 'move', moduleId, dx: point.x - module.x, dy: point.y - module.y });
  };

  const onModuleResizeDown = (ev: React.PointerEvent, moduleId: string) => {
    if (ev.button !== 0) return;
    ev.stopPropagation();
    const module = modules.find((item) => item.id === moduleId);
    if (!module) return;
    const startWidth = module.width ?? 240;
    const point = getLocalPoint(ev.clientX, ev.clientY);
    ev.currentTarget.setPointerCapture(ev.pointerId);
    setDrag({ kind: 'resize', moduleId, startX: point.x, startWidth });
  };

  const getModuleSize = (module: ModuleModel) => {
    const width = module.width ?? 220;
    const el = moduleRefs.current.get(moduleKey(module.id));
    const height = el ? el.getBoundingClientRect().height / effectiveZoom : 220;
    return { width, height };
  };

  const findFreeSpot = (baseX: number, baseY: number, width: number, height: number) => {
    const padding = 16;
    const boxes = modules.map((module) => {
      const size = getModuleSize(module);
      return { x: module.x, y: module.y, w: size.width, h: size.height };
    });
    const fits = (x: number, y: number) =>
      !boxes.some(
        (box) =>
          x < box.x + box.w + padding &&
          x + width + padding > box.x &&
          y < box.y + box.h + padding &&
          y + height + padding > box.y
      );

    const step = 40;
    const maxRing = 20;
    const clampX = (x: number) => Math.max(0, Math.min(SURFACE_WIDTH - width, x));
    const clampY = (y: number) => Math.max(0, Math.min(SURFACE_HEIGHT - height, y));

    for (let ring = 0; ring <= maxRing; ring += 1) {
      for (let dx = -ring; dx <= ring; dx += 1) {
        for (let dy = -ring; dy <= ring; dy += 1) {
          if (ring > 0 && Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
          const x = clampX(baseX + dx * step);
          const y = clampY(baseY + dy * step);
          if (fits(x, y)) return { x, y };
        }
      }
    }

    return { x: clampX(baseX), y: clampY(baseY) };
  };

  const onCanvasPointerDown = (ev: React.PointerEvent) => {
    if (ev.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;
    const target = ev.target as HTMLElement;
    if (target.closest('.synth-module') || target.closest('.synth-toolbar-panel')) return;
    if (contextMenu.visible) {
      setContextMenu((prev) => ({ ...prev, visible: false }));
    }
    setSelectedCableId(null);
    setSelectedModuleId(null);
    ev.currentTarget.setPointerCapture(ev.pointerId);
    const point = getLocalPoint(ev.clientX, ev.clientY);
    setDrag({
      kind: 'pan',
      startX: point.x,
      startY: point.y,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop
    });
  };

  const onPortPointerDown = (
    ev: React.PointerEvent,
    moduleId: string,
    portId: string,
    dir: 'in' | 'out'
  ) => {
    ev.stopPropagation();
    if (ev.button !== 0) return;
    if (dir !== 'out') return;

    const point = getLocalPoint(ev.clientX, ev.clientY);
    ev.currentTarget.setPointerCapture(ev.pointerId);
    setDrag({ kind: 'cable', from: { moduleId, portId }, x: point.x, y: point.y });
  };

  const onPortPointerUp = (
    ev: React.PointerEvent,
    moduleId: string,
    portId: string,
    dir: 'in' | 'out'
  ) => {
    ev.stopPropagation();
    if (drag.kind !== 'cable') return;
    if (dir !== 'in') return;

    const from = drag.from;
    const to = { moduleId, portId };

    if (from.moduleId === to.moduleId && from.portId === to.portId) {
      endDrag();
      return;
    }

    setCables((prev) => [...prev, { id: uid(), from, to }]);
    endDrag();
  };

  const deleteCable = (cableId: string) => {
    setCables((prev) => prev.filter((cable) => cable.id !== cableId));
    setSelectedCableId((prev) => (prev === cableId ? null : prev));
  };

  const removeSelectedModule = () => {
    if (!selectedModuleId) return;
    setModules((prev) => prev.filter((module) => module.id !== selectedModuleId));
    setCables((prev) =>
      prev.filter(
        (cable) => cable.from.moduleId !== selectedModuleId && cable.to.moduleId !== selectedModuleId
      )
    );
    setSelectedModuleId(null);
  };

  const copySelectedModule = () => {
    if (!selectedModuleId) return;
    const source = modules.find((module) => module.id === selectedModuleId);
    if (!source) return;
    copiedModuleRef.current = {
      ...source,
      params: { ...source.params }
    };
  };

  const pasteModule = () => {
    const source = copiedModuleRef.current;
    if (!source) return;
    if (resolveFrameRef.current) {
      window.cancelAnimationFrame(resolveFrameRef.current);
      resolveFrameRef.current = null;
      resolveTargetRef.current = null;
    }
    const type = source.type;
    const nextIndex = getNextModuleIndex(type, modules);
    const id = `${type}${nextIndex}`;
    const size = getModuleSize(source);
    const spot = findFreeSpot(source.x + 40, source.y + 40, size.width, size.height);
    const nextModule: ModuleModel = {
      ...source,
      id,
      x: spot.x,
      y: spot.y,
      params: { ...source.params }
    };
    setModules((prev) => [...prev, nextModule]);
    setIdCounters((prev) => ({ ...prev, [type]: nextIndex }));
    setSelectedModuleId(id);
    setLayoutTick((tick) => tick + 1);
  };

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Delete' && ev.key !== 'Backspace') return;
      if (!selectedModuleId) return;
      const target = ev.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
      ev.preventDefault();
      removeSelectedModule();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedModuleId, removeSelectedModule]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;

      const isMod = ev.metaKey || ev.ctrlKey;
      if (!isMod) return;
      if (ev.key.toLowerCase() === 'c') {
        ev.preventDefault();
        copySelectedModule();
      }
      if (ev.key.toLowerCase() === 'v') {
        ev.preventDefault();
        pasteModule();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modules, idCounters, selectedModuleId]);

  const addModule = (type: string) => {
    const container = containerRef.current;
    const nextIndex = getNextModuleIndex(type, modules);
    const id = `${type}${nextIndex}`;
    const def = MODULE_DEFS[type as keyof typeof MODULE_DEFS];
    const params: Record<string, number> = {};
    def.params.forEach((param) => {
      params[param.id] = param.defaultValue;
    });
    const viewLeft = container?.scrollLeft ?? 0;
    const viewTop = container?.scrollTop ?? 0;
    const viewWidth = container?.clientWidth ?? 800;
    const viewHeight = container?.clientHeight ?? 600;
    const x = viewLeft / effectiveZoom + viewWidth / (2 * effectiveZoom) - 100 + (nextIndex % 3) * 30;
    const y = viewTop / effectiveZoom + viewHeight / (2 * effectiveZoom) - 80 + (nextIndex % 4) * 24;

    setModules((prev) => [
      ...prev,
      {
        id,
        type: def.type,
        x,
        y,
        width: 220,
        collapsed: true,
        params
      }
    ]);
    setIdCounters((prev) => ({ ...prev, [type]: nextIndex }));
    setSelectedModuleId(id);
    scheduleResolve({ anchorId: id });
  };

  const toggleFullscreen = () => {
    const target = pageRef.current;
    if (!target) return;
    if (!document.fullscreenElement) {
      target.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const centerModules = () => {
    const container = containerRef.current;
    if (!container) return;
    if (modules.length === 0) return;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const module of modules) {
      const el = moduleRefs.current.get(moduleKey(module.id));
      const width = module.width ?? 240;
      const height = el ? el.getBoundingClientRect().height / effectiveZoom : 180;
      minX = Math.min(minX, module.x);
      minY = Math.min(minY, module.y);
      maxX = Math.max(maxX, module.x + width);
      maxY = Math.max(maxY, module.y + height);
    }

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const targetLeft = centerX * effectiveZoom - container.clientWidth / 2;
    const targetTop = centerY * effectiveZoom - container.clientHeight / 2;

    const maxLeft = Math.max(0, SURFACE_WIDTH * effectiveZoom - container.clientWidth);
    const maxTop = Math.max(0, SURFACE_HEIGHT * effectiveZoom - container.clientHeight);

    container.scrollLeft = Math.max(0, Math.min(maxLeft, targetLeft));
    container.scrollTop = Math.max(0, Math.min(maxTop, targetTop));
  };

  const resetLayout = () => {
    const freshModules = initialModules();
    const freshCables = initialCables();
    if (resolveFrameRef.current) {
      window.cancelAnimationFrame(resolveFrameRef.current);
      resolveFrameRef.current = null;
    }
    setModules(freshModules);
    setCables(freshCables);
    setIdCounters(buildIdCounters(freshModules));
    setPresetId(null);
    setSelectedModuleId(null);
    setSelectedCableId(null);
    pendingCenterRef.current = false;
    setZoom(1);
    setLayoutTick((tick) => tick + 1);
    requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      container.scrollLeft = 0;
      container.scrollTop = 0;
    });
  };

  const collapseAll = () => {
    setModules((prev) => prev.map((module) => ({ ...module, collapsed: true })));
    scheduleResolve();
  };

  const expandAll = () => {
    setModules((prev) => prev.map((module) => ({ ...module, collapsed: false })));
    scheduleResolve();
  };

  const cablePaths = useMemo(() => {
    const paths: Array<{ id: string; d: string }> = [];
    for (const cable of cables) {
      const a = getPortCenter(cable.from.moduleId, cable.from.portId);
      const b = getPortCenter(cable.to.moduleId, cable.to.portId);
      if (!a || !b) continue;

      const dx = Math.max(40, Math.abs(b.x - a.x) * 0.5);
      const c1 = { x: a.x + dx, y: a.y };
      const c2 = { x: b.x - dx, y: b.y };
      const d = `M ${a.x} ${a.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`;
      paths.push({ id: cable.id, d });
    }
    return paths;
  }, [cables, modules, layoutTick]);

  const tempCable = useMemo(() => {
    if (drag.kind !== 'cable') return null;
    const a = getPortCenter(drag.from.moduleId, drag.from.portId);
    if (!a) return null;

    const b = { x: drag.x, y: drag.y };
    const dx = Math.max(40, Math.abs(b.x - a.x) * 0.5);
    const c1 = { x: a.x + dx, y: a.y };
    const c2 = { x: b.x - dx, y: b.y };
    return `M ${a.x} ${a.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`;
  }, [drag, modules, layoutTick]);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, []);

  const selectedUserPreset = userPresets.find((preset) => preset.id === presetId) ?? null;

  return (
    <div className="synth-root" data-theme={theme}>
      <div
        ref={pageRef}
        className={`synth-page ${isFullscreen ? 'is-fullscreen' : ''}`}
      >
        <div className="synth-header">
          <div className="synth-title">
            {embedded ? (
              <Link to="/playground" className="synth-link">
                &larr; Back to Playground
              </Link>
            ) : null}
            <h1>Modular Synth Playground</h1>
            <p>
              Patch audio-rate gates, envelopes, and CV with drag-to-connect cables. Works best in
              fullscreen.
            </p>
            <div className="synth-tabs-row">
              <span className="synth-tabs-label">Presets</span>
              <select
                className="synth-select"
                value={presetId ?? ''}
                onChange={(ev) => applyPreset(ev.target.value)}
              >
                <option value="" disabled>
                  Select a preset
                </option>
                <optgroup label="Built-in">
                  {PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="My Presets">
                  {userPresets.length === 0 ? (
                    <option value="" disabled>
                      (none yet)
                    </option>
                  ) : null}
                  {userPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </optgroup>
              </select>
              <button className="synth-button" type="button" onClick={saveUserPreset}>
                Save
              </button>
              <button
                className="synth-button"
                type="button"
                onClick={duplicateUserPreset}
                disabled={!selectedUserPreset}
              >
                Duplicate
              </button>
              <button
                className="synth-button"
                type="button"
                onClick={renameUserPreset}
                disabled={!selectedUserPreset}
              >
                Rename
              </button>
              <button
                className="synth-button"
                type="button"
                onClick={deleteUserPreset}
                disabled={!selectedUserPreset}
              >
                Delete
              </button>
              <button className="synth-button" type="button" onClick={exportPreset}>
                Export
              </button>
              <button className="synth-button" type="button" onClick={importPreset}>
                Import
              </button>
              <button className="synth-button" type="button" onClick={copyPresetJson}>
                Copy JSON
              </button>
              {isDev ? (
                <button
                  className="synth-button"
                  type="button"
                  onClick={() => {
                    const snippet = buildBuiltinPresetSnippet();
                    if (!snippet) return;
                    navigator.clipboard.writeText(snippet).then(
                      () => showToast('Built-in preset snippet copied.'),
                      () => showToast('Copy failed.')
                    );
                  }}
                >
                  Dev: Copy Built-in
                </button>
              ) : null}
              <input
                ref={presetImportRef}
                type="file"
                accept="application/json"
                onChange={onImportPresetChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="synth-toolbar">
            {!enabled ? (
              <button className="synth-button is-primary" onClick={onEnable}>
                Enable Audio
              </button>
            ) : (
              <button className="synth-button is-muted" type="button">
                Audio Enabled
              </button>
            )}
            <button
              className="synth-button"
              type="button"
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            >
              Theme: {theme === 'dark' ? 'Dark' : 'Light'}
            </button>
            <button className="synth-button" type="button" onClick={resetLayout}>
              Reset Layout
            </button>
            <button className="synth-button" type="button" onClick={collapseAll}>
              Collapse All
            </button>
            <button className="synth-button" type="button" onClick={expandAll}>
              Expand All
            </button>
            <button
              className="synth-button"
              type="button"
              onClick={() => setZoom((prev) => Math.max(0.6, Number((prev - 0.1).toFixed(2))))}
            >
              Zoom -
            </button>
            <button
              className="synth-button"
              type="button"
              onClick={() => setZoom((prev) => Math.min(1.4, Number((prev + 0.1).toFixed(2))))}
            >
              Zoom +
            </button>
            <button className="synth-button is-muted" type="button" onClick={() => setZoom(1)}>
              {Math.round(zoom * 100)}%
            </button>
            <button className="synth-button" type="button" onClick={toggleFullscreen}>
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </div>

        <div className="synth-workspace">
          <div
            ref={containerRef}
            className="synth-canvas"
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerLeave={endDrag}
            onPointerDown={onCanvasPointerDown}
            onContextMenu={onCanvasContextMenu}
            onContextMenuCapture={onCanvasContextMenu}
          >
            <div
              ref={surfaceRef}
              className="synth-surface"
              style={{ width: `${SURFACE_WIDTH * effectiveZoom}px`, height: `${SURFACE_HEIGHT * effectiveZoom}px` }}
            >
              <div
                ref={innerRef}
                className="synth-surface-inner"
                style={{ transform: `scale(${effectiveZoom})` }}
              >
                <div className="synth-grid" />

                <div className="synth-layer-cables">
                  <svg width="100%" height="100%" style={{ pointerEvents: 'none' }}>
                    {cablePaths.map((path) => (
                      <path
                        key={path.id}
                        d={path.d}
                        className={
                          path.id === selectedCableId
                            ? 'synth-cable synth-cable-selected'
                            : 'synth-cable'
                        }
                      />
                    ))}
                    {tempCable ? (
                      <path d={tempCable} className="synth-cable" style={{ opacity: 0.4 }} />
                    ) : null}
                  </svg>
                </div>

                {modules.map((module) => (
                  <ModuleNode
                    key={module.id}
                    model={module}
                    isSelected={module.id === selectedModuleId}
                    engine={engineRef.current}
                    onModulePointerDown={onModulePointerDown}
                    onResizePointerDown={onModuleResizeDown}
                    moduleRefs={moduleRefs.current}
                    moduleKey={moduleKey}
                    onToggleCollapse={() => {
                      setModules((prev) =>
                        prev.map((m) =>
                          m.id === module.id ? { ...m, collapsed: !m.collapsed } : m
                        )
                      );
                      scheduleResolve();
                    }}
                    onParamChange={(paramId, value) =>
                      setModules((prev) =>
                        prev.map((m) =>
                          m.id === module.id
                            ? { ...m, params: { ...m.params, [paramId]: value } }
                            : m
                        )
                      )
                    }
                    portRefs={portRefs.current}
                    portKey={portKey}
                    onPortPointerDown={onPortPointerDown}
                    onPortPointerUp={onPortPointerUp}
                  />
                ))}

                <div className="synth-layer-hit">
                  {cablePaths.map((path) => (
                    <svg
                      key={`${path.id}-hit`}
                      width="100%"
                      height="100%"
                      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                    >
                      <path
                        d={path.d}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={22}
                        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                        onPointerDown={(ev) => {
                          ev.stopPropagation();
                          if (ev.button !== 0) return;
                          if (selectedCableId === path.id) {
                            deleteCable(path.id);
                            return;
                          }
                          setSelectedCableId(path.id);
                        }}
                      />
                    </svg>
                  ))}
                </div>
              </div>
            </div>

            {contextMenu.visible && isFullscreen ? (
              <div
                className="synth-context-menu"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onPointerDown={(ev) => ev.stopPropagation()}
                onPointerUp={(ev) => ev.stopPropagation()}
              >
                <div className="synth-context-title">Add module</div>
                <div className="synth-context-list">
                  {Object.values(MODULE_DEFS).map((def) => (
                    <button
                      key={def.type}
                      type="button"
                      className="synth-context-item"
                      onClick={() => {
                        addModule(def.type);
                        setContextMenu((prev) => ({ ...prev, visible: false }));
                      }}
                    >
                      <span>{def.title}</span>
                      <em>{MODULE_DESCRIPTIONS[def.type]}</em>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="synth-toolbar-panel">
            <div className="synth-toolbar-header">
              <div>
                <h2>Modules</h2>
                <p>Add or remove modules.</p>
              </div>
              <button
                className={`synth-button ${selectedModuleId ? '' : 'is-disabled'}`}
                type="button"
                onClick={removeSelectedModule}
                disabled={!selectedModuleId}
              >
                Remove
              </button>
            </div>
            <div className="synth-module-grid">
              {Object.values(MODULE_DEFS).map((def) => (
                <button
                  key={def.type}
                  className="synth-module-card"
                  type="button"
                  onClick={() => addModule(def.type)}
                >
                  <div>
                    <h3>{def.title}</h3>
                    <p>{MODULE_DESCRIPTIONS[def.type]}</p>
                  </div>
                  <span className="synth-add">+ Add</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {toast ? <div className="synth-toast">{toast}</div> : null}

        <div className="synth-footer">
          <span className="synth-pill">Keys: a w s e d f t g y h u j k (z/x octave)</span>
          <span className="synth-pill">Octave: {octaveShift >= 0 ? `+${octaveShift}` : octaveShift}</span>
          <span className="synth-pill">Click a cable to select, click again to delete.</span>
          <span className="synth-pill">Drag the grid to pan; scroll to navigate.</span>
        </div>

        {!isFullscreen ? (
          <div className="synth-glossary">
            <h2>Glossary</h2>
            <dl>
              <dt>CV</dt>
              <dd>Control voltage; a modulation signal used to control parameters.</dd>
              <dt>Gate</dt>
              <dd>On/off control signal (0 or 1) used to trigger events like envelopes.</dd>
              <dt>ADSR</dt>
              <dd>Envelope stages: Attack, Decay, Sustain, Release.</dd>
              <dt>VCA</dt>
              <dd>Voltage-controlled amplifier; scales audio level via CV.</dd>
              <dt>LFO</dt>
              <dd>Low-frequency oscillator used for modulation.</dd>
              <dt>Clock</dt>
              <dd>Timing pulse signal for sequencing or arpeggiation.</dd>
              <dt>FM</dt>
              <dd>Frequency modulation; changing pitch with an audio-rate signal.</dd>
              <dt>Q/Resonance</dt>
              <dd>Filter resonance; emphasis around the cutoff frequency.</dd>
              <dt>Mix</dt>
              <dd>Wet/dry balance between processed and original signal.</dd>
            </dl>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ModuleNode(props: {
  model: ModuleModel;
  isSelected: boolean;
  engine: AudioEngine | null;
  onModulePointerDown: (ev: React.PointerEvent, moduleId: string) => void;
  onResizePointerDown: (ev: React.PointerEvent, moduleId: string) => void;
  moduleRefs: Map<string, HTMLDivElement>;
  moduleKey: (moduleId: string) => string;
  onToggleCollapse: () => void;
  onParamChange: (paramId: string, value: number) => void;
  portRefs: Map<string, HTMLDivElement>;
  portKey: (moduleId: string, portId: string) => string;
  onPortPointerDown: (ev: React.PointerEvent, moduleId: string, portId: string, dir: 'in' | 'out') => void;
  onPortPointerUp: (ev: React.PointerEvent, moduleId: string, portId: string, dir: 'in' | 'out') => void;
}) {
  const def = MODULE_DEFS[props.model.type];
  const width = props.model.width ?? 240;

  return (
    <div
      className={`synth-module ${props.isSelected ? 'is-selected' : ''}`}
      ref={(el) => {
        if (el) props.moduleRefs.set(props.moduleKey(props.model.id), el);
        else props.moduleRefs.delete(props.moduleKey(props.model.id));
      }}
      style={{ left: props.model.x, top: props.model.y, width }}
    >
      <div
        className="synth-module-header"
        onPointerDown={(ev) => props.onModulePointerDown(ev, props.model.id)}
      >
        <strong title={MODULE_DESCRIPTIONS[def.type]}>{def.title}</strong>
        <div className="synth-module-actions">
          <button
            className="synth-module-toggle"
            type="button"
            onPointerDown={(ev) => {
              ev.stopPropagation();
            }}
            onClick={props.onToggleCollapse}
          >
            {props.model.collapsed ? 'Expand' : 'Collapse'}
          </button>
          <span>{props.model.id}</span>
        </div>
      </div>

      <div className="synth-module-body">
        {props.model.type === 'scope' ? (
          <div className="synth-scope-block">
            <ScopeViz
              engine={props.engine}
              moduleId={props.model.id}
              view={props.model.params.view ?? 0}
            />
            <div className="synth-scope-controls">
              <button
                className="synth-button synth-button--mini"
                type="button"
                onClick={() =>
                  props.onParamChange('view', (props.model.params.view ?? 0) >= 0.5 ? 0 : 1)
                }
              >
                {(props.model.params.view ?? 0) >= 0.5 ? 'FFT' : 'TIME'}
              </button>
              <button
                className="synth-button synth-button--mini"
                type="button"
                onClick={() =>
                  props.onParamChange('thru', (props.model.params.thru ?? 1) >= 0.5 ? 0 : 1)
                }
              >
                {(props.model.params.thru ?? 1) >= 0.5 ? 'INLINE' : 'TAP'}
              </button>
            </div>
          </div>
        ) : null}
        <div className="synth-ports">
          <div className="synth-port-group">
            <div className="synth-port-label">Inputs</div>
            {def.inputs.map((port) => (
              <Port
                key={port.id}
                label={port.name}
                dir="in"
                register={(el) => {
                  if (el) props.portRefs.set(props.portKey(props.model.id, port.id), el);
                  else props.portRefs.delete(props.portKey(props.model.id, port.id));
                }}
                onDown={(ev) => props.onPortPointerDown(ev, props.model.id, port.id, 'in')}
                onUp={(ev) => props.onPortPointerUp(ev, props.model.id, port.id, 'in')}
              />
            ))}
          </div>

          <div className="synth-port-group">
            <div className="synth-port-label">Outputs</div>
            {def.outputs.map((port) => (
              <Port
                key={port.id}
                label={port.name}
                dir="out"
                register={(el) => {
                  if (el) props.portRefs.set(props.portKey(props.model.id, port.id), el);
                  else props.portRefs.delete(props.portKey(props.model.id, port.id));
                }}
                onDown={(ev) => props.onPortPointerDown(ev, props.model.id, port.id, 'out')}
                onUp={(ev) => props.onPortPointerUp(ev, props.model.id, port.id, 'out')}
              />
            ))}
          </div>
        </div>

        {!props.model.collapsed ? (
          <div className="synth-controls">
            {def.params.map((param) => {
              const value = props.model.params[param.id] ?? param.defaultValue;
              const showKnob = KNOB_PARAM_IDS.has(param.id);
              return showKnob ? (
                <Knob
                  key={param.id}
                  label={param.label}
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  value={value}
                  defaultValue={param.defaultValue}
                  onChange={(next) => props.onParamChange(param.id, next)}
                />
              ) : (
                <Slider
                  key={param.id}
                  label={param.label}
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  value={value}
                  defaultValue={param.defaultValue}
                  onChange={(next) => props.onParamChange(param.id, next)}
                />
              );
            })}
          </div>
        ) : null}
      </div>
      <div
        className="synth-resize-handle"
        role="presentation"
        onPointerDown={(ev) => props.onResizePointerDown(ev, props.model.id)}
      />
    </div>
  );
}

function Port(props: {
  label: string;
  dir: 'in' | 'out';
  register: (el: HTMLDivElement | null) => void;
  onDown: (ev: React.PointerEvent) => void;
  onUp: (ev: React.PointerEvent) => void;
}) {
  return (
    <div className="synth-port">
      {props.dir === 'in' ? (
        <div
          ref={props.register}
          onPointerDown={props.onDown}
          onPointerUp={props.onUp}
          title="Input"
          className="synth-port-dot"
        />
      ) : null}

      <span>{props.label}</span>

      {props.dir === 'out' ? (
        <div
          ref={props.register}
          onPointerDown={props.onDown}
          onPointerUp={props.onUp}
          title="Output"
          className="synth-port-dot is-out"
          style={{ marginLeft: 'auto' }}
        />
      ) : null}
    </div>
  );
}

function Slider(props: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  defaultValue: number;
  onChange: (value: number) => void;
}) {
  const onReset = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    props.onChange(props.defaultValue);
  };

  return (
    <label className="synth-control" onDoubleClick={onReset}>
      <div className="synth-control-header">
        <span>{props.label}</span>
        <input
          className="synth-value-input"
          type="number"
          min={props.min}
          max={props.max}
          step={props.step}
          value={Number.isFinite(props.value) ? props.value : ''}
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={onReset}
          onChange={(e) => props.onChange(Number(e.target.value))}
        />
      </div>
      <input
        className="synth-range"
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={onReset}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  );
}

function ScopeViz(props: {
  engine: AudioEngine | null;
  moduleId: string;
  view: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyser = props.engine ? props.engine.getAnalyser(props.moduleId) : null;
  const timeBufRef = useRef<Float32Array | null>(null);
  const freqBufRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    let raf = 0;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const ctx2d = canvas.getContext('2d');
      if (!ctx2d) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const a = analyser;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      const pw = Math.max(1, Math.floor(w * dpr));
      const ph = Math.max(1, Math.floor(h * dpr));
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }

      ctx2d.clearRect(0, 0, pw, ph);
      ctx2d.lineWidth = 1;
      ctx2d.strokeStyle = 'rgba(148,163,184,0.35)';
      ctx2d.strokeRect(0.5, 0.5, pw - 1, ph - 1);

      if (!a) {
        ctx2d.fillStyle = 'rgba(226,232,240,0.8)';
        ctx2d.font = `${Math.max(10, Math.floor(12 * dpr))}px sans-serif`;
        ctx2d.fillText('No signal', Math.floor(10 * dpr), Math.floor(18 * dpr));
        raf = requestAnimationFrame(draw);
        return;
      }

      if (props.view >= 0.5) {
        const n = a.frequencyBinCount;
        if (!freqBufRef.current || freqBufRef.current.length !== n) {
          freqBufRef.current = new Uint8Array(n);
        }
        const buf = freqBufRef.current;
        a.getByteFrequencyData(buf);

        const barW = pw / n;
        ctx2d.fillStyle = 'rgba(56,189,248,0.7)';
        for (let i = 0; i < n; i += 1) {
          const v = buf[i] / 255;
          const bh = Math.max(1, Math.floor(v * (ph - 2)));
          ctx2d.fillRect(Math.floor(i * barW), ph - 1 - bh, Math.max(1, Math.ceil(barW)), bh);
        }
      } else {
        const n = a.fftSize;
        if (!timeBufRef.current || timeBufRef.current.length !== n) {
          timeBufRef.current = new Float32Array(n);
        }
        const buf = timeBufRef.current;
        a.getFloatTimeDomainData(buf);

        ctx2d.strokeStyle = 'rgba(226,232,240,0.9)';
        ctx2d.beginPath();
        const mid = ph / 2;
        for (let i = 0; i < n; i += 1) {
          const x = (i / (n - 1)) * (pw - 1);
          const y = mid - buf[i] * (mid - 2);
          if (i === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
        }
        ctx2d.stroke();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [analyser, props.view]);

  return (
    <div className="synth-scope">
      <canvas ref={canvasRef} className="synth-scope-canvas" />
    </div>
  );
}

function Knob(props: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  defaultValue: number;
  onChange: (value: number) => void;
}) {
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null);
  const range = props.max - props.min;
  const normalized = range > 0 ? (props.value - props.min) / range : 0;
  const angle = normalized * 270 - 135;

  const onReset = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    props.onChange(props.defaultValue);
  };

  const onPointerDown = (ev: React.PointerEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    ev.currentTarget.setPointerCapture(ev.pointerId);
    dragRef.current = { startY: ev.clientY, startValue: props.value };
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    if (!dragRef.current) return;
    const delta = dragRef.current.startY - ev.clientY;
    const next = dragRef.current.startValue + delta * (range / 140);
    const clamped = Math.min(props.max, Math.max(props.min, next));
    props.onChange(roundToStep(clamped, props.step));
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="synth-knob">
      <div className="synth-control-header" style={{ width: '100%' }}>
        <span>{props.label}</span>
        <input
          className="synth-value-input"
          type="number"
          min={props.min}
          max={props.max}
          step={props.step}
          value={Number.isFinite(props.value) ? props.value : ''}
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={onReset}
          onChange={(e) => props.onChange(Number(e.target.value))}
        />
      </div>
      <div
        className="synth-knob-core"
        role="slider"
        aria-valuemin={props.min}
        aria-valuemax={props.max}
        aria-valuenow={props.value}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDoubleClick={onReset}
      >
        <div className="synth-knob-indicator" style={{ transform: `rotate(${angle}deg)` }} />
      </div>
    </div>
  );
}

function initialModules(): ModuleModel[] {
  return [
    {
      id: 'kbd1',
      type: 'keyboard',
      x: 20,
      y: 20,
      width: 220,
      collapsed: true,
      params: {
        pitchHz: 110,
        glideMs: 0,
        gate: 0,
        trigMs: 10
      }
    },
    {
      id: 'osc1',
      type: 'osc',
      x: 320,
      y: 20,
      width: 220,
      collapsed: true,
      params: {
        baseHz: 110,
        pitchAmt: 1,
        fmDepthHz: 0,
        level: 0.2,
        wave: 1
      }
    },
    {
      id: 'flt1',
      type: 'filter',
      x: 620,
      y: 20,
      width: 220,
      collapsed: true,
      params: {
        cutoff: 1200,
        cutoffDepthHz: 0,
        q: 0.7
      }
    },
    {
      id: 'env1',
      type: 'adsr',
      x: 320,
      y: 360,
      width: 220,
      collapsed: true,
      params: {
        attack: 0.01,
        decay: 0.15,
        sustain: 0.6,
        release: 0.2
      }
    },
    {
      id: 'vca1',
      type: 'vca',
      x: 620,
      y: 360,
      width: 220,
      collapsed: true,
      params: {
        bias: 0,
        cvDepth: 1
      }
    },
    {
      id: 'out1',
      type: 'output',
      x: 920,
      y: 280,
      width: 220,
      collapsed: true,
      params: {
        vol: 0.7
      }
    },
    {
      id: 'lfo1',
      type: 'lfo',
      x: 20,
      y: 360,
      width: 220,
      collapsed: true,
      params: {
        rate: 4,
        depth: 1,
        wave: 0
      }
    },
    {
      id: 'scp1',
      type: 'scope',
      x: 920,
      y: 20,
      width: 240,
      collapsed: true,
      params: {
        thru: 0,
        view: 0,
        fftSize: 2048,
        smoothing: 0.85,
        minDb: -90,
        maxDb: -10
      }
    }
  ];
}

function initialCables(): CableModel[] {
  return [
    { id: 'c1', from: { moduleId: 'kbd1', portId: 'pitch' }, to: { moduleId: 'osc1', portId: 'pitch' } },
    { id: 'c2', from: { moduleId: 'kbd1', portId: 'gate' }, to: { moduleId: 'env1', portId: 'gate' } },
    { id: 'c3', from: { moduleId: 'env1', portId: 'env' }, to: { moduleId: 'vca1', portId: 'cv' } },
    { id: 'c4', from: { moduleId: 'osc1', portId: 'out' }, to: { moduleId: 'flt1', portId: 'in' } },
    { id: 'c5', from: { moduleId: 'flt1', portId: 'out' }, to: { moduleId: 'vca1', portId: 'in' } },
    { id: 'c6', from: { moduleId: 'vca1', portId: 'out' }, to: { moduleId: 'out1', portId: 'in' } },
    { id: 'c7', from: { moduleId: 'lfo1', portId: 'out' }, to: { moduleId: 'flt1', portId: 'cutoffCv' } },
    { id: 'c_scope', from: { moduleId: 'vca1', portId: 'out' }, to: { moduleId: 'scp1', portId: 'in' } }
  ];
}
