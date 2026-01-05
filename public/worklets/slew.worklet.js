// @ts-check

class SlewProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'rise', defaultValue: 0.05, minValue: 0, maxValue: 10, automationRate: 'k-rate' },
      { name: 'fall', defaultValue: 0.05, minValue: 0, maxValue: 10, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this._y = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0] && inputs[0][0] ? inputs[0][0] : null;
    const out = outputs[0][0];

    const rise = parameters.rise[0];
    const fall = parameters.fall[0];

    const riseStep = rise <= 0 ? Number.POSITIVE_INFINITY : 1 / (rise * sampleRate);
    const fallStep = fall <= 0 ? Number.POSITIVE_INFINITY : 1 / (fall * sampleRate);

    let y = this._y;

    for (let i = 0; i < out.length; i += 1) {
      const x = input ? input[i] : 0;

      if (x > y) {
        const ny = y + riseStep;
        y = ny > x ? x : ny;
      } else if (x < y) {
        const ny = y - fallStep;
        y = ny < x ? x : ny;
      }

      out[i] = y;
    }

    this._y = y;
    return true;
  }
}

registerProcessor('slew-processor', SlewProcessor);
