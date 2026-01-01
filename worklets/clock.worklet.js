class ClockProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'bpm', defaultValue: 120, minValue: 1, maxValue: 400, automationRate: 'k-rate' },
      { name: 'ppq', defaultValue: 4, minValue: 1, maxValue: 96, automationRate: 'k-rate' },
      { name: 'duty', defaultValue: 0.1, minValue: 0.01, maxValue: 0.9, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this.pos = 0;

    this.port.onmessage = (event) => {
      const msg = event.data;
      if (msg.type === 'reset') this.pos = 0;
    };
  }

  process(_inputs, outputs, parameters) {
    const out = outputs[0][0];

    const bpm = parameters.bpm[0];
    const ppq = Math.max(1, Math.floor(parameters.ppq[0]));
    const duty = parameters.duty[0];

    const samplesPerPulse = Math.max(1, Math.floor((sampleRate * 60) / (bpm * ppq)));
    const highSamples = Math.max(1, Math.floor(samplesPerPulse * duty));

    for (let i = 0; i < out.length; i += 1) {
      out[i] = this.pos < highSamples ? 1 : 0;
      this.pos += 1;
      if (this.pos >= samplesPerPulse) this.pos = 0;
    }
    return true;
  }
}

registerProcessor('clock-processor', ClockProcessor);
export {};
