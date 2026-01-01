// @ts-check

function foldSample(x, folds) {
  const k = 1 + folds * 2;
  let y = x * k;

  y = y + 1;
  const m = y % 4;
  const t = m < 0 ? m + 4 : m;
  let tri = t < 2 ? t : 4 - t;
  tri = tri - 1;

  return tri;
}

class WavefolderProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'drive', defaultValue: 1, minValue: 0, maxValue: 10, automationRate: 'k-rate' },
      { name: 'folds', defaultValue: 1, minValue: 0, maxValue: 10, automationRate: 'k-rate' },
      { name: 'dcBlock', defaultValue: 1, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this._x1 = 0;
    this._y1 = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0] && inputs[0][0] ? inputs[0][0] : null;
    const out = outputs[0][0];

    const drive = Math.max(0, parameters.drive[0]);
    const folds = Math.max(0, parameters.folds[0]);
    const dcBlock = parameters.dcBlock[0] >= 0.5;

    let x1 = this._x1;
    let y1 = this._y1;

    for (let i = 0; i < out.length; i += 1) {
      const x = input ? input[i] : 0;

      let y = foldSample(x * drive, folds);

      if (dcBlock) {
        const R = 0.995;
        const hp = y - x1 + R * y1;
        x1 = y;
        y1 = hp;
        y = hp;
      }

      out[i] = y;
    }

    this._x1 = x1;
    this._y1 = y1;
    return true;
  }
}

registerProcessor('wavefolder-processor', WavefolderProcessor);
