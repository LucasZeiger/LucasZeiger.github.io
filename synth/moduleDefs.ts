import type { ModuleDef, ModuleInstance, ModuleModel, ModuleType } from './types';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function smoothSet(param: AudioParam, value: number, ctx: AudioContext, ms = 8) {
  const t = ctx.currentTime;
  const ramp = ms / 1000;
  param.cancelScheduledValues(t);
  param.setValueAtTime(param.value, t);
  param.linearRampToValueAtTime(value, t + ramp);
}

function setImmediate(param: AudioParam, value: number, ctx: AudioContext) {
  const t = ctx.currentTime;
  param.cancelScheduledValues(t);
  param.setValueAtTime(value, t);
}

function coerceFftSize(value: number) {
  const allowed = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
  const n = Math.round(value);
  let best = allowed[0];
  let bestDist = Math.abs(n - best);
  for (const size of allowed) {
    const dist = Math.abs(n - size);
    if (dist < bestDist) {
      best = size;
      bestDist = dist;
    }
  }
  return best;
}

function makeDistCurve(amount: number, n = 2048) {
  const k = clamp(amount, 0, 50);
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.atan(x * k) / Math.atan(k);
  }
  return curve;
}

function makeMix(ctx: AudioContext, initialMix: number, initialDepth: number) {
  const mixPos = new ConstantSourceNode(ctx, { offset: initialMix });
  const mixCvIn = new GainNode(ctx, { gain: initialDepth });
  const mixSum = new GainNode(ctx, { gain: 1 });

  mixPos.connect(mixSum);
  mixCvIn.connect(mixSum);
  mixPos.start();

  const wet = new GainNode(ctx, { gain: 0 });
  const dry = new GainNode(ctx, { gain: 0 });

  mixSum.connect(wet.gain);

  const one = new ConstantSourceNode(ctx, { offset: 1 });
  const inv = new GainNode(ctx, { gain: -1 });
  mixSum.connect(inv);
  one.connect(dry.gain);
  inv.connect(dry.gain);
  one.start();

  return {
    mixPos,
    mixCvIn,
    mixSum,
    wet,
    dry,
    one,
    inv,
    setMix: (value: number) => smoothSet(mixPos.offset, clamp(value, -2, 2), ctx, 20),
    setDepth: (value: number) => smoothSet(mixCvIn.gain, clamp(value, 0, 4), ctx, 20),
    dispose: () => {
      try {
        mixPos.stop();
        one.stop();
      } catch {
        // ignore
      }
      mixPos.disconnect();
      mixCvIn.disconnect();
      mixSum.disconnect();
      wet.disconnect();
      dry.disconnect();
      one.disconnect();
      inv.disconnect();
    }
  };
}

function makeIrPreset(ctx: AudioContext, preset: number, seconds: number) {
  const dur = clamp(seconds, 0.05, 8);
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = new AudioBuffer({ length, numberOfChannels: 1, sampleRate: ctx.sampleRate });
  const ch = buf.getChannelData(0);

  const p = clamp(Math.round(preset), 0, 3);

  for (let i = 0; i < length; i += 1) {
    const t = i / (length - 1);
    let env = 1 - t;

    if (p === 0) env = Math.pow(env, 2.2);
    if (p === 1) env = Math.pow(env, 3.6);
    if (p === 2) env = Math.pow(env, 2.8);
    if (p === 3) env = Math.pow(env, 1.8);

    let s = (Math.random() * 2 - 1) * env;

    if (p === 2) {
      s += Math.sin(2 * Math.PI * (200 + 600 * t) * (i / ctx.sampleRate)) * env * 0.15;
    }
    if (p === 3) {
      s += Math.sin(2 * Math.PI * (120 + 1200 * t) * (i / ctx.sampleRate)) * env * 0.2;
    }

    ch[i] = s;
  }

  return buf;
}

function makeSummedParam(
  ctx: AudioContext,
  initialBase: number,
  initialDepth: number,
  target: AudioParam
) {
  const base = new ConstantSourceNode(ctx, { offset: initialBase });
  const modIn = new GainNode(ctx, { gain: initialDepth });
  base.connect(target);
  modIn.connect(target);
  base.start();

  return {
    base,
    modIn,
    setBase: (value: number) => smoothSet(base.offset, value, ctx),
    setDepth: (value: number) => smoothSet(modIn.gain, value, ctx),
    dispose: () => {
      try {
        base.stop();
      } catch {
        // no-op
      }
      base.disconnect();
      modIn.disconnect();
    }
  };
}

