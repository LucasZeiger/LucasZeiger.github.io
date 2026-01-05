const Stage = {
  Idle: 0,
  Attack: 1,
  Decay: 2,
  Sustain: 3,
  Release: 4
};

class ADSRProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'attack', defaultValue: 0.01, minValue: 0, maxValue: 10, automationRate: 'k-rate' },
      { name: 'decay', defaultValue: 0.15, minValue: 0, maxValue: 10, automationRate: 'k-rate' },
      { name: 'sustain', defaultValue: 0.6, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'release', defaultValue: 0.2, minValue: 0, maxValue: 10, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this.stage = Stage.Idle;
    this.env = 0;
    this.prevGateHigh = false;
    this.attackStep = 0;
    this.decayStep = 0;
    this.releaseStart = 0;
    this.releaseStep = 0;
  }

  process(inputs, outputs, parameters) {
    const gateIn = inputs[0] && inputs[0][0];
    const out = outputs[0][0];

    const attack = parameters.attack[0];
    const decay = parameters.decay[0];
    const sustain = parameters.sustain[0];
    const release = parameters.release[0];

    this.decayStep = decay <= 0 ? 1 : (1 - sustain) / (decay * sampleRate);

    for (let i = 0; i < out.length; i += 1) {
      const gate = gateIn ? gateIn[i] : 0;
      const gateHigh = gate >= 0.5;

      const rising = gateHigh && !this.prevGateHigh;
      const falling = !gateHigh && this.prevGateHigh;
      this.prevGateHigh = gateHigh;

      if (rising) {
        this.stage = Stage.Attack;
        this.attackStep = attack <= 0 ? 1 : (1 - this.env) / (attack * sampleRate);
      }

      if (falling) {
        this.stage = Stage.Release;
        this.releaseStart = this.env;
        this.releaseStep = release <= 0 ? this.releaseStart : this.releaseStart / (release * sampleRate);
      }

      switch (this.stage) {
        case Stage.Idle: {
          this.env = 0;
          if (gateHigh) {
            this.stage = Stage.Attack;
            this.attackStep = attack <= 0 ? 1 : (1 - this.env) / (attack * sampleRate);
          }
          break;
        }

        case Stage.Attack: {
          if (!gateHigh) {
            this.stage = Stage.Release;
            this.releaseStart = this.env;
            this.releaseStep = release <= 0 ? this.releaseStart : this.releaseStart / (release * sampleRate);
            break;
          }
          this.env += this.attackStep;
          if (this.env >= 1) {
            this.env = 1;
            this.stage = Stage.Decay;
          }
          break;
        }

        case Stage.Decay: {
          if (!gateHigh) {
            this.stage = Stage.Release;
            this.releaseStart = this.env;
            this.releaseStep = release <= 0 ? this.releaseStart : this.releaseStart / (release * sampleRate);
            break;
          }
          this.env -= this.decayStep;
          if (this.env <= sustain) {
            this.env = sustain;
            this.stage = Stage.Sustain;
          }
          break;
        }

        case Stage.Sustain: {
          this.env = sustain;
          if (!gateHigh) {
            this.stage = Stage.Release;
            this.releaseStart = this.env;
            this.releaseStep = release <= 0 ? this.releaseStart : this.releaseStart / (release * sampleRate);
          }
          break;
        }

        case Stage.Release: {
          if (gateHigh) {
            this.stage = Stage.Attack;
            this.attackStep = attack <= 0 ? 1 : (1 - this.env) / (attack * sampleRate);
            break;
          }
          this.env -= this.releaseStep;
          if (this.env <= 0) {
            this.env = 0;
            this.stage = Stage.Idle;
          }
          break;
        }
        default:
          break;
      }

      out[i] = this.env;
    }

    return true;
  }
}

registerProcessor('adsr-processor', ADSRProcessor);
export {};
