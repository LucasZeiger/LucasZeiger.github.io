class GateProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'gate', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this.gate = 0;
    this.triggerSamplesLeft = 0;

    this.port.onmessage = (event) => {
      const msg = event.data;
      if (msg.type === 'set') {
        this.gate = msg.value >= 0.5 ? 1 : 0;
        this.triggerSamplesLeft = 0;
      } else if (msg.type === 'toggle') {
        this.gate = this.gate ? 0 : 1;
        this.triggerSamplesLeft = 0;
      } else if (msg.type === 'trigger') {
        const ms = Math.max(0, msg.ms);
        this.triggerSamplesLeft = Math.max(1, Math.floor((ms / 1000) * sampleRate));
        this.gate = 1;
      }
    };
  }

  process(_inputs, outputs, parameters) {
    const out = outputs[0][0];
    const gateParam = parameters.gate ? parameters.gate[0] : this.gate;
    for (let i = 0; i < out.length; i += 1) {
      let v = this.gate;
      if (this.triggerSamplesLeft > 0) {
        v = 1;
        this.triggerSamplesLeft -= 1;
        if (this.triggerSamplesLeft === 0) this.gate = 0;
      } else {
        this.gate = gateParam >= 0.5 ? 1 : 0;
        v = this.gate;
      }
      out[i] = v;
    }
    return true;
  }
}

registerProcessor('gate-processor', GateProcessor);
export {};
