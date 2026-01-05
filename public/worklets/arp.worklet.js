class ArpPitchProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'rootHz', defaultValue: 220, minValue: 20, maxValue: 2000, automationRate: 'k-rate' },
      { name: 'interval', defaultValue: 7, minValue: 1, maxValue: 24, automationRate: 'k-rate' },
      { name: 'steps', defaultValue: 4, minValue: 1, maxValue: 8, automationRate: 'k-rate' },
      { name: 'pattern', defaultValue: 0, minValue: 0, maxValue: 2, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this.stepIndex = 0;
    this.prevClockHigh = false;
    this.currentHz = 220;
    this.currentStep = 0;
    this.lastRootHz = 220;
    this.lastInterval = 7;
    this.lastSteps = 4;
    this.lastPattern = 0;
  }

  nextIndex(steps, pattern) {
    if (steps <= 1) return 0;
    if (pattern === 1) {
      return (steps - 1) - (this.stepIndex % steps);
    }
    if (pattern === 2) {
      const span = steps * 2 - 2;
      const pos = this.stepIndex % span;
      return pos < steps ? pos : span - pos;
    }
    return this.stepIndex % steps;
  }

  process(inputs, outputs, parameters) {
    const clockIn = inputs[0] && inputs[0][0];
    const out = outputs[0][0];

    const rootHz = parameters.rootHz[0];
    const interval = Math.max(1, Math.round(parameters.interval[0]));
    const steps = Math.max(1, Math.round(parameters.steps[0]));
    const pattern = Math.round(parameters.pattern[0]);

    if (
      rootHz !== this.lastRootHz ||
      interval !== this.lastInterval ||
      steps !== this.lastSteps ||
      pattern !== this.lastPattern
    ) {
      this.currentHz = rootHz * Math.pow(2, (this.currentStep * interval) / 12);
      this.lastRootHz = rootHz;
      this.lastInterval = interval;
      this.lastSteps = steps;
      this.lastPattern = pattern;
    }

    for (let i = 0; i < out.length; i += 1) {
      const clock = clockIn ? clockIn[i] : 0;
      const clockHigh = clock >= 0.5;
      if (clockHigh && !this.prevClockHigh) {
        const idx = this.nextIndex(steps, pattern);
        this.currentStep = idx;
        this.currentHz = rootHz * Math.pow(2, (idx * interval) / 12);
        this.stepIndex += 1;
      }
      this.prevClockHigh = clockHigh;
      out[i] = this.currentHz;
    }

    return true;
  }
}

class ArpGateProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'gateMs', defaultValue: 120, minValue: 5, maxValue: 400, automationRate: 'k-rate' },
      { name: 'steps', defaultValue: 4, minValue: 1, maxValue: 8, automationRate: 'k-rate' },
      { name: 'pattern', defaultValue: 0, minValue: 0, maxValue: 2, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this.prevClockHigh = false;
    this.gateSamplesLeft = 0;
  }

  process(inputs, outputs, parameters) {
    const clockIn = inputs[0] && inputs[0][0];
    const out = outputs[0][0];
    const gateMs = parameters.gateMs[0];

    const gateSamples = Math.max(1, Math.floor((gateMs / 1000) * sampleRate));

    for (let i = 0; i < out.length; i += 1) {
      const clock = clockIn ? clockIn[i] : 0;
      const clockHigh = clock >= 0.5;
      if (clockHigh && !this.prevClockHigh) {
        this.gateSamplesLeft = gateSamples;
      }
      this.prevClockHigh = clockHigh;

      if (this.gateSamplesLeft > 0) {
        out[i] = 1;
        this.gateSamplesLeft -= 1;
      } else {
        out[i] = 0;
      }
    }

    return true;
  }
}

registerProcessor('arp-pitch-processor', ArpPitchProcessor);
registerProcessor('arp-gate-processor', ArpGateProcessor);
export {};
