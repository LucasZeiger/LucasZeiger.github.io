import type { CableModel, ModuleInstance, ModuleModel } from './types';
import { MODULE_DEFS } from './moduleDefs';

type Connected = {
  fromNode: AudioNode;
  toTarget: AudioNode | AudioParam;
};

export class AudioEngine {
  private ctx: AudioContext;
  private instances = new Map<string, ModuleInstance>();
  private cables = new Map<string, CableModel>();
  private connected = new Map<string, Connected>();

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  get audioContext() {
    return this.ctx;
  }

  getAnalyser(moduleId: string): AnalyserNode | null {
    const inst = this.instances.get(moduleId);
    return inst?.viz?.analyser ?? null;
  }

  upsertModule(model: ModuleModel) {
    let inst = this.instances.get(model.id);
    if (!inst) {
      const def = MODULE_DEFS[model.type];
      inst = def.create(this.ctx, model);
      this.instances.set(model.id, inst);
    }

    const entries = Object.entries(model.params);
    if (inst.type === 'keyboard') {
      for (const [key, value] of entries) {
        if (key === 'gate') continue;
        inst.setParam(key, value);
      }
      if (Object.prototype.hasOwnProperty.call(model.params, 'gate')) {
        inst.setParam('gate', model.params.gate);
      }
      return;
    }
    for (const [key, value] of entries) {
      inst.setParam(key, value);
    }
  }

  removeModule(id: string) {
    for (const [cid, cable] of this.cables.entries()) {
      if (cable.from.moduleId === id || cable.to.moduleId === id) this.disconnectCable(cid);
    }
    const inst = this.instances.get(id);
    if (inst) {
      inst.dispose();
      this.instances.delete(id);
    }
  }

  setModules(models: ModuleModel[]) {
    const keep = new Set(models.map((model) => model.id));
    for (const id of [...this.instances.keys()]) {
      if (!keep.has(id)) this.removeModule(id);
    }
    for (const model of models) this.upsertModule(model);
  }

  setCables(next: CableModel[]) {
    const nextMap = new Map(next.map((cable) => [cable.id, cable]));

    for (const cableId of [...this.cables.keys()]) {
      if (!nextMap.has(cableId)) this.disconnectCable(cableId);
    }

    for (const cable of next) {
      if (!this.cables.has(cable.id)) this.connectCable(cable);
    }

    this.cables = nextMap;
  }

  private connectCable(cable: CableModel) {
    const fromInst = this.instances.get(cable.from.moduleId);
    const toInst = this.instances.get(cable.to.moduleId);
    if (!fromInst || !toInst) return;

    const fromNode = fromInst.outputs[cable.from.portId];
    const toTarget = toInst.inputs[cable.to.portId];

    if (!fromNode || !toTarget) return;

    try {
      fromNode.connect(toTarget as any);
      this.connected.set(cable.id, { fromNode, toTarget });
      this.cables.set(cable.id, cable);
    } catch {
      // ignore invalid connections
    }
  }

  private disconnectCable(cableId: string) {
    const conn = this.connected.get(cableId);
    if (conn) {
      try {
        conn.fromNode.disconnect(conn.toTarget as any);
      } catch {
        // ignore disconnect failures
      }
      this.connected.delete(cableId);
    }
    this.cables.delete(cableId);
  }

  dispose() {
    for (const cableId of [...this.cables.keys()]) this.disconnectCable(cableId);
    for (const id of [...this.instances.keys()]) this.removeModule(id);
  }
}
