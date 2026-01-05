// @ts-check

class SampleHoldProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'threshold', defaultValue: 0.5, minValue: -1, maxValue: 1, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this._held = 0;
    this._prevHigh = false;
  }

  process(inputs, outputs, parameters) {
    const sig = inputs[0] && inputs[0][0] ? inputs[0][0] : null;
    const clk = inputs[1] && inputs[1][0] ? inputs[1][0] : null;
    const out = outputs[0][0];

    const threshold = parameters.threshold[0];

    let held = this._held;
    let prevHigh = this._prevHigh;

    for (let i = 0; i < out.length; i += 1) {
      const s = sig ? sig[i] : 0;
      const c = clk ? clk[i] : 0;

      const high = c >= threshold;
      const rising = high && !prevHigh;
      prevHigh = high;

      if (rising) {
        held = s;
      }

      out[i] = held;
    }

    this._held = held;
    this._prevHigh = prevHigh;
    return true;
  }
}

registerProcessor('samplehold-processor', SampleHoldProcessor);
