// @ts-check

class LogicProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'mode', defaultValue: 0, minValue: 0, maxValue: 7, automationRate: 'k-rate' },
      { name: 'threshold', defaultValue: 0.5, minValue: -1, maxValue: 1, automationRate: 'k-rate' }
    ];
  }

  process(inputs, outputs, parameters) {
    const aIn = inputs[0] && inputs[0][0] ? inputs[0][0] : null;
    const bIn = inputs[1] && inputs[1][0] ? inputs[1][0] : null;
    const out = outputs[0][0];

    const mode = Math.max(0, Math.min(7, Math.round(parameters.mode[0])));
    const thr = parameters.threshold[0];

    for (let i = 0; i < out.length; i += 1) {
      const a = aIn ? aIn[i] : 0;
      const b = bIn ? bIn[i] : 0;

      const ah = a >= thr;
      const bh = b >= thr;

      let y = 0;

      switch (mode) {
        case 0: y = ah && bh ? 1 : 0; break;
        case 1: y = ah || bh ? 1 : 0; break;
        case 2: y = ah !== bh ? 1 : 0; break;
        case 3: y = !(ah && bh) ? 1 : 0; break;
        case 4: y = !(ah || bh) ? 1 : 0; break;
        case 5: y = (ah === bh) ? 1 : 0; break;
        case 6: y = !ah ? 1 : 0; break;
        case 7: y = !bh ? 1 : 0; break;
        default: y = 0;
      }

      out[i] = y;
    }

    return true;
  }
}

registerProcessor('logic-processor', LogicProcessor);
