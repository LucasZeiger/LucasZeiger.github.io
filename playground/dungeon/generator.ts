import {
  CorridorPlan,
  GenEvent,
  GenStage,
  GraphEdge,
  Overlay,
  PartitionNode,
  Point,
  Rect,
  Room,
  RoomCandidate,
  SplitCandidate,
  Tile
} from './types';
import { RNG, intInRange, mulberry32, seedFromString } from './rng';
import { UnionFind } from './unionFind';
import { aStarCarvePath } from './astar';

function rectArea(r: Rect): number {
  return r.w * r.h;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function dist2(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function idx(x: number, y: number, w: number): number {
  return y * w + x;
}

function rectCenter(r: Rect): Point {
  return { x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) };
}

function rectContains(r: Rect, p: Point): boolean {
  return p.x >= r.x && p.y >= r.y && p.x < r.x + r.w && p.y < r.y + r.h;
}

function expandRect(r: Rect, pad: number): Rect {
  return { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 };
}

function rectIntersects(a: Rect, b: Rect): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

function nearestPointOnRoomPerimeter(room: Rect, target: Point): Point {
  // Clamp to interior first, then snap to nearest edge.
  const ix = clamp(target.x, room.x, room.x + room.w - 1);
  const iy = clamp(target.y, room.y, room.y + room.h - 1);

  const left = Math.abs(ix - room.x);
  const right = Math.abs(ix - (room.x + room.w - 1));
  const top = Math.abs(iy - room.y);
  const bottom = Math.abs(iy - (room.y + room.h - 1));

  const m = Math.min(left, right, top, bottom);
  if (m === left) return { x: room.x, y: iy };
  if (m === right) return { x: room.x + room.w - 1, y: iy };
  if (m === top) return { x: ix, y: room.y };
  return { x: ix, y: room.y + room.h - 1 };
}

export type DungeonConfig = {
  width: number;
  height: number;

  // BSP:
  maxDepth: number;
  minLeafSize: number; // minimum partition width/height to keep splitting
  splitCandidates: number;

  // Rooms:
  roomMinSize: number;
  roomMargin: number; // keep rooms away from partition edges
  roomCandidates: number;
  targetFill: number; // 0..1 desired fill ratio
  roomBuffer: number; // spacing buffer between rooms

  // Graph:
  kNearest: number; // for candidate edges
  extraLoopChance: number; // 0..1 chance per non-MST edge (capped)
  maxLoops: number;

  // Corridors:
  roomPenalty: number; // A* cost for walking through rooms
  reuseCorridorsBias: number; // corridor cost (relative to wall cost)
  turnPenalty: number; // extra cost when direction changes
};

export type DungeonState = {
  stage: GenStage;
  tiles: Uint8Array;
  width: number;
  height: number;

  partitions: Map<string, PartitionNode>;
  leafQueue: string[]; // for rooms stage
  rooms: Room[];

  graphCandidateEdges: GraphEdge[];
  graphAcceptedEdges: GraphEdge[];

  corridorPlans: CorridorPlan[];
};

type InternalCorridorWork = {
  plan: CorridorPlan;
  carveIndex: number;
};

export class DungeonGenerator {
  readonly config: DungeonConfig;
  readonly seedString: string;

  private rng: RNG;
  private nextId = 1;

  private state: DungeonState;
  private overlay: Overlay;

  private bspQueue: string[] = [];
  private graphEdgeIndex = 0;
  private uf: UnionFind<string> | null = null;

  private corridorEdgeIndex = 0;
  private corridorWork: InternalCorridorWork | null = null;
  private corridorsCarved = 0;
  private postIndex = 0;

  constructor(seed: string, cfg: DungeonConfig) {
    this.seedString = seed;
    this.config = cfg;

    const seedNum = seedFromString(seed);
    this.rng = mulberry32(seedNum);

    const tiles = new Uint8Array(cfg.width * cfg.height);
    tiles.fill(Tile.Wall);

    const partitions = new Map<string, PartitionNode>();
    const rootId = this.makeId('p');
    const root: PartitionNode = {
      id: rootId,
      rect: { x: 0, y: 0, w: cfg.width, h: cfg.height },
      depth: 0,
      isLeaf: true
    };
    partitions.set(rootId, root);
    this.bspQueue.push(rootId);

    this.state = {
      stage: 'init',
      tiles,
      width: cfg.width,
      height: cfg.height,
      partitions,
      leafQueue: [],
      rooms: [],
      graphCandidateEdges: [],
      graphAcceptedEdges: [],
      corridorPlans: []
    };

    this.overlay = { stage: 'init', message: 'Initialized.' };
  }

  getState(): DungeonState {
    return this.state;
  }

  getOverlay(): Overlay {
    return this.overlay;
  }

  isDone(): boolean {
    return this.state.stage === 'done';
  }

  nextStep(): GenEvent {
    switch (this.state.stage) {
      case 'init':
        this.state.stage = 'bsp';
        this.overlay = {
          stage: 'bsp',
          message: 'BSP: splitting partitions.',
          partitions: this.getAllPartitionRects()
        };
        return { type: 'init', seed: this.seedString, width: this.config.width, height: this.config.height };

      case 'bsp':
        return this.stepBsp();

      case 'rooms':
        return this.stepRooms();

      case 'graph':
        return this.stepGraph();

      case 'corridor-plan':
        return this.stepCorridorPlan();

      case 'corridor-carve':
        return this.stepCorridorCarve();

      case 'post':
        return this.stepPost();

      case 'done':
        return { type: 'done', rooms: this.state.rooms.length, corridors: this.corridorsCarved };

      default:
        // exhaustive check
        this.state.stage = 'done';
        return { type: 'done', rooms: this.state.rooms.length, corridors: this.corridorsCarved };
    }
  }

  // ---------------- BSP ----------------

  private stepBsp(): GenEvent {
    const nodeId = this.bspQueue.pop();
    if (!nodeId) {
      // move to rooms
      const leaves = [...this.state.partitions.values()].filter((p) => p.isLeaf).map((p) => p.id);
      this.state.leafQueue = leaves;
      this.state.stage = 'rooms';
      this.overlay = { stage: 'rooms', message: 'Room placement: choosing best candidate per leaf.' };
      return {
        type: 'split-skipped',
        nodeId: 'none',
        rect: { x: 0, y: 0, w: 0, h: 0 },
        reason: 'BSP complete. Moving to rooms.'
      };
    }

    const node = this.state.partitions.get(nodeId);
    if (!node) throw new Error(`Missing partition node ${nodeId}`);
    const r = node.rect;

    // stop conditions
    if (node.depth >= this.config.maxDepth) {
      this.overlay = { stage: 'bsp', message: 'BSP: max depth reached for node.', partitions: this.getAllPartitionRects() };
      return { type: 'split-skipped', nodeId, rect: r, reason: 'Max depth reached.' };
    }
    if (r.w < this.config.minLeafSize * 2 || r.h < this.config.minLeafSize * 2) {
      this.overlay = { stage: 'bsp', message: 'BSP: node too small to split.', partitions: this.getAllPartitionRects() };
      return { type: 'split-skipped', nodeId, rect: r, reason: 'Partition too small to split further.' };
    }

    const candidates = this.makeSplitCandidates(r);
    if (candidates.length === 0) {
      this.overlay = { stage: 'bsp', message: 'BSP: no valid split candidates.', partitions: this.getAllPartitionRects() };
      return { type: 'split-skipped', nodeId, rect: r, reason: 'No valid split candidates.' };
    }

    candidates.sort((a, b) => b.score - a.score);
    const chosen = candidates[0];

    const leftId = this.makeId('p');
    const rightId = this.makeId('p');

    const left: PartitionNode = {
      id: leftId,
      rect: chosen.a,
      depth: node.depth + 1,
      parent: node.id,
      isLeaf: true
    };
    const right: PartitionNode = {
      id: rightId,
      rect: chosen.b,
      depth: node.depth + 1,
      parent: node.id,
      isLeaf: true
    };

    node.isLeaf = false;
    node.split = { orientation: chosen.orientation, line: chosen.line, left: leftId, right: rightId };

    this.state.partitions.set(leftId, left);
    this.state.partitions.set(rightId, right);

    // add children to queue for further splitting
    this.bspQueue.push(leftId, rightId);

    this.overlay = {
      stage: 'bsp',
      message: `Split chosen: ${chosen.orientation} at ${chosen.line}`,
      partitions: this.getAllPartitionRects(),
      splitCandidates: candidates
    };

    return { type: 'split-chosen', nodeId, rect: r, candidates, chosen };
  }

  private makeSplitCandidates(r: Rect): SplitCandidate[] {
    const c: SplitCandidate[] = [];
    const n = this.config.splitCandidates;

    const minSize = this.config.minLeafSize;

    const prefer: SplitOrientation =
      r.w / r.h > 1.25 ? 'V' : r.h / r.w > 1.25 ? 'H' : this.rng() < 0.5 ? 'V' : 'H';

    const orientations: SplitOrientation[] = prefer === 'V' ? ['V', 'H'] : ['H', 'V'];

    for (const orientation of orientations) {
      for (let i = 0; i < n; i++) {
        if (orientation === 'V') {
          const x = intInRange(this.rng, r.x + minSize, r.x + r.w - minSize);
          const a: Rect = { x: r.x, y: r.y, w: x - r.x, h: r.h };
          const b: Rect = { x, y: r.y, w: r.x + r.w - x, h: r.h };
          const sc = this.scoreSplit(a, b);
          if (sc.score > -1e9) c.push({ orientation, line: x, a, b, score: sc.score, breakdown: sc.breakdown });
        } else {
          const y = intInRange(this.rng, r.y + minSize, r.y + r.h - minSize);
          const a: Rect = { x: r.x, y: r.y, w: r.w, h: y - r.y };
          const b: Rect = { x: r.x, y, w: r.w, h: r.y + r.h - y };
          const sc = this.scoreSplit(a, b);
          if (sc.score > -1e9) c.push({ orientation, line: y, a, b, score: sc.score, breakdown: sc.breakdown });
        }
      }
      if (c.length > 0) break; // use first orientation that yields candidates
    }

    return c;
  }

  private scoreSplit(a: Rect, b: Rect): { score: number; breakdown: Record<string, number> } {
    const minSize = this.config.minLeafSize;

    if (a.w < minSize || a.h < minSize || b.w < minSize || b.h < minSize) {
      return { score: -1e9, breakdown: { invalidMinSize: -1e9 } };
    }

    const areaA = rectArea(a);
    const areaB = rectArea(b);
    const total = areaA + areaB;

    const balance = 1 - Math.abs(areaA - areaB) / total; // 0..1
    const aspectA = Math.min(a.w / a.h, a.h / a.w); // closer to 1 is squarer
    const aspectB = Math.min(b.w / b.h, b.h / b.w);

    const breakdown = {
      balance: balance * 10,
      aspect: (aspectA + aspectB) * 5
    };
    const score = breakdown.balance + breakdown.aspect;
    return { score, breakdown };
  }

  private getAllPartitionRects(): Rect[] {
    return [...this.state.partitions.values()].map((p) => p.rect);
  }

  // ---------------- Rooms ----------------

  private stepRooms(): GenEvent {
    const leafId = this.state.leafQueue.shift();
    if (!leafId) {
      // move to graph
      this.buildGraphCandidates();
      this.uf = new UnionFind(this.state.rooms.map((r) => r.id));
      this.graphEdgeIndex = 0;
      this.state.stage = 'graph';
      this.overlay = {
        stage: 'graph',
        message: 'Graph: building MST (Kruskal), one edge considered per step.',
        graphCandidateEdges: this.state.graphCandidateEdges.slice(0, 40),
        graphAcceptedEdges: []
      };
      return {
        type: 'room-fallback',
        leafId: 'none',
        leafRect: { x: 0, y: 0, w: 0, h: 0 },
        reason: 'Rooms complete. Moving to graph.',
        chosen: { rect: { x: 0, y: 0, w: 0, h: 0 }, score: 0, breakdown: {} }
      };
    }

    const leaf = this.state.partitions.get(leafId);
    if (!leaf) throw new Error(`Missing leaf ${leafId}`);

    const leafRect = leaf.rect;
    const candidates = this.makeRoomCandidates(leafRect);
    const valid = candidates.length > 0;

    if (!valid) {
      const chosen = this.fallbackRoom(leafRect);
      this.placeRoom(leafId, chosen.rect);
      this.overlay = {
        stage: 'rooms',
        message: 'Room fallback (no valid candidates).',
        roomLeaf: leafRect,
        roomCandidates: [],
        chosenRoom: chosen.rect
      };
      return { type: 'room-fallback', leafId, leafRect, reason: 'No candidates fit min size/margins.', chosen };
    }

    candidates.sort((a, b) => b.score - a.score);
    const chosen = candidates[0];
    this.placeRoom(leafId, chosen.rect);

    this.overlay = {
      stage: 'rooms',
      message: `Room chosen (score ${chosen.score.toFixed(2)}).`,
      roomLeaf: leafRect,
      roomCandidates: candidates.slice(0, 12),
      chosenRoom: chosen.rect
    };

    return { type: 'room-chosen', leafId, leafRect, candidates: candidates.slice(0, 12), chosen };
  }

  private makeRoomCandidates(leaf: Rect): RoomCandidate[] {
    const out: RoomCandidate[] = [];
    const n = this.config.roomCandidates;

    const min = this.config.roomMinSize;
    const margin = this.config.roomMargin;

    const usable: Rect = {
      x: leaf.x + margin,
      y: leaf.y + margin,
      w: leaf.w - margin * 2,
      h: leaf.h - margin * 2
    };
    if (usable.w < min || usable.h < min) return out;

    for (let i = 0; i < n; i++) {
      const w = intInRange(this.rng, min, usable.w);
      const h = intInRange(this.rng, min, usable.h);
      const x = intInRange(this.rng, usable.x, usable.x + usable.w - w);
      const y = intInRange(this.rng, usable.y, usable.y + usable.h - h);
      const rect: Rect = { x, y, w, h };

      // Keep a small buffer between rooms in neighboring leaves via a global overlap check
      const buffer = expandRect(rect, this.config.roomBuffer);
      let overlaps = false;
      for (const existing of this.state.rooms) {
        if (rectIntersects(buffer, existing.rect)) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;

      const score = this.scoreRoom(rect, leaf);
      out.push({ rect, score: score.score, breakdown: score.breakdown });
    }

    return out;
  }

  private fallbackRoom(leaf: Rect): RoomCandidate {
    const min = this.config.roomMinSize;
    const margin = this.config.roomMargin;

    const usable: Rect = {
      x: leaf.x + margin,
      y: leaf.y + margin,
      w: Math.max(0, leaf.w - margin * 2),
      h: Math.max(0, leaf.h - margin * 2)
    };

    const w = Math.max(min, Math.floor(usable.w * 0.75));
    const h = Math.max(min, Math.floor(usable.h * 0.75));
    const x = clamp(Math.floor(usable.x + (usable.w - w) / 2), usable.x, usable.x + usable.w - w);
    const y = clamp(Math.floor(usable.y + (usable.h - h) / 2), usable.y, usable.y + usable.h - h);

    const rect: Rect = { x, y, w: Math.min(w, usable.w), h: Math.min(h, usable.h) };
    const sc = this.scoreRoom(rect, leaf);
    return { rect, score: sc.score, breakdown: sc.breakdown };
  }

  private scoreRoom(room: Rect, leaf: Rect): { score: number; breakdown: Record<string, number> } {
    const area = rectArea(room);
    const aspect = Math.min(room.w / room.h, room.h / room.w); // 0..1 (closer to 1 is squarer)
    const leafArea = rectArea(leaf);
    const fill = area / leafArea; // 0..1

    // Encourage: reasonably large rooms, not too thin, some variety (avoid always max fill)
    const breakdown = {
      area: fill * 12,
      aspect: aspect * 8,
      variety: (1 - Math.abs(fill - this.config.targetFill)) * 4
    };
    return { score: breakdown.area + breakdown.aspect + breakdown.variety, breakdown };
  }

  private placeRoom(leafId: string, rect: Rect): void {
    const roomId = this.makeId('r');
    const room: Room = { id: roomId, rect, center: rectCenter(rect), leafId };
    this.state.rooms.push(room);

    // Carve room into tiles
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) {
        this.state.tiles[idx(x, y, this.state.width)] = Tile.Room;
      }
    }
  }

  // ---------------- Graph (MST + loops) ----------------

  private buildGraphCandidates(): void {
    const rooms = this.state.rooms;
    const k = Math.max(1, this.config.kNearest);

    const edges: GraphEdge[] = [];
    for (let i = 0; i < rooms.length; i++) {
      const a = rooms[i];
      const dists: { j: number; w: number }[] = [];
      for (let j = 0; j < rooms.length; j++) {
        if (i === j) continue;
        const b = rooms[j];
        const w = dist2(a.center, b.center);
        dists.push({ j, w });
      }
      dists.sort((p, q) => p.w - q.w);
      for (let t = 0; t < Math.min(k, dists.length); t++) {
        const b = rooms[dists[t].j];
        const aId = a.id;
        const bId = b.id;
        const keyA = aId < bId ? aId : bId;
        const keyB = aId < bId ? bId : aId;
        const weight = Math.sqrt(dists[t].w);
        edges.push({ a: keyA, b: keyB, weight });
      }
    }

    // Deduplicate edges
    const seen = new Set<string>();
    const uniq: GraphEdge[] = [];
    for (const e of edges) {
      const k2 = `${e.a}|${e.b}`;
      if (seen.has(k2)) continue;
      seen.add(k2);
      uniq.push(e);
    }
    uniq.sort((a, b) => a.weight - b.weight);

    this.state.graphCandidateEdges = uniq;
    this.state.graphAcceptedEdges = [];
  }

  private stepGraph(): GenEvent {
    if (!this.uf) throw new Error('UnionFind missing (graph stage)');

    const rooms = this.state.rooms;
    if (rooms.length <= 1) {
      this.state.stage = 'corridor-plan';
      this.overlay = { stage: 'corridor-plan', message: 'No corridors needed (0 or 1 room).' };
      return {
        type: 'graph-edge-considered',
        edge: { a: 'none', b: 'none', weight: 0 },
        accepted: false,
        reason: 'Not enough rooms.'
      };
    }

    const targetEdges = rooms.length - 1;

    // First build MST (Kruskal): one edge considered per step
    if (this.state.graphAcceptedEdges.length < targetEdges && this.graphEdgeIndex < this.state.graphCandidateEdges.length) {
      const e = this.state.graphCandidateEdges[this.graphEdgeIndex++];
      const accepted = this.uf.union(e.a, e.b);
      if (accepted) this.state.graphAcceptedEdges.push(e);

      this.overlay = {
        stage: 'graph',
        message: accepted ? 'MST: accepted edge.' : 'MST: rejected edge (cycle).',
        graphCandidateEdges: this.state.graphCandidateEdges.slice(Math.max(0, this.graphEdgeIndex - 25), this.graphEdgeIndex + 5),
        graphAcceptedEdges: this.state.graphAcceptedEdges.slice()
      };

      return {
        type: 'graph-edge-considered',
        edge: e,
        accepted,
        reason: accepted ? 'Connected two components (Kruskal).' : 'Would create a cycle (Kruskal).'
      };
    }

    // Add a few loops (optional), still transparent, one per step.
    const nonMst = this.state.graphCandidateEdges.filter(
      (e) => !this.state.graphAcceptedEdges.some((m) => m.a === e.a && m.b === e.b)
    );
    const maxLoops = Math.max(0, Math.min(this.config.maxLoops, nonMst.length));
    const currentLoops = Math.max(0, this.state.graphAcceptedEdges.length - (rooms.length - 1));

    if (currentLoops < maxLoops && nonMst.length > 0 && this.rng() < this.config.extraLoopChance) {
      const pickIndex = intInRange(this.rng, 0, nonMst.length - 1);
      const e = nonMst[pickIndex];
      this.state.graphAcceptedEdges.push(e);

      this.overlay = {
        stage: 'graph',
        message: 'Loop: added extra edge.',
        graphCandidateEdges: this.state.graphCandidateEdges.slice(0, 40),
        graphAcceptedEdges: this.state.graphAcceptedEdges.slice()
      };

      return { type: 'graph-loop-added', edge: e, reason: 'Added loop for alternate routes (loopiness).' };
    }

    // move to corridors
    this.state.stage = 'corridor-plan';
    this.corridorEdgeIndex = 0;
    this.overlay = {
      stage: 'corridor-plan',
      message: 'Corridors: compute A* path per accepted edge, then carve cell-by-cell.',
      graphAcceptedEdges: this.state.graphAcceptedEdges.slice()
    };
    return {
      type: 'graph-edge-considered',
      edge: { a: 'none', b: 'none', weight: 0 },
      accepted: false,
      reason: 'Graph complete. Moving to corridors.'
    };
  }

  // ---------------- Corridors ----------------

  private stepCorridorPlan(): GenEvent {
    const edges = this.state.graphAcceptedEdges;
    if (this.corridorEdgeIndex >= edges.length) {
      this.state.stage = 'post';
      this.postIndex = 0;
      this.overlay = { stage: 'post', message: 'Post: placing doors on room boundaries.' };
      return {
        type: 'corridor-path-found',
        plan: {
          fromRoom: 'none',
          toRoom: 'none',
          start: { x: 0, y: 0 },
          goal: { x: 0, y: 0 },
          stats: { visited: 0, pathLen: 0, cost: 0 },
          pathPreview: []
        }
      };
    }

    const e = edges[this.corridorEdgeIndex++];
    const ra = this.state.rooms.find((r) => r.id === e.a);
    const rb = this.state.rooms.find((r) => r.id === e.b);
    if (!ra || !rb) throw new Error('Missing room for edge');

    const start = nearestPointOnRoomPerimeter(ra.rect, rb.center);
    const goal = nearestPointOnRoomPerimeter(rb.rect, ra.center);

    const result = aStarCarvePath({
      tiles: this.state.tiles,
      width: this.state.width,
      height: this.state.height,
      start,
      goal,
      roomPenalty: this.config.roomPenalty,
      reuseCorridorsBias: this.config.reuseCorridorsBias,
      turnPenalty: this.config.turnPenalty
    });

    const plan: CorridorPlan = {
      fromRoom: ra.id,
      toRoom: rb.id,
      start,
      goal,
      path: result.path,
      stats: { visited: result.visited, pathLen: result.path.length, cost: result.cost }
    };

    this.corridorWork = { plan, carveIndex: 0 };
    this.state.stage = 'corridor-carve';

    const preview = plan.path.slice(0, 80); // keep event payload readable
    this.overlay = {
      stage: 'corridor-carve',
      message: 'Corridor: carving path cell-by-cell.',
      corridorPlan: plan,
      carvingIndex: 0
    };

    return {
      type: 'corridor-path-found',
      plan: {
        fromRoom: plan.fromRoom,
        toRoom: plan.toRoom,
        start: plan.start,
        goal: plan.goal,
        stats: plan.stats,
        pathPreview: preview
      }
    };
  }

  private stepCorridorCarve(): GenEvent {
    if (!this.corridorWork) {
      this.state.stage = 'corridor-plan';
      return { type: 'corridor-carve-cell', point: { x: 0, y: 0 }, index: 0, total: 0 };
    }

    const { plan } = this.corridorWork;
    const i = this.corridorWork.carveIndex;

    if (i >= plan.path.length) {
      // done carving this corridor, go plan next
      this.state.corridorPlans.push(plan);
      this.corridorWork = null;
      this.state.stage = 'corridor-plan';
      this.corridorsCarved++;
      this.overlay = { stage: 'corridor-plan', message: 'Corridor carved. Planning next corridor.' };
      return { type: 'corridor-carve-cell', point: plan.goal, index: plan.path.length, total: plan.path.length };
    }

    const p = plan.path[i];
    const cur = this.state.tiles[idx(p.x, p.y, this.state.width)];
    if (cur === Tile.Wall) this.state.tiles[idx(p.x, p.y, this.state.width)] = Tile.Corridor;
    // If it's already Room, keep it Room (corridor reaches into room edge point)

    this.corridorWork.carveIndex++;

    this.overlay = {
      stage: 'corridor-carve',
      message: `Carving corridor: ${this.corridorWork.carveIndex}/${plan.path.length}`,
      corridorPlan: plan,
      carvingIndex: this.corridorWork.carveIndex
    };

    return { type: 'corridor-carve-cell', point: p, index: i + 1, total: plan.path.length };
  }

  // ---------------- Post: doors ----------------

  private stepPost(): GenEvent {
    // Place doors at start/goal points for each corridor plan if they sit on room boundary
    if (this.state.corridorPlans.length === 0) {
      this.state.stage = 'done';
      this.overlay = { stage: 'done', message: 'Done.' };
      return { type: 'done', rooms: this.state.rooms.length, corridors: this.corridorsCarved };
    }

    const plan = this.state.corridorPlans[this.postIndex];
    if (!plan) {
      this.state.stage = 'done';
      this.overlay = { stage: 'done', message: 'Done.' };
      return { type: 'done', rooms: this.state.rooms.length, corridors: this.corridorsCarved };
    }
    // put doors on start/goal (these are on room perimeter by construction)
    const points = [plan.start, plan.goal];

    for (const pt of points) {
      const i = idx(pt.x, pt.y, this.state.width);
      // If it is a room tile, make it a door (visual distinction). If corridor, also allow door.
      const t = this.state.tiles[i];
      if (t === Tile.Room || t === Tile.Corridor) {
        this.state.tiles[i] = Tile.Door;
      }
    }

    this.overlay = { stage: 'post', message: 'Placed doors for one corridor.' };
    this.postIndex += 1;
    // emit one door event per step (choose start)
    return { type: 'door-placed', point: plan.start, roomId: plan.fromRoom, reason: 'Door at corridor endpoint on room boundary.' };
  }

  // ---------------- helpers ----------------

  private makeId(prefix: string): string {
    return `${prefix}${this.nextId++}`;
  }
}
