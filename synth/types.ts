export type PortKind = 'audio' | 'cv' | 'gate' | 'pitch';
export type PortDir = 'in' | 'out';
export type PortTarget = AudioNode | AudioParam;

export type PortDef = {
  id: string;
  name: string;
  dir: PortDir;
  kind: PortKind;
};

export type ParamDef = {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
};

export type ModuleType =
  | 'keyboard'
  | 'osc'
  | 'filter'
  | 'vca'
  | 'adsr'
  | 'lfo'
  | 'arp'
  | 'clock'
  | 'output'
  | 'offset'
  | 'attenuverter'
  | 'mixer'
  | 'scope'
  | 'vcmixer'
  | 'cvproc'
  | 'crossfader'
  | 'slew'
  | 'samplehold'
  | 'quantizer'
  | 'logic'
  | 'noise'
  | 'delay'
  | 'distortion'
  | 'chorus'
  | 'phaser'
  | 'reverb'
  | 'bitcrusher'
  | 'compressor'
  | 'flanger'
  | 'stereochorus'
  | 'eq3'
  | 'wavefolder'
  | 'irverb';

export type ModuleModel = {
  id: string;
  type: ModuleType;
  x: number;
  y: number;
  width?: number;
  collapsed?: boolean;
  params: Record<string, number>;
};

export type CableEnd = { moduleId: string; portId: string };
export type CableModel = { id: string; from: CableEnd; to: CableEnd };

export type ModuleInstance = {
  id: string;
  type: ModuleType;
  inputs: Record<string, PortTarget>;
  outputs: Record<string, AudioNode>;
  setParam: (id: string, value: number) => void;
  dispose: () => void;
  viz?: {
    analyser?: AnalyserNode;
  };
};

export type ModuleDef = {
  type: ModuleType;
  title: string;
  inputs: PortDef[];
  outputs: PortDef[];
  params: ParamDef[];
  create: (ctx: AudioContext, model: ModuleModel) => ModuleInstance;
};