export const MODULE_DEFS: Record<ModuleType, ModuleDef> = {
  keyboard: {
    type: 'keyboard',
    title: 'Keyboard',
    inputs: [],
    outputs: [
      { id: 'pitch', name: 'PITCH (Hz)', dir: 'out', kind: 'pitch' },
      { id: 'pitch3', name: 'PITCH (V2)', dir: 'out', kind: 'pitch' },
      { id: 'pitch5', name: 'PITCH (V3)', dir: 'out', kind: 'pitch' },
      { id: 'gate', name: 'GATE', dir: 'out', kind: 'gate' }
    ],
    params: [
      { id: 'pitchHz', label: 'Pitch (Hz)', min: 20, max: 2000, step: 0.01, defaultValue: 110 },
      { id: 'glideMs', label: 'Glide (ms)', min: 0, max: 500, step: 1, defaultValue: 0 },
      { id: 'gate', label: 'Gate (0/1)', min: 0, max: 1, step: 1, defaultValue: 0 },
      { id: 'trigMs', label: 'Trig (ms)', min: 1, max: 200, step: 1, defaultValue: 10 }
    ],
    create: (ctx, model) => {
      const pitch = new ConstantSourceNode(ctx, { offset: model.params.pitchHz ?? 110 });
      const pitch3 = new ConstantSourceNode(ctx, { offset: model.params.pitch3Hz ?? model.params.pitchHz ?? 110 });
      const pitch5 = new ConstantSourceNode(ctx, { offset: model.params.pitch5Hz ?? model.params.pitchHz ?? 110 });
      pitch.start();
      pitch3.start();
      pitch5.start();

      const gateNode = new AudioWorkletNode(ctx, 'gate-processor', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [1]
      });
      const gateParam = gateNode.parameters.get('gate');

      let glideMs = model.params.glideMs ?? 0;

      const inst: ModuleInstance = {
        id: model.id,
        type: 'keyboard',
        inputs: {},
        outputs: {
          pitch,
          pitch3,
          pitch5,
          gate: gateNode
        },
        setParam: (id, value) => {
          if (id === 'pitchHz') {
            const ms = glideMs;
            const t = ctx.currentTime;
            const next = clamp(value, 20, 20000);
            pitch.offset.cancelScheduledValues(t);
            pitch.offset.setValueAtTime(pitch.offset.value, t);
            if (ms <= 0) {
              pitch.offset.setValueAtTime(next, t);
            } else {
              pitch.offset.linearRampToValueAtTime(next, t + ms / 1000);
            }
          }
          if (id === 'pitch3Hz') smoothSet(pitch3.offset, clamp(value, 20, 20000), ctx);
          if (id === 'pitch5Hz') smoothSet(pitch5.offset, clamp(value, 20, 20000), ctx);
          if (id === 'glideMs') glideMs = clamp(value, 0, 500);
          if (id === 'gate') {
            if (gateParam) gateParam.value = value >= 0.5 ? 1 : 0;
          }
          if (id === 'trigMs') {
            // no-op until UI triggers pulses
          }
        },
        dispose: () => {
          try {
            pitch.stop();
            pitch3.stop();
            pitch5.stop();
          } catch {
            // no-op
          }
          pitch.disconnect();
          pitch3.disconnect();
          pitch5.disconnect();
          gateNode.disconnect();
        }
      };

      if (gateParam) gateParam.value = (model.params.gate ?? 0) >= 0.5 ? 1 : 0;

      return inst;
    }
  },

  osc: {
    type: 'osc',
    title: 'Osc',
    inputs: [
      { id: 'pitch', name: 'PITCH', dir: 'in', kind: 'pitch' },
      { id: 'fm', name: 'FM', dir: 'in', kind: 'cv' }
    ],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [
      { id: 'baseHz', label: 'Base (Hz)', min: 0, max: 2000, step: 0.01, defaultValue: 110 },
      { id: 'pitchAmt', label: 'Pitch Amt', min: 0, max: 2, step: 0.001, defaultValue: 1 },
      { id: 'fmDepthHz', label: 'FM Depth (Hz)', min: 0, max: 4000, step: 1, defaultValue: 0 },
      { id: 'level', label: 'Level', min: 0, max: 1, step: 0.001, defaultValue: 0.2 },
      { id: 'wave', label: 'Wave (0=sine 1=saw 2=square 3=tri)', min: 0, max: 3, step: 1, defaultValue: 1 }
    ],
    create: (ctx, model) => {
      const osc = new OscillatorNode(ctx, { type: 'sawtooth', frequency: 0 });
      const out = new GainNode(ctx, { gain: model.params.level ?? 0.2 });

      const base = makeSummedParam(ctx, model.params.baseHz ?? 110, 0, osc.frequency);

      const pitchIn = new GainNode(ctx, { gain: model.params.pitchAmt ?? 1 });
      pitchIn.connect(osc.frequency);

      const fmIn = new GainNode(ctx, { gain: model.params.fmDepthHz ?? 0 });
      fmIn.connect(osc.frequency);

      osc.connect(out);
      osc.start();

      const waveforms: OscillatorType[] = ['sine', 'sawtooth', 'square', 'triangle'];
      const setWave = (value: number) => {
        const idx = Math.round(clamp(value, 0, 3));
        osc.type = waveforms[idx];
      };
      setWave(model.params.wave ?? 1);

      const inst: ModuleInstance = {
        id: model.id,
        type: 'osc',
        inputs: {
          pitch: pitchIn,
          fm: fmIn
        },
        outputs: { out },
        setParam: (id, value) => {
          if (id === 'baseHz') base.setBase(clamp(value, 0, 20000));
          if (id === 'pitchAmt') smoothSet(pitchIn.gain, clamp(value, 0, 4), ctx);
          if (id === 'fmDepthHz') smoothSet(fmIn.gain, clamp(value, 0, 20000), ctx);
          if (id === 'level') smoothSet(out.gain, clamp(value, 0, 1), ctx);
          if (id === 'wave') setWave(value);
        },
        dispose: () => {
          try {
            osc.stop();
          } catch {
            // no-op
          }
          osc.disconnect();
          out.disconnect();
          pitchIn.disconnect();
          fmIn.disconnect();
          base.dispose();
        }
      };

      return inst;
    }
  },

  filter: {
    type: 'filter',
    title: 'Filter',
    inputs: [
      { id: 'in', name: 'IN', dir: 'in', kind: 'audio' },
      { id: 'cutoffCv', name: 'CUTOFF CV', dir: 'in', kind: 'cv' }
    ],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [
      { id: 'cutoff', label: 'Cutoff (Hz)', min: 20, max: 20000, step: 1, defaultValue: 1200 },
      { id: 'cutoffDepthHz', label: 'Cutoff Depth (Hz)', min: 0, max: 12000, step: 1, defaultValue: 0 },
      { id: 'q', label: 'Res (Q)', min: 0.1, max: 30, step: 0.01, defaultValue: 0.7 }
    ],
    create: (ctx, model) => {
      const filter = new BiquadFilterNode(ctx, {
        type: 'lowpass',
        frequency: 0,
        Q: model.params.q ?? 0.7
      });

      const cutoffSum = makeSummedParam(ctx, model.params.cutoff ?? 1200, 0, filter.frequency);

      const cutoffCvIn = new GainNode(ctx, { gain: model.params.cutoffDepthHz ?? 0 });
      cutoffCvIn.connect(filter.frequency);

      const inst: ModuleInstance = {
        id: model.id,
        type: 'filter',
        inputs: {
          in: filter,
          cutoffCv: cutoffCvIn
        },
        outputs: { out: filter },
        setParam: (id, value) => {
          if (id === 'cutoff') cutoffSum.setBase(clamp(value, 20, 20000));
          if (id === 'cutoffDepthHz') smoothSet(cutoffCvIn.gain, clamp(value, 0, 20000), ctx);
          if (id === 'q') smoothSet(filter.Q, clamp(value, 0.1, 40), ctx);
        },
        dispose: () => {
          filter.disconnect();
          cutoffCvIn.disconnect();
          cutoffSum.dispose();
        }
      };

      return inst;
    }
  },

  adsr: {
    type: 'adsr',
    title: 'ADSR',
    inputs: [{ id: 'gate', name: 'GATE', dir: 'in', kind: 'gate' }],
    outputs: [{ id: 'env', name: 'ENV', dir: 'out', kind: 'cv' }],
    params: [
      { id: 'attack', label: 'Attack (s)', min: 0, max: 5, step: 0.001, defaultValue: 0.01 },
      { id: 'decay', label: 'Decay (s)', min: 0, max: 5, step: 0.001, defaultValue: 0.15 },
      { id: 'sustain', label: 'Sustain', min: 0, max: 1, step: 0.001, defaultValue: 0.6 },
      { id: 'release', label: 'Release (s)', min: 0, max: 5, step: 0.001, defaultValue: 0.2 }
    ],
    create: (ctx, model) => {
      const node = new AudioWorkletNode(ctx, 'adsr-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1]
      });

      const params = node.parameters;
      params.get('attack')!.value = model.params.attack ?? 0.01;
      params.get('decay')!.value = model.params.decay ?? 0.15;
      params.get('sustain')!.value = model.params.sustain ?? 0.6;
      params.get('release')!.value = model.params.release ?? 0.2;

      const inst: ModuleInstance = {
        id: model.id,
        type: 'adsr',
        inputs: { gate: node },
        outputs: { env: node },
        setParam: (id, value) => {
          const param = node.parameters.get(id);
          if (param) smoothSet(param, value, ctx, 12);
        },
        dispose: () => {
          node.disconnect();
        }
      };
      return inst;
    }
  },

  vca: {
    type: 'vca',
    title: 'VCA',
    inputs: [
      { id: 'in', name: 'IN', dir: 'in', kind: 'audio' },
      { id: 'cv', name: 'CV', dir: 'in', kind: 'cv' }
    ],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [
      { id: 'bias', label: 'Bias', min: 0, max: 1, step: 0.001, defaultValue: 0 },
      { id: 'cvDepth', label: 'CV Depth', min: 0, max: 2, step: 0.001, defaultValue: 1 }
    ],
    create: (ctx, model) => {
      const vca = new GainNode(ctx, { gain: 0 });

      const bias = new ConstantSourceNode(ctx, { offset: model.params.bias ?? 0 });
      const cvIn = new GainNode(ctx, { gain: model.params.cvDepth ?? 1 });

      bias.connect(vca.gain);
      cvIn.connect(vca.gain);
      bias.start();

      const inst: ModuleInstance = {
        id: model.id,
        type: 'vca',
        inputs: { in: vca, cv: cvIn },
        outputs: { out: vca },
        setParam: (id, value) => {
          if (id === 'bias') smoothSet(bias.offset, clamp(value, 0, 1), ctx);
          if (id === 'cvDepth') smoothSet(cvIn.gain, clamp(value, 0, 4), ctx);
        },
        dispose: () => {
          try {
            bias.stop();
          } catch {
            // no-op
          }
          bias.disconnect();
          cvIn.disconnect();
          vca.disconnect();
        }
      };
      return inst;
    }
  },

  lfo: {
    type: 'lfo',
    title: 'LFO',
    inputs: [],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'cv' }],
    params: [
      { id: 'rate', label: 'Rate (Hz)', min: 0.01, max: 40, step: 0.01, defaultValue: 4 },
      { id: 'depth', label: 'Depth', min: 0, max: 1, step: 0.001, defaultValue: 1 },
      { id: 'wave', label: 'Wave (0=sine 1=saw 2=square 3=tri)', min: 0, max: 3, step: 1, defaultValue: 0 }
    ],
    create: (ctx, model) => {
      const osc = new OscillatorNode(ctx, { type: 'sine', frequency: model.params.rate ?? 4 });
      const out = new GainNode(ctx, { gain: model.params.depth ?? 1 });
      osc.connect(out);
      osc.start();

      const waveforms: OscillatorType[] = ['sine', 'sawtooth', 'square', 'triangle'];
      const setWave = (value: number) => {
        osc.type = waveforms[Math.round(clamp(value, 0, 3))];
      };
      setWave(model.params.wave ?? 0);

      const inst: ModuleInstance = {
        id: model.id,
        type: 'lfo',
        inputs: {},
        outputs: { out },
        setParam: (id, value) => {
          if (id === 'rate') smoothSet(osc.frequency, clamp(value, 0.01, 200), ctx);
          if (id === 'depth') smoothSet(out.gain, clamp(value, 0, 2), ctx);
          if (id === 'wave') setWave(value);
        },
        dispose: () => {
          try {
            osc.stop();
          } catch {
            // no-op
          }
          osc.disconnect();
          out.disconnect();
        }
      };

      return inst;
    }
  },
  arp: {
    type: 'arp',
    title: 'Arp',
    inputs: [
      { id: 'clock', name: 'CLOCK', dir: 'in', kind: 'gate' },
      { id: 'root', name: 'ROOT (Hz)', dir: 'in', kind: 'pitch' }
    ],
    outputs: [
      { id: 'pitch', name: 'PITCH (Hz)', dir: 'out', kind: 'pitch' },
      { id: 'gate', name: 'GATE', dir: 'out', kind: 'gate' }
    ],
    params: [
      { id: 'rootHz', label: 'Root (Hz)', min: 40, max: 1000, step: 0.01, defaultValue: 220 },
      { id: 'interval', label: 'Interval (st)', min: 1, max: 24, step: 1, defaultValue: 7 },
      { id: 'steps', label: 'Steps', min: 1, max: 8, step: 1, defaultValue: 4 },
      { id: 'pattern', label: 'Pattern (0=up 1=down 2=updown)', min: 0, max: 2, step: 1, defaultValue: 0 },
      { id: 'gateMs', label: 'Gate (ms)', min: 5, max: 400, step: 1, defaultValue: 120 }
    ],
    create: (ctx, model) => {
      const clockIn = new GainNode(ctx, { gain: 1 });
      const rootIn = new GainNode(ctx, { gain: 1 });
      const pitchNode = new AudioWorkletNode(ctx, 'arp-pitch-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1]
      });
      const gateNode = new AudioWorkletNode(ctx, 'arp-gate-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1]
      });

      clockIn.connect(pitchNode);
      clockIn.connect(gateNode);

      const rootBase = new ConstantSourceNode(ctx, { offset: model.params.rootHz ?? 220 });
      rootBase.connect(pitchNode.parameters.get('rootHz')!);
      rootIn.connect(pitchNode.parameters.get('rootHz')!);
      rootBase.start();

      const setSharedParam = (id: string, value: number) => {
        const pitchParam = pitchNode.parameters.get(id);
        const gateParam = gateNode.parameters.get(id);
        if (pitchParam) smoothSet(pitchParam, value, ctx, 12);
        if (gateParam) smoothSet(gateParam, value, ctx, 12);
      };

      setSharedParam('interval', model.params.interval ?? 7);
      setSharedParam('steps', model.params.steps ?? 4);
      setSharedParam('pattern', model.params.pattern ?? 0);
      const gateMsParam = gateNode.parameters.get('gateMs');
      if (gateMsParam) gateMsParam.value = model.params.gateMs ?? 120;

      const inst: ModuleInstance = {
        id: model.id,
        type: 'arp',
        inputs: { clock: clockIn, root: rootIn },
        outputs: { pitch: pitchNode, gate: gateNode },
        setParam: (id, value) => {
          if (id === 'rootHz') {
            smoothSet(rootBase.offset, value, ctx, 12);
            return;
          }
          if (id === 'gateMs') {
            const param = gateNode.parameters.get('gateMs');
            if (param) smoothSet(param, value, ctx, 12);
            return;
          }
          setSharedParam(id, value);
        },
        dispose: () => {
          try {
            rootBase.stop();
          } catch {
            // ignore
          }
          clockIn.disconnect();
          rootIn.disconnect();
          pitchNode.disconnect();
          gateNode.disconnect();
          rootBase.disconnect();
        }
      };

      return inst;
    }
  },

  offset: {
    type: 'offset',
    title: 'Offset',
    inputs: [],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'cv' }],
    params: [{ id: 'value', label: 'Value', min: -1, max: 1, step: 0.001, defaultValue: 0 }],
    create: (ctx, model) => {
      const src = new ConstantSourceNode(ctx, { offset: model.params.value ?? 0 });
      src.start();

      const inst: ModuleInstance = {
        id: model.id,
        type: 'offset',
        inputs: {},
        outputs: { out: src },
        setParam: (id, value) => {
          if (id === 'value') smoothSet(src.offset, clamp(value, -10, 10), ctx, 12);
        },
        dispose: () => {
          try {
            src.stop();
          } catch {
            // ignore
          }
          src.disconnect();
        }
      };

      return inst;
    }
  },

  attenuverter: {
    type: 'attenuverter',
    title: 'Attenuverter',
    inputs: [{ id: 'in', name: 'IN', dir: 'in', kind: 'audio' }],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [{ id: 'amount', label: 'Amount (-1..1)', min: -1, max: 1, step: 0.001, defaultValue: 1 }],
    create: (ctx, model) => {
      const gain = new GainNode(ctx, { gain: model.params.amount ?? 1 });

      const inst: ModuleInstance = {
        id: model.id,
        type: 'attenuverter',
        inputs: { in: gain },
        outputs: { out: gain },
        setParam: (id, value) => {
          if (id === 'amount') smoothSet(gain.gain, clamp(value, -4, 4), ctx);
        },
        dispose: () => {
          gain.disconnect();
        }
      };

      return inst;
    }
  },

  mixer: {
    type: 'mixer',
    title: 'Mixer',
    inputs: [
      { id: 'in1', name: 'IN 1', dir: 'in', kind: 'audio' },
      { id: 'in2', name: 'IN 2', dir: 'in', kind: 'audio' },
      { id: 'in3', name: 'IN 3', dir: 'in', kind: 'audio' },
      { id: 'in4', name: 'IN 4', dir: 'in', kind: 'audio' }
    ],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [
      { id: 'level1', label: 'Level 1', min: 0, max: 2, step: 0.001, defaultValue: 1 },
      { id: 'level2', label: 'Level 2', min: 0, max: 2, step: 0.001, defaultValue: 1 },
      { id: 'level3', label: 'Level 3', min: 0, max: 2, step: 0.001, defaultValue: 1 },
      { id: 'level4', label: 'Level 4', min: 0, max: 2, step: 0.001, defaultValue: 1 },
      { id: 'master', label: 'Master', min: 0, max: 2, step: 0.001, defaultValue: 1 }
    ],
    create: (ctx, model) => {
      const ch1 = new GainNode(ctx, { gain: model.params.level1 ?? 1 });
      const ch2 = new GainNode(ctx, { gain: model.params.level2 ?? 1 });
      const ch3 = new GainNode(ctx, { gain: model.params.level3 ?? 1 });
      const ch4 = new GainNode(ctx, { gain: model.params.level4 ?? 1 });
      const master = new GainNode(ctx, { gain: model.params.master ?? 1 });

      ch1.connect(master);
      ch2.connect(master);
      ch3.connect(master);
      ch4.connect(master);

      const inst: ModuleInstance = {
        id: model.id,
        type: 'mixer',
        inputs: {
          in1: ch1,
          in2: ch2,
          in3: ch3,
          in4: ch4
        },
        outputs: { out: master },
        setParam: (id, value) => {
          if (id === 'level1') smoothSet(ch1.gain, clamp(value, 0, 4), ctx);
          if (id === 'level2') smoothSet(ch2.gain, clamp(value, 0, 4), ctx);
          if (id === 'level3') smoothSet(ch3.gain, clamp(value, 0, 4), ctx);
          if (id === 'level4') smoothSet(ch4.gain, clamp(value, 0, 4), ctx);
          if (id === 'master') smoothSet(master.gain, clamp(value, 0, 4), ctx);
        },
        dispose: () => {
          ch1.disconnect();
          ch2.disconnect();
          ch3.disconnect();
          ch4.disconnect();
          master.disconnect();
        }
      };

      return inst;
    }
  },

  scope: {
    type: 'scope',
    title: 'Scope',
    inputs: [{ id: 'in', name: 'IN', dir: 'in', kind: 'audio' }],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [
      { id: 'thru', label: 'Thru (0=tap,1=inline)', min: 0, max: 1, step: 1, defaultValue: 1 },
      { id: 'view', label: 'View (0=time,1=fft)', min: 0, max: 1, step: 1, defaultValue: 0 },
      { id: 'fftSize', label: 'FFT Size', min: 32, max: 32768, step: 1, defaultValue: 2048 },
      { id: 'smoothing', label: 'Smoothing', min: 0, max: 1, step: 0.01, defaultValue: 0.85 },
      { id: 'minDb', label: 'Min dB', min: -120, max: -10, step: 1, defaultValue: -90 },
      { id: 'maxDb', label: 'Max dB', min: -120, max: 0, step: 1, defaultValue: -10 }
    ],
    create: (ctx, model) => {
      const inGain = new GainNode(ctx, { gain: 1 });
      const analyser = new AnalyserNode(ctx, {
        fftSize: coerceFftSize(model.params.fftSize ?? 2048),
        smoothingTimeConstant: clamp(model.params.smoothing ?? 0.85, 0, 1),
        minDecibels: clamp(model.params.minDb ?? -90, -120, -10),
        maxDecibels: clamp(model.params.maxDb ?? -10, -120, 0)
      });
      const outGain = new GainNode(ctx, { gain: model.params.thru ?? 1 });

      inGain.connect(analyser);
      analyser.connect(outGain);

      const inst: ModuleInstance = {
        id: model.id,
        type: 'scope',
        inputs: { in: inGain },
        outputs: { out: outGain },
        viz: { analyser },
        setParam: (id, value) => {
          if (id === 'thru') smoothSet(outGain.gain, value >= 0.5 ? 1 : 0, ctx, 10);
          if (id === 'view') return;
          if (id === 'fftSize') analyser.fftSize = coerceFftSize(value);
          if (id === 'smoothing') analyser.smoothingTimeConstant = clamp(value, 0, 1);
          if (id === 'minDb') analyser.minDecibels = clamp(value, -120, -10);
          if (id === 'maxDb') analyser.maxDecibels = clamp(value, -120, 0);
        },
        dispose: () => {
          inGain.disconnect();
          analyser.disconnect();
          outGain.disconnect();
        }
      };

      return inst;
    }
  },

  vcmixer: {
    type: 'vcmixer',
    title: 'VC Mixer',
    inputs: [
      { id: 'in1', name: 'IN 1', dir: 'in', kind: 'audio' },
      { id: 'cv1', name: 'CV 1', dir: 'in', kind: 'cv' },
      { id: 'in2', name: 'IN 2', dir: 'in', kind: 'audio' },
      { id: 'cv2', name: 'CV 2', dir: 'in', kind: 'cv' },
      { id: 'in3', name: 'IN 3', dir: 'in', kind: 'audio' },
      { id: 'cv3', name: 'CV 3', dir: 'in', kind: 'cv' },
      { id: 'in4', name: 'IN 4', dir: 'in', kind: 'audio' },
      { id: 'cv4', name: 'CV 4', dir: 'in', kind: 'cv' }
    ],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [
      { id: 'level1', label: 'Level 1', min: 0, max: 2, step: 0.001, defaultValue: 1 },
      { id: 'depth1', label: 'CV Depth 1', min: 0, max: 2, step: 0.001, defaultValue: 0 },
      { id: 'level2', label: 'Level 2', min: 0, max: 2, step: 0.001, defaultValue: 1 },
      { id: 'depth2', label: 'CV Depth 2', min: 0, max: 2, step: 0.001, defaultValue: 0 },
      { id: 'level3', label: 'Level 3', min: 0, max: 2, step: 0.001, defaultValue: 1 },
      { id: 'depth3', label: 'CV Depth 3', min: 0, max: 2, step: 0.001, defaultValue: 0 },
      { id: 'level4', label: 'Level 4', min: 0, max: 2, step: 0.001, defaultValue: 1 },
      { id: 'depth4', label: 'CV Depth 4', min: 0, max: 2, step: 0.001, defaultValue: 0 },
      { id: 'master', label: 'Master', min: 0, max: 2, step: 0.001, defaultValue: 1 }
    ],
    create: (ctx, model) => {
      const master = new GainNode(ctx, { gain: model.params.master ?? 1 });

      const chGain = [
        new GainNode(ctx, { gain: 0 }),
        new GainNode(ctx, { gain: 0 }),
        new GainNode(ctx, { gain: 0 }),
        new GainNode(ctx, { gain: 0 })
      ];

      const base = [
        new ConstantSourceNode(ctx, { offset: model.params.level1 ?? 1 }),
        new ConstantSourceNode(ctx, { offset: model.params.level2 ?? 1 }),
        new ConstantSourceNode(ctx, { offset: model.params.level3 ?? 1 }),
        new ConstantSourceNode(ctx, { offset: model.params.level4 ?? 1 })
      ];

      const cvIn = [
        new GainNode(ctx, { gain: model.params.depth1 ?? 0 }),
        new GainNode(ctx, { gain: model.params.depth2 ?? 0 }),
        new GainNode(ctx, { gain: model.params.depth3 ?? 0 }),
        new GainNode(ctx, { gain: model.params.depth4 ?? 0 })
      ];

      for (let i = 0; i < 4; i += 1) {
        base[i].connect(chGain[i].gain);
        cvIn[i].connect(chGain[i].gain);
        base[i].start();

        chGain[i].connect(master);
      }

      const inst: ModuleInstance = {
        id: model.id,
        type: 'vcmixer',
        inputs: {
          in1: chGain[0],
          cv1: cvIn[0],
          in2: chGain[1],
          cv2: cvIn[1],
          in3: chGain[2],
          cv3: cvIn[2],
          in4: chGain[3],
          cv4: cvIn[3]
        },
        outputs: { out: master },
        setParam: (id, value) => {
          if (id === 'master') smoothSet(master.gain, clamp(value, 0, 4), ctx);
          if (id === 'level1') smoothSet(base[0].offset, clamp(value, 0, 4), ctx);
          if (id === 'depth1') smoothSet(cvIn[0].gain, clamp(value, 0, 4), ctx);
          if (id === 'level2') smoothSet(base[1].offset, clamp(value, 0, 4), ctx);
          if (id === 'depth2') smoothSet(cvIn[1].gain, clamp(value, 0, 4), ctx);
          if (id === 'level3') smoothSet(base[2].offset, clamp(value, 0, 4), ctx);
          if (id === 'depth3') smoothSet(cvIn[2].gain, clamp(value, 0, 4), ctx);
          if (id === 'level4') smoothSet(base[3].offset, clamp(value, 0, 4), ctx);
          if (id === 'depth4') smoothSet(cvIn[3].gain, clamp(value, 0, 4), ctx);
        },
        dispose: () => {
          for (let i = 0; i < 4; i += 1) {
            try {
              base[i].stop();
            } catch {
              // ignore
            }
            base[i].disconnect();
            cvIn[i].disconnect();
            chGain[i].disconnect();
          }
          master.disconnect();
        }
      };

      return inst;
    }
  },

  cvproc: {
    type: 'cvproc',
    title: 'CV Proc',
    inputs: [{ id: 'in', name: 'IN', dir: 'in', kind: 'cv' }],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'cv' }],
    params: [
      { id: 'scale', label: 'Scale', min: -4, max: 4, step: 0.001, defaultValue: 1 },
      { id: 'offset', label: 'Offset', min: -1, max: 1, step: 0.001, defaultValue: 0 }
    ],
    create: (ctx, model) => {
      const scale = new GainNode(ctx, { gain: model.params.scale ?? 1 });
      const sum = new GainNode(ctx, { gain: 1 });

      const offset = new ConstantSourceNode(ctx, { offset: model.params.offset ?? 0 });
      offset.start();

      scale.connect(sum);
      offset.connect(sum);

      const inst: ModuleInstance = {
        id: model.id,
        type: 'cvproc',
        inputs: { in: scale },
        outputs: { out: sum },
        setParam: (id, value) => {
          if (id === 'scale') smoothSet(scale.gain, clamp(value, -8, 8), ctx);
          if (id === 'offset') smoothSet(offset.offset, clamp(value, -10, 10), ctx, 12);
        },
        dispose: () => {
          try {
            offset.stop();
          } catch {
            // ignore
          }
          offset.disconnect();
          scale.disconnect();
          sum.disconnect();
        }
      };

      return inst;
    }
  },

  crossfader: {
    type: 'crossfader',
    title: 'Crossfader',
    inputs: [
      { id: 'a', name: 'A', dir: 'in', kind: 'audio' },
      { id: 'b', name: 'B', dir: 'in', kind: 'audio' },
      { id: 'cv', name: 'CV', dir: 'in', kind: 'cv' }
    ],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [
      { id: 'pos', label: 'Pos (0..1)', min: 0, max: 1, step: 0.001, defaultValue: 0.5 },
      { id: 'cvDepth', label: 'CV Depth', min: 0, max: 2, step: 0.001, defaultValue: 1 }
    ],
    create: (ctx, model) => {
      const inA = new GainNode(ctx, { gain: 1 });
      const inB = new GainNode(ctx, { gain: 1 });

      const gainA = new GainNode(ctx, { gain: 1 });
      const gainB = new GainNode(ctx, { gain: 0 });

      const pos = new ConstantSourceNode(ctx, { offset: model.params.pos ?? 0.5 });
      pos.start();

      const cvScale = new GainNode(ctx, { gain: model.params.cvDepth ?? 1 });
      const xSum = new GainNode(ctx, { gain: 1 });

      pos.connect(xSum);
      cvScale.connect(xSum);

      xSum.connect(gainB.gain);

      const one = new ConstantSourceNode(ctx, { offset: 1 });
      one.start();

      const inv = new GainNode(ctx, { gain: -1 });
      xSum.connect(inv);

      one.connect(gainA.gain);
      inv.connect(gainA.gain);

      inA.connect(gainA);
      inB.connect(gainB);

      const out = new GainNode(ctx, { gain: 1 });
      gainA.connect(out);
      gainB.connect(out);

      const inst: ModuleInstance = {
        id: model.id,
        type: 'crossfader',
        inputs: {
          a: inA,
          b: inB,
          cv: cvScale
        },
        outputs: { out },
        setParam: (id, value) => {
          if (id === 'pos') smoothSet(pos.offset, clamp(value, -4, 4), ctx, 12);
          if (id === 'cvDepth') smoothSet(cvScale.gain, clamp(value, 0, 8), ctx);
        },
        dispose: () => {
          try {
            pos.stop();
            one.stop();
          } catch {
            // ignore
          }
          pos.disconnect();
          one.disconnect();
          cvScale.disconnect();
          xSum.disconnect();
          inv.disconnect();
          inA.disconnect();
          inB.disconnect();
          gainA.disconnect();
          gainB.disconnect();
          out.disconnect();
        }
      };

      return inst;
    }
  },

  slew: {
    type: 'slew',
    title: 'Slew',
    inputs: [{ id: 'in', name: 'IN', dir: 'in', kind: 'cv' }],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'cv' }],
    params: [
      { id: 'rise', label: 'Rise (s)', min: 0, max: 5, step: 0.001, defaultValue: 0.05 },
      { id: 'fall', label: 'Fall (s)', min: 0, max: 5, step: 0.001, defaultValue: 0.05 }
    ],
    create: (ctx, model) => {
      const node = new AudioWorkletNode(ctx, 'slew-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1]
      });

      const rise = model.params.rise ?? 0.05;
      const fall = model.params.fall ?? 0.05;
      node.parameters.get('rise')!.value = rise;
      node.parameters.get('fall')!.value = fall;

      const inst: ModuleInstance = {
        id: model.id,
        type: 'slew',
        inputs: { in: node },
        outputs: { out: node },
        setParam: (id, value) => {
          const param = node.parameters.get(id);
          if (param) smoothSet(param, clamp(value, 0, 10), ctx, 20);
        },
        dispose: () => {
          node.disconnect();
        }
      };

      return inst;
    }
  },

  samplehold: {
    type: 'samplehold',
    title: 'S&H',
    inputs: [
      { id: 'in', name: 'IN', dir: 'in', kind: 'cv' },
      { id: 'clk', name: 'CLK', dir: 'in', kind: 'gate' }
    ],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'cv' }],
    params: [{ id: 'threshold', label: 'Thresh', min: -1, max: 1, step: 0.01, defaultValue: 0.5 }],
    create: (ctx, model) => {
      const node = new AudioWorkletNode(ctx, 'samplehold-processor', {
        numberOfInputs: 2,
        numberOfOutputs: 1,
        outputChannelCount: [1]
      });

      node.parameters.get('threshold')!.value = model.params.threshold ?? 0.5;

      const sigIn = new GainNode(ctx, { gain: 1 });
      const clkIn = new GainNode(ctx, { gain: 1 });

      sigIn.connect(node, 0, 0);
      clkIn.connect(node, 0, 1);

      const inst: ModuleInstance = {
        id: model.id,
        type: 'samplehold',
        inputs: {
          in: sigIn,
          clk: clkIn
        },
        outputs: { out: node },
        setParam: (id, value) => {
          const param = node.parameters.get(id);
          if (param) smoothSet(param, clamp(value, -1, 1), ctx, 20);
        },
        dispose: () => {
          sigIn.disconnect();
          clkIn.disconnect();
          node.disconnect();
        }
      };

      return inst;
    }
  },

  quantizer: {
    type: 'quantizer',
    title: 'Quantizer',
    inputs: [{ id: 'in', name: 'IN (Hz)', dir: 'in', kind: 'pitch' }],
    outputs: [{ id: 'out', name: 'OUT (Hz)', dir: 'out', kind: 'pitch' }],
    params: [
      { id: 'enabled', label: 'Enabled', min: 0, max: 1, step: 1, defaultValue: 1 },
      { id: 'root', label: 'Root (0=C..11=B)', min: 0, max: 11, step: 1, defaultValue: 0 },
      { id: 'scale', label: 'Scale (0=chr 1=maj 2=min 3=pent 4=blu)', min: 0, max: 4, step: 1, defaultValue: 0 },
      { id: 'transpose', label: 'Transpose (st)', min: -24, max: 24, step: 1, defaultValue: 0 }
    ],
    create: (ctx, model) => {
      const node = new AudioWorkletNode(ctx, 'quantizer-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1]
      });

      const enabled = model.params.enabled ?? 1;
      const root = model.params.root ?? 0;
      const scale = model.params.scale ?? 0;
      const transpose = model.params.transpose ?? 0;

      node.parameters.get('enabled')!.value = enabled;
      node.parameters.get('root')!.value = root;
      node.parameters.get('scale')!.value = scale;
      node.parameters.get('transpose')!.value = transpose;

      const inst: ModuleInstance = {
        id: model.id,
        type: 'quantizer',
        inputs: { in: node },
        outputs: { out: node },
        setParam: (id, value) => {
          if (id === 'enabled') setImmediate(node.parameters.get('enabled')!, value >= 0.5 ? 1 : 0, ctx);
          if (id === 'root') setImmediate(node.parameters.get('root')!, clamp(Math.round(value), 0, 11), ctx);
          if (id === 'scale') setImmediate(node.parameters.get('scale')!, clamp(Math.round(value), 0, 4), ctx);
          if (id === 'transpose') setImmediate(node.parameters.get('transpose')!, clamp(Math.round(value), -48, 48), ctx);
        },
        dispose: () => {
          node.disconnect();
        }
      };

      return inst;
    }
  },

  logic: {
    type: 'logic',
    title: 'Logic',
    inputs: [
      { id: 'a', name: 'A', dir: 'in', kind: 'gate' },
      { id: 'b', name: 'B', dir: 'in', kind: 'gate' }
    ],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'gate' }],
    params: [
      { id: 'mode', label: 'Mode (0..7)', min: 0, max: 7, step: 1, defaultValue: 0 },
      { id: 'threshold', label: 'Thresh', min: -1, max: 1, step: 0.01, defaultValue: 0.5 }
    ],
    create: (ctx, model) => {
      const node = new AudioWorkletNode(ctx, 'logic-processor', {
        numberOfInputs: 2,
        numberOfOutputs: 1,
        outputChannelCount: [1]
      });

      node.parameters.get('mode')!.value = model.params.mode ?? 0;
      node.parameters.get('threshold')!.value = model.params.threshold ?? 0.5;

      const aIn = new GainNode(ctx, { gain: 1 });
      const bIn = new GainNode(ctx, { gain: 1 });

      aIn.connect(node, 0, 0);
      bIn.connect(node, 0, 1);

      const inst: ModuleInstance = {
        id: model.id,
        type: 'logic',
        inputs: {
          a: aIn,
          b: bIn
        },
        outputs: { out: node },
        setParam: (id, value) => {
          if (id === 'mode') setImmediate(node.parameters.get('mode')!, clamp(Math.round(value), 0, 7), ctx);
          if (id === 'threshold') smoothSet(node.parameters.get('threshold')!, clamp(value, -1, 1), ctx, 20);
        },
        dispose: () => {
          aIn.disconnect();
          bIn.disconnect();
          node.disconnect();
        }
      };

      return inst;
    }
  },

  noise: {
    type: 'noise',
    title: 'Noise',
    inputs: [],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [
      { id: 'type', label: 'Type (0=white,1=pink)', min: 0, max: 1, step: 1, defaultValue: 0 },
      { id: 'level', label: 'Level', min: 0, max: 1, step: 0.001, defaultValue: 0.2 }
    ],
    create: (ctx, model) => {
      const node = new AudioWorkletNode(ctx, 'noise-processor', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [1]
      });

      node.parameters.get('type')!.value = model.params.type ?? 0;
      node.parameters.get('level')!.value = model.params.level ?? 0.2;

      const inst: ModuleInstance = {
        id: model.id,
        type: 'noise',
        inputs: {},
        outputs: { out: node },
        setParam: (id, value) => {
          if (id === 'type') setImmediate(node.parameters.get('type')!, value >= 0.5 ? 1 : 0, ctx);
          if (id === 'level') smoothSet(node.parameters.get('level')!, clamp(value, 0, 1), ctx, 12);
        },
        dispose: () => {
          node.disconnect();
        }
      };

      return inst;
    }
  },

  delay: {
    type: 'delay',
    title: 'Delay',
    inputs: [
      { id: 'in', name: 'IN', dir: 'in', kind: 'audio' },
      { id: 'timeCv', name: 'TIME CV', dir: 'in', kind: 'cv' },
      { id: 'fbCv', name: 'FB CV', dir: 'in', kind: 'cv' },
      { id: 'mixCv', name: 'MIX CV', dir: 'in', kind: 'cv' }
    ],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [
      { id: 'time', label: 'Time (s)', min: 0, max: 2, step: 0.001, defaultValue: 0.25 },
      { id: 'timeDepth', label: 'Time Depth (s)', min: 0, max: 2, step: 0.001, defaultValue: 0 },
      { id: 'feedback', label: 'Feedback', min: 0, max: 0.95, step: 0.001, defaultValue: 0.35 },
      { id: 'fbDepth', label: 'FB Depth', min: 0, max: 0.95, step: 0.001, defaultValue: 0 },
      { id: 'mix', label: 'Mix (0..1)', min: 0, max: 1, step: 0.001, defaultValue: 0.3 },
      { id: 'mixDepth', label: 'Mix Depth', min: 0, max: 1, step: 0.001, defaultValue: 0 }
    ],
    create: (ctx, model) => {
      const maxDelay = 2.0;

      const input = new GainNode(ctx, { gain: 1 });
      const out = new GainNode(ctx, { gain: 1 });

      const dly = new DelayNode(ctx, { maxDelayTime: maxDelay, delayTime: 0 });
      const fb = new GainNode(ctx, { gain: 0 });

      const timeBase = new ConstantSourceNode(ctx, { offset: model.params.time ?? 0.25 });
      const timeCv = new GainNode(ctx, { gain: model.params.timeDepth ?? 0 });
      timeBase.connect(dly.delayTime);
      timeCv.connect(dly.delayTime);
      timeBase.start();

      const fbBase = new ConstantSourceNode(ctx, { offset: model.params.feedback ?? 0.35 });
      const fbCv = new GainNode(ctx, { gain: model.params.fbDepth ?? 0 });
      fbBase.connect(fb.gain);
      fbCv.connect(fb.gain);
      fbBase.start();

      const mixPos = new ConstantSourceNode(ctx, { offset: model.params.mix ?? 0.3 });
      const mixCvIn = new GainNode(ctx, { gain: model.params.mixDepth ?? 0 });
      const mixSum = new GainNode(ctx, { gain: 1 });
      mixPos.connect(mixSum);
      mixCvIn.connect(mixSum);
      mixPos.start();

      const wet = new GainNode(ctx, { gain: 0 });
      const dry = new GainNode(ctx, { gain: 0 });

      mixSum.connect(wet.gain);

      const one = new ConstantSourceNode(ctx, { offset: 1 });
      const inv = new GainNode(ctx, { gain: -1 });
      mixSum.connect(inv);
      one.connect(dry.gain);
      inv.connect(dry.gain);
      one.start();

      input.connect(dry).connect(out);
      input.connect(dly);
      dly.connect(wet).connect(out);
      dly.connect(fb).connect(dly);

      const inst: ModuleInstance = {
        id: model.id,
        type: 'delay',
        inputs: {
          in: input,
          timeCv,
          fbCv,
          mixCv: mixCvIn
        },
        outputs: { out },
        setParam: (id, value) => {
          if (id === 'time') smoothSet(timeBase.offset, clamp(value, 0, maxDelay), ctx, 20);
          if (id === 'timeDepth') smoothSet(timeCv.gain, clamp(value, 0, maxDelay), ctx, 20);
          if (id === 'feedback') smoothSet(fbBase.offset, clamp(value, 0, 0.95), ctx, 20);
          if (id === 'fbDepth') smoothSet(fbCv.gain, clamp(value, 0, 0.95), ctx, 20);
          if (id === 'mix') smoothSet(mixPos.offset, clamp(value, -2, 2), ctx, 20);
          if (id === 'mixDepth') smoothSet(mixCvIn.gain, clamp(value, 0, 4), ctx, 20);
        },
        dispose: () => {
          try {
            timeBase.stop();
            fbBase.stop();
            mixPos.stop();
            one.stop();
          } catch {
            // ignore
          }

          input.disconnect();
          out.disconnect();
          dly.disconnect();
          fb.disconnect();
          timeBase.disconnect();
          timeCv.disconnect();
          fbBase.disconnect();
          fbCv.disconnect();
          mixPos.disconnect();
          mixCvIn.disconnect();
          mixSum.disconnect();
          wet.disconnect();
          dry.disconnect();
          one.disconnect();
          inv.disconnect();
        }
      };

      return inst;
    }
  },

  distortion: {
    type: 'distortion',
    title: 'Distortion',
    inputs: [
      { id: 'in', name: 'IN', dir: 'in', kind: 'audio' },
      { id: 'driveCv', name: 'DRIVE CV', dir: 'in', kind: 'cv' },
      { id: 'mixCv', name: 'MIX CV', dir: 'in', kind: 'cv' }
    ],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [
      { id: 'drive', label: 'Drive', min: 0, max: 1, step: 0.001, defaultValue: 0.4 },
      { id: 'driveDepth', label: 'Drive Depth', min: 0, max: 40, step: 0.01, defaultValue: 0 },
      { id: 'mix', label: 'Mix (0..1)', min: 0, max: 1, step: 0.001, defaultValue: 0.7 },
      { id: 'mixDepth', label: 'Mix Depth', min: 0, max: 1, step: 0.001, defaultValue: 0 },
      { id: 'post', label: 'Post', min: 0, max: 2, step: 0.001, defaultValue: 1 },
      { id: 'oversample', label: 'Over (0=none 1=2x 2=4x)', min: 0, max: 2, step: 1, defaultValue: 2 }
    ],
    create: (ctx, model) => {
      const input = new GainNode(ctx, { gain: 1 });
      const out = new GainNode(ctx, { gain: 1 });

      const pre = new GainNode(ctx, { gain: 1 });
      const driveBase = new ConstantSourceNode(ctx, { offset: 1 });
      const driveCv = new GainNode(ctx, { gain: model.params.driveDepth ?? 0 });

      driveBase.connect(pre.gain);
      driveCv.connect(pre.gain);
      driveBase.start();

      const shaper = new WaveShaperNode(ctx, { curve: makeDistCurve(1), oversample: '4x' });
      const post = new GainNode(ctx, { gain: model.params.post ?? 1 });

      const mixPos = new ConstantSourceNode(ctx, { offset: model.params.mix ?? 0.7 });
      const mixCvIn = new GainNode(ctx, { gain: model.params.mixDepth ?? 0 });
      const mixSum = new GainNode(ctx, { gain: 1 });
      mixPos.connect(mixSum);
      mixCvIn.connect(mixSum);
      mixPos.start();

      const wet = new GainNode(ctx, { gain: 0 });
      const dry = new GainNode(ctx, { gain: 0 });

      mixSum.connect(wet.gain);

      const one = new ConstantSourceNode(ctx, { offset: 1 });
      const inv = new GainNode(ctx, { gain: -1 });
      mixSum.connect(inv);
      one.connect(dry.gain);
      inv.connect(dry.gain);
      one.start();

      input.connect(dry).connect(out);

      input.connect(pre);
      pre.connect(shaper);
      shaper.connect(post);
      post.connect(wet).connect(out);

      const drive = model.params.drive ?? 0.4;
      const amount = 1 + drive * 40;
      shaper.curve = makeDistCurve(amount);
      driveBase.offset.value = amount;

      const over = Math.round(model.params.oversample ?? 2);
      shaper.oversample = over === 0 ? 'none' : over === 1 ? '2x' : '4x';

      const inst: ModuleInstance = {
        id: model.id,
        type: 'distortion',
        inputs: {
          in: input,
          driveCv,
          mixCv: mixCvIn
        },
        outputs: { out },
        setParam: (id, value) => {
          if (id === 'drive') {
            const d = clamp(value, 0, 1);
            const amt = 1 + d * 40;
            shaper.curve = makeDistCurve(amt);
            smoothSet(driveBase.offset, amt, ctx, 20);
          }
          if (id === 'driveDepth') smoothSet(driveCv.gain, clamp(value, 0, 80), ctx, 20);
          if (id === 'mix') smoothSet(mixPos.offset, clamp(value, -2, 2), ctx, 20);
          if (id === 'mixDepth') smoothSet(mixCvIn.gain, clamp(value, 0, 4), ctx, 20);
          if (id === 'post') smoothSet(post.gain, clamp(value, 0, 4), ctx, 20);
          if (id === 'oversample') {
            const o = clamp(Math.round(value), 0, 2);
            shaper.oversample = o === 0 ? 'none' : o === 1 ? '2x' : '4x';
          }
        },
        dispose: () => {
          try {
            driveBase.stop();
            mixPos.stop();
            one.stop();
          } catch {
            // ignore
          }

          input.disconnect();
          out.disconnect();
          pre.disconnect();
          shaper.disconnect();
          post.disconnect();
          driveBase.disconnect();
          driveCv.disconnect();
          mixPos.disconnect();
          mixCvIn.disconnect();
          mixSum.disconnect();
          wet.disconnect();
          dry.disconnect();
          one.disconnect();
          inv.disconnect();
        }
      };

      return inst;
    }
  },

  chorus: {
    type: 'chorus',
    title: 'Chorus',
    inputs: [
      { id: 'in', name: 'IN', dir: 'in', kind: 'audio' },
      { id: 'rateCv', name: 'RATE CV', dir: 'in', kind: 'cv' },
      { id: 'depthCv', name: 'DEPTH CV', dir: 'in', kind: 'cv' },
      { id: 'mixCv', name: 'MIX CV', dir: 'in', kind: 'cv' }
    ],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [
      { id: 'rate', label: 'Rate (Hz)', min: 0.01, max: 10, step: 0.01, defaultValue: 0.8 },
      { id: 'rateDepthHz', label: 'Rate CV Depth (Hz)', min: 0, max: 20, step: 0.01, defaultValue: 0 },
      { id: 'baseDelay', label: 'Base (s)', min: 0, max: 0.05, step: 0.0001, defaultValue: 0.02 },
      { id: 'depth', label: 'Depth (s)', min: 0, max: 0.02, step: 0.0001, defaultValue: 0.005 },
      { id: 'depthCvDepth', label: 'Depth CV Depth (s)', min: 0, max: 0.02, step: 0.0001, defaultValue: 0 },
      { id: 'feedback', label: 'Feedback', min: 0, max: 0.95, step: 0.001, defaultValue: 0 },
      { id: 'mix', label: 'Mix (0..1)', min: 0, max: 1, step: 0.001, defaultValue: 0.5 },
      { id: 'mixDepth', label: 'Mix CV Depth', min: 0, max: 1, step: 0.001, defaultValue: 0 }
    ],
    create: (ctx, model) => {
      const maxDelay = 0.05;
      const input = new GainNode(ctx, { gain: 1 });
      const out = new GainNode(ctx, { gain: 1 });
      const dry = new GainNode(ctx, { gain: 0 });
      const wet = new GainNode(ctx, { gain: 0 });

      const delay = new DelayNode(ctx, { maxDelayTime: maxDelay, delayTime: 0 });
      const fb = new GainNode(ctx, { gain: model.params.feedback ?? 0 });

      const baseDelay = new ConstantSourceNode(ctx, { offset: model.params.baseDelay ?? 0.02 });
      baseDelay.connect(delay.delayTime);
      baseDelay.start();

      const lfo = new OscillatorNode(ctx, { type: 'sine', frequency: model.params.rate ?? 0.8 });
      const lfoDepth = new GainNode(ctx, { gain: model.params.depth ?? 0.005 });
      lfo.connect(lfoDepth);
      lfoDepth.connect(delay.delayTime);
      lfo.start();

      const rateCvIn = new GainNode(ctx, { gain: model.params.rateDepthHz ?? 0 });
      rateCvIn.connect(lfo.frequency);

      const depthCvIn = new GainNode(ctx, { gain: model.params.depthCvDepth ?? 0 });
      depthCvIn.connect(lfoDepth.gain);

      const mixPos = new ConstantSourceNode(ctx, { offset: model.params.mix ?? 0.5 });
      const mixCvIn = new GainNode(ctx, { gain: model.params.mixDepth ?? 0 });
      const mixSum = new GainNode(ctx, { gain: 1 });
      mixPos.connect(mixSum);
      mixCvIn.connect(mixSum);
      mixPos.start();

      mixSum.connect(wet.gain);
      const one = new ConstantSourceNode(ctx, { offset: 1 });
      const inv = new GainNode(ctx, { gain: -1 });
      mixSum.connect(inv);
      one.connect(dry.gain);
      inv.connect(dry.gain);
      one.start();

      input.connect(dry).connect(out);
      input.connect(delay);
      delay.connect(wet).connect(out);
      delay.connect(fb).connect(delay);

      const inst: ModuleInstance = {
        id: model.id,
        type: 'chorus',
        inputs: {
          in: input,
          rateCv: rateCvIn,
          depthCv: depthCvIn,
          mixCv: mixCvIn
        },
        outputs: { out },
        setParam: (id, value) => {
          if (id === 'rate') smoothSet(lfo.frequency, clamp(value, 0.01, 40), ctx);
          if (id === 'rateDepthHz') smoothSet(rateCvIn.gain, clamp(value, 0, 80), ctx, 20);
          if (id === 'baseDelay') smoothSet(baseDelay.offset, clamp(value, 0, maxDelay), ctx, 20);
          if (id === 'depth') smoothSet(lfoDepth.gain, clamp(value, 0, maxDelay), ctx, 20);
          if (id === 'depthCvDepth') smoothSet(depthCvIn.gain, clamp(value, 0, maxDelay), ctx, 20);
          if (id === 'feedback') smoothSet(fb.gain, clamp(value, 0, 0.95), ctx, 20);
          if (id === 'mix') smoothSet(mixPos.offset, clamp(value, -2, 2), ctx, 20);
          if (id === 'mixDepth') smoothSet(mixCvIn.gain, clamp(value, 0, 4), ctx, 20);
        },
        dispose: () => {
          try {
            baseDelay.stop();
            mixPos.stop();
            one.stop();
            lfo.stop();
          } catch {
            // ignore
          }
          input.disconnect();
          out.disconnect();
          dry.disconnect();
          wet.disconnect();
          delay.disconnect();
          fb.disconnect();
          baseDelay.disconnect();
          lfo.disconnect();
          lfoDepth.disconnect();
          rateCvIn.disconnect();
          depthCvIn.disconnect();
          mixPos.disconnect();
          mixCvIn.disconnect();
          mixSum.disconnect();
          one.disconnect();
          inv.disconnect();
        }
      };

      return inst;
    }
  },

  phaser: {
    type: 'phaser',
    title: 'Phaser',
    inputs: [
      { id: 'in', name: 'IN', dir: 'in', kind: 'audio' },
      { id: 'freqCv', name: 'FREQ CV', dir: 'in', kind: 'cv' },
      { id: 'rateCv', name: 'RATE CV', dir: 'in', kind: 'cv' },
      { id: 'mixCv', name: 'MIX CV', dir: 'in', kind: 'cv' }
    ],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [
      { id: 'baseFreq', label: 'Base (Hz)', min: 20, max: 4000, step: 1, defaultValue: 700 },
      { id: 'depthHz', label: 'Depth (Hz)', min: 0, max: 4000, step: 1, defaultValue: 600 },
      { id: 'freqCvDepthHz', label: 'Freq CV Depth (Hz)', min: 0, max: 8000, step: 1, defaultValue: 0 },
      { id: 'rate', label: 'Rate (Hz)', min: 0.01, max: 10, step: 0.01, defaultValue: 0.4 },
      { id: 'rateDepthHz', label: 'Rate CV Depth (Hz)', min: 0, max: 20, step: 0.01, defaultValue: 0 },
      { id: 'feedback', label: 'Feedback', min: 0, max: 0.95, step: 0.001, defaultValue: 0.2 },
      { id: 'mix', label: 'Mix (0..1)', min: 0, max: 1, step: 0.001, defaultValue: 0.5 },
      { id: 'mixDepth', label: 'Mix CV Depth', min: 0, max: 1, step: 0.001, defaultValue: 0 }
    ],
    create: (ctx, model) => {
      const input = new GainNode(ctx, { gain: 1 });
      const out = new GainNode(ctx, { gain: 1 });
      const dry = new GainNode(ctx, { gain: 0 });
      const wet = new GainNode(ctx, { gain: 0 });
      const sum = new GainNode(ctx, { gain: 1 });

      const stages = [
        new BiquadFilterNode(ctx, { type: 'allpass', frequency: 0, Q: 0.7 }),
        new BiquadFilterNode(ctx, { type: 'allpass', frequency: 0, Q: 0.7 }),
        new BiquadFilterNode(ctx, { type: 'allpass', frequency: 0, Q: 0.7 }),
        new BiquadFilterNode(ctx, { type: 'allpass', frequency: 0, Q: 0.7 })
      ];

      const base = new ConstantSourceNode(ctx, { offset: model.params.baseFreq ?? 700 });
      base.start();
      for (const stage of stages) base.connect(stage.frequency);

      const lfo = new OscillatorNode(ctx, { type: 'sine', frequency: model.params.rate ?? 0.4 });
      const lfoDepth = new GainNode(ctx, { gain: model.params.depthHz ?? 600 });
      lfo.connect(lfoDepth);
      for (const stage of stages) lfoDepth.connect(stage.frequency);
      lfo.start();

      const freqCvIn = new GainNode(ctx, { gain: model.params.freqCvDepthHz ?? 0 });
      for (const stage of stages) freqCvIn.connect(stage.frequency);

      const rateCvIn = new GainNode(ctx, { gain: model.params.rateDepthHz ?? 0 });
      rateCvIn.connect(lfo.frequency);

      const fb = new GainNode(ctx, { gain: model.params.feedback ?? 0.2 });

      const mixPos = new ConstantSourceNode(ctx, { offset: model.params.mix ?? 0.5 });
      const mixCvIn = new GainNode(ctx, { gain: model.params.mixDepth ?? 0 });
      const mixSum = new GainNode(ctx, { gain: 1 });
      mixPos.connect(mixSum);
      mixCvIn.connect(mixSum);
      mixPos.start();

      mixSum.connect(wet.gain);
      const one = new ConstantSourceNode(ctx, { offset: 1 });
      const inv = new GainNode(ctx, { gain: -1 });
      mixSum.connect(inv);
      one.connect(dry.gain);
      inv.connect(dry.gain);
      one.start();

      input.connect(dry).connect(out);
      input.connect(sum);
      fb.connect(sum);

      sum.connect(stages[0]);
      stages[0].connect(stages[1]);
      stages[1].connect(stages[2]);
      stages[2].connect(stages[3]);

      stages[3].connect(wet).connect(out);
      stages[3].connect(fb);

      const inst: ModuleInstance = {
        id: model.id,
        type: 'phaser',
        inputs: {
          in: input,
          freqCv: freqCvIn,
          rateCv: rateCvIn,
          mixCv: mixCvIn
        },
        outputs: { out },
        setParam: (id, value) => {
          if (id === 'baseFreq') smoothSet(base.offset, clamp(value, 20, 20000), ctx, 20);
          if (id === 'depthHz') smoothSet(lfoDepth.gain, clamp(value, 0, 20000), ctx, 20);
          if (id === 'freqCvDepthHz') smoothSet(freqCvIn.gain, clamp(value, 0, 20000), ctx, 20);
          if (id === 'rate') smoothSet(lfo.frequency, clamp(value, 0.01, 40), ctx);
          if (id === 'rateDepthHz') smoothSet(rateCvIn.gain, clamp(value, 0, 80), ctx, 20);
          if (id === 'feedback') smoothSet(fb.gain, clamp(value, 0, 0.95), ctx, 20);
          if (id === 'mix') smoothSet(mixPos.offset, clamp(value, -2, 2), ctx, 20);
          if (id === 'mixDepth') smoothSet(mixCvIn.gain, clamp(value, 0, 4), ctx, 20);
        },
        dispose: () => {
          try {
            base.stop();
            mixPos.stop();
            one.stop();
            lfo.stop();
          } catch {
            // ignore
          }
          input.disconnect();
          out.disconnect();
          dry.disconnect();
          wet.disconnect();
          sum.disconnect();
          fb.disconnect();
          for (const stage of stages) stage.disconnect();
          base.disconnect();
          lfo.disconnect();
          lfoDepth.disconnect();
          freqCvIn.disconnect();
          rateCvIn.disconnect();
          mixPos.disconnect();
          mixCvIn.disconnect();
          mixSum.disconnect();
          one.disconnect();
          inv.disconnect();
        }
      };

      return inst;
    }
  },

  reverb: {
    type: 'reverb',
    title: 'Reverb',
    inputs: [
      { id: 'in', name: 'IN', dir: 'in', kind: 'audio' },
      { id: 'mixCv', name: 'MIX CV', dir: 'in', kind: 'cv' }
    ],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [
      { id: 'preDelay', label: 'PreDelay (s)', min: 0, max: 0.2, step: 0.001, defaultValue: 0.01 },
      { id: 'decay', label: 'Decay (s)', min: 0.05, max: 6, step: 0.05, defaultValue: 1.8 },
      { id: 'dampHz', label: 'Damp (Hz)', min: 200, max: 20000, step: 1, defaultValue: 8000 },
      { id: 'mix', label: 'Mix (0..1)', min: 0, max: 1, step: 0.001, defaultValue: 0.35 },
      { id: 'mixDepth', label: 'Mix CV Depth', min: 0, max: 1, step: 0.001, defaultValue: 0 }
    ],
    create: (ctx, model) => {
      const makeImpulse = (seconds: number) => {
        const dur = clamp(seconds, 0.05, 6);
        const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
        const buf = new AudioBuffer({ length, numberOfChannels: 1, sampleRate: ctx.sampleRate });
        const ch = buf.getChannelData(0);

        for (let i = 0; i < length; i += 1) {
          const t = i / (length - 1);
          const env = Math.pow(1 - t, 3);
          ch[i] = (Math.random() * 2 - 1) * env;
        }
        return buf;
      };

      const input = new GainNode(ctx, { gain: 1 });
      const out = new GainNode(ctx, { gain: 1 });
      const dry = new GainNode(ctx, { gain: 0 });
      const wet = new GainNode(ctx, { gain: 0 });

      const pre = new DelayNode(ctx, { maxDelayTime: 0.2, delayTime: model.params.preDelay ?? 0.01 });
      const conv = new ConvolverNode(ctx, { buffer: makeImpulse(model.params.decay ?? 1.8) });
      const damp = new BiquadFilterNode(ctx, {
        type: 'lowpass',
        frequency: model.params.dampHz ?? 8000,
        Q: 0.707
      });

      const mixPos = new ConstantSourceNode(ctx, { offset: model.params.mix ?? 0.35 });
      const mixCvIn = new GainNode(ctx, { gain: model.params.mixDepth ?? 0 });
      const mixSum = new GainNode(ctx, { gain: 1 });
      mixPos.connect(mixSum);
      mixCvIn.connect(mixSum);
      mixPos.start();

      mixSum.connect(wet.gain);
      const one = new ConstantSourceNode(ctx, { offset: 1 });
      const inv = new GainNode(ctx, { gain: -1 });
      mixSum.connect(inv);
      one.connect(dry.gain);
      inv.connect(dry.gain);
      one.start();

      input.connect(dry).connect(out);
      input.connect(pre);
      pre.connect(conv);
      conv.connect(damp);
      damp.connect(wet).connect(out);

      const inst: ModuleInstance = {
        id: model.id,
        type: 'reverb',
        inputs: {
          in: input,
          mixCv: mixCvIn
        },
        outputs: { out },
        setParam: (id, value) => {
          if (id === 'preDelay') smoothSet(pre.delayTime, clamp(value, 0, 0.2), ctx, 20);
          if (id === 'decay') {
            const d = clamp(value, 0.05, 6);
            conv.buffer = makeImpulse(d);
          }
          if (id === 'dampHz') smoothSet(damp.frequency, clamp(value, 20, 20000), ctx, 30);
          if (id === 'mix') smoothSet(mixPos.offset, clamp(value, -2, 2), ctx, 20);
          if (id === 'mixDepth') smoothSet(mixCvIn.gain, clamp(value, 0, 4), ctx, 20);
        },
        dispose: () => {
          try {
            mixPos.stop();
            one.stop();
          } catch {
            // ignore
          }
          input.disconnect();
          out.disconnect();
          dry.disconnect();
          wet.disconnect();
          pre.disconnect();
          conv.disconnect();
          damp.disconnect();
          mixPos.disconnect();
          mixCvIn.disconnect();
          mixSum.disconnect();
          one.disconnect();
          inv.disconnect();
        }
      };

      return inst;
    }
  },

  bitcrusher: {
    type: 'bitcrusher',
    title: 'Bitcrusher',
    inputs: [
      { id: 'in', name: 'IN', dir: 'in', kind: 'audio' },
      { id: 'mixCv', name: 'MIX CV', dir: 'in', kind: 'cv' }
    ],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [
      { id: 'bitDepth', label: 'Bits', min: 1, max: 16, step: 1, defaultValue: 8 },
      { id: 'downsample', label: 'Downsample', min: 1, max: 64, step: 1, defaultValue: 4 },
      { id: 'mix', label: 'Mix (0..1)', min: 0, max: 1, step: 0.001, defaultValue: 0.7 },
      { id: 'mixDepth', label: 'Mix CV Depth', min: 0, max: 1, step: 0.001, defaultValue: 0 }
    ],
    create: (ctx, model) => {
      const input = new GainNode(ctx, { gain: 1 });
      const out = new GainNode(ctx, { gain: 1 });
      const dry = new GainNode(ctx, { gain: 0 });
      const wet = new GainNode(ctx, { gain: 0 });

      const node = new AudioWorkletNode(ctx, 'bitcrusher-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1]
      });

      node.parameters.get('bitDepth')!.value = model.params.bitDepth ?? 8;
      node.parameters.get('downsample')!.value = model.params.downsample ?? 4;

      const mixPos = new ConstantSourceNode(ctx, { offset: model.params.mix ?? 0.7 });
      const mixCvIn = new GainNode(ctx, { gain: model.params.mixDepth ?? 0 });
      const mixSum = new GainNode(ctx, { gain: 1 });
      mixPos.connect(mixSum);
      mixCvIn.connect(mixSum);
      mixPos.start();

      mixSum.connect(wet.gain);
      const one = new ConstantSourceNode(ctx, { offset: 1 });
      const inv = new GainNode(ctx, { gain: -1 });
      mixSum.connect(inv);
      one.connect(dry.gain);
      inv.connect(dry.gain);
      one.start();

      input.connect(dry).connect(out);
      input.connect(node);
      node.connect(wet).connect(out);

      const inst: ModuleInstance = {
        id: model.id,
        type: 'bitcrusher',
        inputs: {
          in: input,
          mixCv: mixCvIn
        },
        outputs: { out },
        setParam: (id, value) => {
          if (id === 'bitDepth') {
            const v = clamp(Math.round(value), 1, 16);
            node.parameters.get('bitDepth')!.value = v;
          }
          if (id === 'downsample') {
            const v = clamp(Math.round(value), 1, 64);
            node.parameters.get('downsample')!.value = v;
          }
          if (id === 'mix') smoothSet(mixPos.offset, clamp(value, -2, 2), ctx, 20);
          if (id === 'mixDepth') smoothSet(mixCvIn.gain, clamp(value, 0, 4), ctx, 20);
        },
        dispose: () => {
          try {
            mixPos.stop();
            one.stop();
          } catch {
            // ignore
          }
          input.disconnect();
          out.disconnect();
          dry.disconnect();
          wet.disconnect();
          node.disconnect();
          mixPos.disconnect();
          mixCvIn.disconnect();
          mixSum.disconnect();
          one.disconnect();
          inv.disconnect();
        }
      };

      return inst;
    }
  },

  compressor: {
    type: 'compressor',
    title: 'Compressor',
    inputs: [
      { id: 'in', name: 'IN', dir: 'in', kind: 'audio' },
      { id: 'mixCv', name: 'MIX CV', dir: 'in', kind: 'cv' }
    ],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [
      { id: 'threshold', label: 'Threshold (dB)', min: -100, max: 0, step: 1, defaultValue: -18 },
      { id: 'knee', label: 'Knee (dB)', min: 0, max: 40, step: 1, defaultValue: 12 },
      { id: 'ratio', label: 'Ratio', min: 1, max: 20, step: 0.1, defaultValue: 6 },
      { id: 'attack', label: 'Attack (s)', min: 0, max: 1, step: 0.001, defaultValue: 0.003 },
      { id: 'release', label: 'Release (s)', min: 0, max: 1, step: 0.001, defaultValue: 0.15 },
      { id: 'makeup', label: 'Makeup', min: 0, max: 4, step: 0.001, defaultValue: 1 },
      { id: 'mix', label: 'Mix (0..1)', min: 0, max: 1, step: 0.001, defaultValue: 1 },
      { id: 'mixDepth', label: 'Mix CV Depth', min: 0, max: 1, step: 0.001, defaultValue: 0 }
    ],
    create: (ctx, model) => {
      const input = new GainNode(ctx, { gain: 1 });
      const out = new GainNode(ctx, { gain: 1 });
      const dry = new GainNode(ctx, { gain: 0 });
      const wet = new GainNode(ctx, { gain: 0 });

      const comp = new DynamicsCompressorNode(ctx, {
        threshold: model.params.threshold ?? -18,
        knee: model.params.knee ?? 12,
        ratio: model.params.ratio ?? 6,
        attack: model.params.attack ?? 0.003,
        release: model.params.release ?? 0.15
      });

      const makeup = new GainNode(ctx, { gain: model.params.makeup ?? 1 });

      const mixPos = new ConstantSourceNode(ctx, { offset: model.params.mix ?? 1 });
      const mixCvIn = new GainNode(ctx, { gain: model.params.mixDepth ?? 0 });
      const mixSum = new GainNode(ctx, { gain: 1 });
      mixPos.connect(mixSum);
      mixCvIn.connect(mixSum);
      mixPos.start();

      mixSum.connect(wet.gain);
      const one = new ConstantSourceNode(ctx, { offset: 1 });
      const inv = new GainNode(ctx, { gain: -1 });
      mixSum.connect(inv);
      one.connect(dry.gain);
      inv.connect(dry.gain);
      one.start();

      input.connect(dry).connect(out);
      input.connect(comp);
      comp.connect(makeup);
      makeup.connect(wet).connect(out);

      const inst: ModuleInstance = {
        id: model.id,
        type: 'compressor',
        inputs: {
          in: input,
          mixCv: mixCvIn
        },
        outputs: { out },
        setParam: (id, value) => {
          if (id === 'threshold') smoothSet(comp.threshold, clamp(value, -100, 0), ctx, 30);
          if (id === 'knee') smoothSet(comp.knee, clamp(value, 0, 40), ctx, 30);
          if (id === 'ratio') smoothSet(comp.ratio, clamp(value, 1, 20), ctx, 30);
          if (id === 'attack') smoothSet(comp.attack, clamp(value, 0, 1), ctx, 30);
          if (id === 'release') smoothSet(comp.release, clamp(value, 0, 1), ctx, 30);
          if (id === 'makeup') smoothSet(makeup.gain, clamp(value, 0, 10), ctx, 20);
          if (id === 'mix') smoothSet(mixPos.offset, clamp(value, -2, 2), ctx, 20);
          if (id === 'mixDepth') smoothSet(mixCvIn.gain, clamp(value, 0, 4), ctx, 20);
        },
        dispose: () => {
          try {
            mixPos.stop();
            one.stop();
          } catch {
            // ignore
          }
          input.disconnect();
          out.disconnect();
          dry.disconnect();
          wet.disconnect();
          comp.disconnect();
          makeup.disconnect();
          mixPos.disconnect();
          mixCvIn.disconnect();
          mixSum.disconnect();
          one.disconnect();
          inv.disconnect();
        }
      };

      return inst;
    }
  },

  flanger: {
    type: 'flanger',
    title: 'Flanger',
    inputs: [
      { id: 'in', name: 'IN', dir: 'in', kind: 'audio' },
      { id: 'rateCv', name: 'RATE CV', dir: 'in', kind: 'cv' },
      { id: 'depthCv', name: 'DEPTH CV', dir: 'in', kind: 'cv' },
      { id: 'mixCv', name: 'MIX CV', dir: 'in', kind: 'cv' }
    ],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [
      { id: 'rate', label: 'Rate (Hz)', min: 0.01, max: 5, step: 0.01, defaultValue: 0.25 },
      { id: 'rateDepthHz', label: 'Rate CV Depth (Hz)', min: 0, max: 10, step: 0.01, defaultValue: 0 },
      { id: 'baseDelay', label: 'Base (s)', min: 0, max: 0.01, step: 0.00001, defaultValue: 0.003 },
      { id: 'depth', label: 'Depth (s)', min: 0, max: 0.01, step: 0.00001, defaultValue: 0.002 },
      { id: 'depthCvDepth', label: 'Depth CV Depth (s)', min: 0, max: 0.01, step: 0.00001, defaultValue: 0 },
      { id: 'feedback', label: 'Feedback', min: 0, max: 0.95, step: 0.001, defaultValue: 0.3 },
      { id: 'mix', label: 'Mix (0..1)', min: 0, max: 1, step: 0.001, defaultValue: 0.5 },
      { id: 'mixDepth', label: 'Mix CV Depth', min: 0, max: 1, step: 0.001, defaultValue: 0 }
    ],
    create: (ctx, model) => {
      const maxDelay = 0.01;
      const input = new GainNode(ctx, { gain: 1 });
      const out = new GainNode(ctx, { gain: 1 });
      const delay = new DelayNode(ctx, { maxDelayTime: maxDelay, delayTime: 0 });
      const fb = new GainNode(ctx, { gain: model.params.feedback ?? 0.3 });

      const baseDelay = new ConstantSourceNode(ctx, { offset: model.params.baseDelay ?? 0.003 });
      baseDelay.connect(delay.delayTime);
      baseDelay.start();

      const lfo = new OscillatorNode(ctx, { type: 'sine', frequency: model.params.rate ?? 0.25 });
      const lfoDepth = new GainNode(ctx, { gain: model.params.depth ?? 0.002 });
      lfo.connect(lfoDepth);
      lfoDepth.connect(delay.delayTime);
      lfo.start();

      const rateCvIn = new GainNode(ctx, { gain: model.params.rateDepthHz ?? 0 });
      rateCvIn.connect(lfo.frequency);

      const depthCvIn = new GainNode(ctx, { gain: model.params.depthCvDepth ?? 0 });
      depthCvIn.connect(lfoDepth.gain);

      const mix = makeMix(ctx, model.params.mix ?? 0.5, model.params.mixDepth ?? 0);

      input.connect(mix.dry).connect(out);
      input.connect(delay);
      delay.connect(mix.wet).connect(out);
      delay.connect(fb).connect(delay);

      const inst: ModuleInstance = {
        id: model.id,
        type: 'flanger',
        inputs: {
          in: input,
          rateCv: rateCvIn,
          depthCv: depthCvIn,
          mixCv: mix.mixCvIn
        },
        outputs: { out },
        setParam: (id, value) => {
          if (id === 'rate') smoothSet(lfo.frequency, clamp(value, 0.01, 20), ctx);
          if (id === 'rateDepthHz') smoothSet(rateCvIn.gain, clamp(value, 0, 80), ctx, 20);
          if (id === 'baseDelay') smoothSet(baseDelay.offset, clamp(value, 0, maxDelay), ctx, 20);
          if (id === 'depth') smoothSet(lfoDepth.gain, clamp(value, 0, maxDelay), ctx, 20);
          if (id === 'depthCvDepth') smoothSet(depthCvIn.gain, clamp(value, 0, maxDelay), ctx, 20);
          if (id === 'feedback') smoothSet(fb.gain, clamp(value, 0, 0.95), ctx, 20);
          if (id === 'mix') mix.setMix(value);
          if (id === 'mixDepth') mix.setDepth(value);
        },
        dispose: () => {
          try {
            baseDelay.stop();
            lfo.stop();
          } catch {
            // ignore
          }
          input.disconnect();
          out.disconnect();
          delay.disconnect();
          fb.disconnect();
          baseDelay.disconnect();
          lfo.disconnect();
          lfoDepth.disconnect();
          rateCvIn.disconnect();
          depthCvIn.disconnect();
          mix.dispose();
        }
      };

      return inst;
    }
  },

  stereochorus: {
    type: 'stereochorus',
    title: 'Stereo Chorus',
    inputs: [
      { id: 'in', name: 'IN', dir: 'in', kind: 'audio' },
      { id: 'rateCv', name: 'RATE CV', dir: 'in', kind: 'cv' },
      { id: 'depthCv', name: 'DEPTH CV', dir: 'in', kind: 'cv' },
      { id: 'mixCv', name: 'MIX CV', dir: 'in', kind: 'cv' }
    ],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [
      { id: 'rate', label: 'Rate (Hz)', min: 0.01, max: 5, step: 0.01, defaultValue: 0.8 },
      { id: 'rateDepthHz', label: 'Rate CV Depth (Hz)', min: 0, max: 10, step: 0.01, defaultValue: 0 },
      { id: 'baseDelay', label: 'Base (s)', min: 0, max: 0.05, step: 0.0001, defaultValue: 0.02 },
      { id: 'depth', label: 'Depth (s)', min: 0, max: 0.02, step: 0.0001, defaultValue: 0.006 },
      { id: 'depthCvDepth', label: 'Depth CV Depth (s)', min: 0, max: 0.02, step: 0.0001, defaultValue: 0 },
      { id: 'width', label: 'Width', min: 0, max: 1, step: 0.001, defaultValue: 1 },
      { id: 'mix', label: 'Mix (0..1)', min: 0, max: 1, step: 0.001, defaultValue: 0.5 },
      { id: 'mixDepth', label: 'Mix CV Depth', min: 0, max: 1, step: 0.001, defaultValue: 0 }
    ],
    create: (ctx, model) => {
      const maxDelay = 0.05;
      const input = new GainNode(ctx, { gain: 1 });
      const out = new GainNode(ctx, { gain: 1 });
      const dL = new DelayNode(ctx, { maxDelayTime: maxDelay, delayTime: 0 });
      const dR = new DelayNode(ctx, { maxDelayTime: maxDelay, delayTime: 0 });

      const baseDelay = new ConstantSourceNode(ctx, { offset: model.params.baseDelay ?? 0.02 });
      baseDelay.connect(dL.delayTime);
      baseDelay.connect(dR.delayTime);
      baseDelay.start();

      const rate = model.params.rate ?? 0.8;
      const lfoL = new OscillatorNode(ctx, { type: 'sine', frequency: rate });
      const lfoR = new OscillatorNode(ctx, { type: 'sine', frequency: rate });
      const modDelay = new DelayNode(ctx, { maxDelayTime: 0.5, delayTime: 0.25 / rate });

      const depth = new GainNode(ctx, { gain: model.params.depth ?? 0.006 });
      lfoL.connect(depth);
      depth.connect(dL.delayTime);

      lfoR.connect(modDelay);
      modDelay.connect(depth);
      depth.connect(dR.delayTime);

      lfoL.start();
      lfoR.start();

      const rateCvIn = new GainNode(ctx, { gain: model.params.rateDepthHz ?? 0 });
      rateCvIn.connect(lfoL.frequency);
      rateCvIn.connect(lfoR.frequency);

      const depthCvIn = new GainNode(ctx, { gain: model.params.depthCvDepth ?? 0 });
      depthCvIn.connect(depth.gain);

      const width = new GainNode(ctx, { gain: model.params.width ?? 1 });
      const pL = new StereoPannerNode(ctx, { pan: -1 });
      const pR = new StereoPannerNode(ctx, { pan: 1 });

      const mix = makeMix(ctx, model.params.mix ?? 0.5, model.params.mixDepth ?? 0);

      input.connect(mix.dry).connect(out);
      input.connect(dL);
      input.connect(dR);

      dL.connect(width).connect(pL).connect(mix.wet);
      dR.connect(width).connect(pR).connect(mix.wet);
      mix.wet.connect(out);

      const inst: ModuleInstance = {
        id: model.id,
        type: 'stereochorus',
        inputs: {
          in: input,
          rateCv: rateCvIn,
          depthCv: depthCvIn,
          mixCv: mix.mixCvIn
        },
        outputs: { out },
        setParam: (id, value) => {
          if (id === 'rate') {
            const nextRate = clamp(value, 0.01, 20);
            smoothSet(lfoL.frequency, nextRate, ctx);
            smoothSet(lfoR.frequency, nextRate, ctx);
            smoothSet(modDelay.delayTime, 0.25 / nextRate, ctx, 30);
          }
          if (id === 'rateDepthHz') smoothSet(rateCvIn.gain, clamp(value, 0, 80), ctx, 20);
          if (id === 'baseDelay') smoothSet(baseDelay.offset, clamp(value, 0, maxDelay), ctx, 20);
          if (id === 'depth') smoothSet(depth.gain, clamp(value, 0, maxDelay), ctx, 20);
          if (id === 'depthCvDepth') smoothSet(depthCvIn.gain, clamp(value, 0, maxDelay), ctx, 20);
          if (id === 'width') smoothSet(width.gain, clamp(value, 0, 2), ctx, 20);
          if (id === 'mix') mix.setMix(value);
          if (id === 'mixDepth') mix.setDepth(value);
        },
        dispose: () => {
          try {
            baseDelay.stop();
            lfoL.stop();
            lfoR.stop();
          } catch {
            // ignore
          }
          input.disconnect();
          out.disconnect();
          dL.disconnect();
          dR.disconnect();
          baseDelay.disconnect();
          lfoL.disconnect();
          lfoR.disconnect();
          modDelay.disconnect();
          depth.disconnect();
          rateCvIn.disconnect();
          depthCvIn.disconnect();
          width.disconnect();
          pL.disconnect();
          pR.disconnect();
          mix.dispose();
        }
      };

      return inst;
    }
  },

  eq3: {
    type: 'eq3',
    title: 'EQ 3',
    inputs: [{ id: 'in', name: 'IN', dir: 'in', kind: 'audio' }],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [
      { id: 'lowGain', label: 'Low Gain (dB)', min: -24, max: 24, step: 0.1, defaultValue: 0 },
      { id: 'lowFreq', label: 'Low Freq (Hz)', min: 20, max: 800, step: 1, defaultValue: 150 },
      { id: 'midGain', label: 'Mid Gain (dB)', min: -24, max: 24, step: 0.1, defaultValue: 0 },
      { id: 'midFreq', label: 'Mid Freq (Hz)', min: 100, max: 8000, step: 1, defaultValue: 1000 },
      { id: 'midQ', label: 'Mid Q', min: 0.1, max: 18, step: 0.01, defaultValue: 1 },
      { id: 'highGain', label: 'High Gain (dB)', min: -24, max: 24, step: 0.1, defaultValue: 0 },
      { id: 'highFreq', label: 'High Freq (Hz)', min: 1000, max: 20000, step: 1, defaultValue: 6000 }
    ],
    create: (ctx, model) => {
      const low = new BiquadFilterNode(ctx, {
        type: 'lowshelf',
        frequency: model.params.lowFreq ?? 150,
        gain: model.params.lowGain ?? 0
      });
      const mid = new BiquadFilterNode(ctx, {
        type: 'peaking',
        frequency: model.params.midFreq ?? 1000,
        Q: model.params.midQ ?? 1,
        gain: model.params.midGain ?? 0
      });
      const high = new BiquadFilterNode(ctx, {
        type: 'highshelf',
        frequency: model.params.highFreq ?? 6000,
        gain: model.params.highGain ?? 0
      });

      low.connect(mid);
      mid.connect(high);

      const inst: ModuleInstance = {
        id: model.id,
        type: 'eq3',
        inputs: { in: low },
        outputs: { out: high },
        setParam: (id, value) => {
          if (id === 'lowGain') smoothSet(low.gain, clamp(value, -60, 60), ctx, 30);
          if (id === 'lowFreq') smoothSet(low.frequency, clamp(value, 20, 20000), ctx, 30);
          if (id === 'midGain') smoothSet(mid.gain, clamp(value, -60, 60), ctx, 30);
          if (id === 'midFreq') smoothSet(mid.frequency, clamp(value, 20, 20000), ctx, 30);
          if (id === 'midQ') smoothSet(mid.Q, clamp(value, 0.1, 40), ctx, 30);
          if (id === 'highGain') smoothSet(high.gain, clamp(value, -60, 60), ctx, 30);
          if (id === 'highFreq') smoothSet(high.frequency, clamp(value, 20, 20000), ctx, 30);
        },
        dispose: () => {
          low.disconnect();
          mid.disconnect();
          high.disconnect();
        }
      };

      return inst;
    }
  },

  wavefolder: {
    type: 'wavefolder',
    title: 'Wavefolder',
    inputs: [
      { id: 'in', name: 'IN', dir: 'in', kind: 'audio' },
      { id: 'mixCv', name: 'MIX CV', dir: 'in', kind: 'cv' }
    ],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [
      { id: 'drive', label: 'Drive', min: 0, max: 10, step: 0.001, defaultValue: 1.5 },
      { id: 'folds', label: 'Folds', min: 0, max: 10, step: 0.001, defaultValue: 1.5 },
      { id: 'dcBlock', label: 'DC Block', min: 0, max: 1, step: 1, defaultValue: 1 },
      { id: 'mix', label: 'Mix (0..1)', min: 0, max: 1, step: 0.001, defaultValue: 1 },
      { id: 'mixDepth', label: 'Mix CV Depth', min: 0, max: 1, step: 0.001, defaultValue: 0 }
    ],
    create: (ctx, model) => {
      const input = new GainNode(ctx, { gain: 1 });
      const out = new GainNode(ctx, { gain: 1 });
      const node = new AudioWorkletNode(ctx, 'wavefolder-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1]
      });

      node.parameters.get('drive')!.value = model.params.drive ?? 1.5;
      node.parameters.get('folds')!.value = model.params.folds ?? 1.5;
      node.parameters.get('dcBlock')!.value = (model.params.dcBlock ?? 1) >= 0.5 ? 1 : 0;

      const mix = makeMix(ctx, model.params.mix ?? 1, model.params.mixDepth ?? 0);

      input.connect(mix.dry).connect(out);
      input.connect(node);
      node.connect(mix.wet).connect(out);

      const inst: ModuleInstance = {
        id: model.id,
        type: 'wavefolder',
        inputs: {
          in: input,
          mixCv: mix.mixCvIn
        },
        outputs: { out },
        setParam: (id, value) => {
          if (id === 'drive') smoothSet(node.parameters.get('drive')!, clamp(value, 0, 10), ctx, 20);
          if (id === 'folds') smoothSet(node.parameters.get('folds')!, clamp(value, 0, 10), ctx, 20);
          if (id === 'dcBlock') node.parameters.get('dcBlock')!.value = value >= 0.5 ? 1 : 0;
          if (id === 'mix') mix.setMix(value);
          if (id === 'mixDepth') mix.setDepth(value);
        },
        dispose: () => {
          input.disconnect();
          out.disconnect();
          node.disconnect();
          mix.dispose();
        }
      };

      return inst;
    }
  },

  irverb: {
    type: 'irverb',
    title: 'IR Verb',
    inputs: [
      { id: 'in', name: 'IN', dir: 'in', kind: 'audio' },
      { id: 'mixCv', name: 'MIX CV', dir: 'in', kind: 'cv' }
    ],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'audio' }],
    params: [
      { id: 'preset', label: 'Preset (0..3)', min: 0, max: 3, step: 1, defaultValue: 1 },
      { id: 'decay', label: 'Decay (s)', min: 0.05, max: 8, step: 0.05, defaultValue: 2.2 },
      { id: 'preDelay', label: 'PreDelay (s)', min: 0, max: 0.2, step: 0.001, defaultValue: 0.01 },
      { id: 'dampHz', label: 'Damp (Hz)', min: 200, max: 20000, step: 1, defaultValue: 8000 },
      { id: 'mix', label: 'Mix (0..1)', min: 0, max: 1, step: 0.001, defaultValue: 0.35 },
      { id: 'mixDepth', label: 'Mix CV Depth', min: 0, max: 1, step: 0.001, defaultValue: 0 }
    ],
    create: (ctx, model) => {
      const input = new GainNode(ctx, { gain: 1 });
      const out = new GainNode(ctx, { gain: 1 });
      const pre = new DelayNode(ctx, {
        maxDelayTime: 0.2,
        delayTime: model.params.preDelay ?? 0.01
      });
      const conv = new ConvolverNode(ctx, {
        buffer: makeIrPreset(ctx, model.params.preset ?? 1, model.params.decay ?? 2.2)
      });
      const damp = new BiquadFilterNode(ctx, {
        type: 'lowpass',
        frequency: model.params.dampHz ?? 8000,
        Q: 0.707
      });

      const mix = makeMix(ctx, model.params.mix ?? 0.35, model.params.mixDepth ?? 0);

      input.connect(mix.dry).connect(out);
      input.connect(pre);
      pre.connect(conv);
      conv.connect(damp);
      damp.connect(mix.wet).connect(out);

      let lastPreset = model.params.preset ?? 1;
      let lastDecay = model.params.decay ?? 2.2;

      const inst: ModuleInstance = {
        id: model.id,
        type: 'irverb',
        inputs: {
          in: input,
          mixCv: mix.mixCvIn
        },
        outputs: { out },
        setParam: (id, value) => {
          if (id === 'preDelay') smoothSet(pre.delayTime, clamp(value, 0, 0.2), ctx, 20);
          if (id === 'dampHz') smoothSet(damp.frequency, clamp(value, 20, 20000), ctx, 30);
          if (id === 'preset') {
            lastPreset = clamp(Math.round(value), 0, 3);
            conv.buffer = makeIrPreset(ctx, lastPreset, lastDecay);
          }
          if (id === 'decay') {
            lastDecay = clamp(value, 0.05, 8);
            conv.buffer = makeIrPreset(ctx, lastPreset, lastDecay);
          }
          if (id === 'mix') mix.setMix(value);
          if (id === 'mixDepth') mix.setDepth(value);
        },
        dispose: () => {
          input.disconnect();
          out.disconnect();
          pre.disconnect();
          conv.disconnect();
          damp.disconnect();
          mix.dispose();
        }
      };

      return inst;
    }
  },

  clock: {
    type: 'clock',
    title: 'Clock',
    inputs: [],
    outputs: [{ id: 'out', name: 'OUT', dir: 'out', kind: 'gate' }],
    params: [
      { id: 'bpm', label: 'BPM', min: 1, max: 400, step: 0.1, defaultValue: 120 },
      { id: 'ppq', label: 'PPQ', min: 1, max: 96, step: 1, defaultValue: 4 },
      { id: 'duty', label: 'Duty', min: 0.01, max: 0.9, step: 0.01, defaultValue: 0.1 }
    ],
    create: (ctx, model) => {
      const node = new AudioWorkletNode(ctx, 'clock-processor', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [1]
      });

      node.parameters.get('bpm')!.value = model.params.bpm ?? 120;
      node.parameters.get('ppq')!.value = model.params.ppq ?? 4;
      node.parameters.get('duty')!.value = model.params.duty ?? 0.1;

      const inst: ModuleInstance = {
        id: model.id,
        type: 'clock',
        inputs: {},
        outputs: { out: node },
        setParam: (id, value) => {
          const param = node.parameters.get(id);
          if (param) smoothSet(param, value, ctx, 40);
        },
        dispose: () => node.disconnect()
      };
      return inst;
    }
  },

  output: {
    type: 'output',
    title: 'Output',
    inputs: [{ id: 'in', name: 'IN', dir: 'in', kind: 'audio' }],
    outputs: [],
    params: [{ id: 'vol', label: 'Volume', min: 0, max: 1.5, step: 0.001, defaultValue: 0.7 }],
    create: (ctx, model) => {
      const inGain = new GainNode(ctx, { gain: model.params.vol ?? 0.7 });

      const comp = new DynamicsCompressorNode(ctx, {
        threshold: -12,
        knee: 12,
        ratio: 12,
        attack: 0.003,
        release: 0.15
      });

      inGain.connect(comp).connect(ctx.destination);

      const inst: ModuleInstance = {
        id: model.id,
        type: 'output',
        inputs: { in: inGain },
        outputs: {},
        setParam: (id, value) => {
          if (id === 'vol') smoothSet(inGain.gain, clamp(value, 0, 2), ctx);
        },
        dispose: () => {
          inGain.disconnect();
          comp.disconnect();
        }
      };
      return inst;
    }
  }
};
