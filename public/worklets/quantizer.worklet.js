// @ts-check

function hzToMidi(hz) {
  if (hz <= 0) return -Infinity;
  return 69 + 12 * (Math.log(hz / 440) / Math.LN2);
}

function midiToHz(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

const SCALES = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  [0, 2, 4, 5, 7, 9, 11],
  [0, 2, 3, 5, 7, 8, 10],
  [0, 2, 4, 7, 9],
  [0, 3, 5, 6, 7, 10]
];

function quantizeClass(semiInOct, allowed) {
  let best = allowed[0];
  let bestDist = Math.abs(semiInOct - best);

  for (let i = 1; i < allowed.length; i += 1) {
    const s = allowed[i];
    const d = Math.abs(semiInOct - s);
    if (d < bestDist || (d === bestDist && s < best)) {
      best = s;
      bestDist = d;
    }
  }
  return best;
}

class QuantizerProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'root', defaultValue: 0, minValue: 0, maxValue: 11, automationRate: 'k-rate' },
      { name: 'scale', defaultValue: 0, minValue: 0, maxValue: 4, automationRate: 'k-rate' },
      { name: 'transpose', defaultValue: 0, minValue: -48, maxValue: 48, automationRate: 'k-rate' },
      { name: 'enabled', defaultValue: 1, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0] && inputs[0][0] ? inputs[0][0] : null;
    const out = outputs[0][0];

    const enabled = parameters.enabled[0] >= 0.5;
    const root = Math.max(0, Math.min(11, Math.round(parameters.root[0])));
    const scaleIdx = Math.max(0, Math.min(4, Math.round(parameters.scale[0])));
    const transpose = Math.round(parameters.transpose[0]);

    if (!enabled) {
      for (let i = 0; i < out.length; i += 1) out[i] = input ? input[i] : 0;
      return true;
    }

    const allowed = SCALES[scaleIdx];

    for (let i = 0; i < out.length; i += 1) {
      const hz = input ? input[i] : 0;
      if (hz <= 0 || !Number.isFinite(hz)) {
        out[i] = hz;
        continue;
      }

      const midi = hzToMidi(hz) + transpose;
      const rel = midi - root;
      const oct = Math.floor(rel / 12);
      const inOct = rel - oct * 12;

      const q = quantizeClass(inOct, allowed);
      const qmidi = root + oct * 12 + q;

      out[i] = midiToHz(qmidi);
    }

    return true;
  }
}

registerProcessor('quantizer-processor', QuantizerProcessor);
