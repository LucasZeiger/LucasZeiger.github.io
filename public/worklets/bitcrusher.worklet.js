// @ts-check

class BitcrusherProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'bitDepth', defaultValue: 8, minValue: 1, maxValue: 16, automationRate: 'k-rate' },
      { name: 'downsample', defaultValue: 4, minValue: 1, maxValue: 64, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this._held = 0;
    this._phase = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0] && inputs[0][0] ? inputs[0][0] : null;
    const out = outputs[0][0];

    const bits = Math.max(1, Math.min(16, Math.round(parameters.bitDepth[0])));
    const down = Math.max(1, Math.min(64, Math.round(parameters.downsample[0])));

    const levels = Math.pow(2, bits);
    const step = 2 / levels;

    let held = this._held;
    let phase = this._phase;

    for (let i = 0; i < out.length; i += 1) {
      if (phase === 0) {
        const x = input ? input[i] : 0;
        const q = Math.round(x / step) * step;
        held = Math.max(-1, Math.min(1, q));
      }

      out[i] = held;

      phase += 1;
      if (phase >= down) phase = 0;
    }

    this._held = held;
    this._phase = phase;
    return true;
  }
}

registerProcessor('bitcrusher-processor', BitcrusherProcessor);
