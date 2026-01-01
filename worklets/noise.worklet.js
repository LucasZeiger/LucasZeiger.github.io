// @ts-check

class NoiseProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'type', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'level', defaultValue: 0.2, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this._b0 = 0;
    this._b1 = 0;
    this._b2 = 0;
    this._b3 = 0;
    this._b4 = 0;
    this._b5 = 0;
    this._b6 = 0;
  }

  process(_inputs, outputs, parameters) {
    const out = outputs[0][0];
    const type = parameters.type[0] >= 0.5 ? 1 : 0;
    const level = Math.max(0, Math.min(1, parameters.level[0]));

    let b0 = this._b0;
    let b1 = this._b1;
    let b2 = this._b2;
    let b3 = this._b3;
    let b4 = this._b4;
    let b5 = this._b5;
    let b6 = this._b6;

    for (let i = 0; i < out.length; i += 1) {
      const white = Math.random() * 2 - 1;

      let y = white;

      if (type === 1) {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        y = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        b6 = white * 0.115926;
        y *= 0.11;
      }

      out[i] = y * level;
    }

    this._b0 = b0;
    this._b1 = b1;
    this._b2 = b2;
    this._b3 = b3;
    this._b4 = b4;
    this._b5 = b5;
    this._b6 = b6;

    return true;
  }
}

registerProcessor('noise-processor', NoiseProcessor);
