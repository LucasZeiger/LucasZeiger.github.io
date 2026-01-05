export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export enum Tile {
  Wall = 0,
  Room = 1,
  Corridor = 2,
  Door = 3
}

export type PartitionId = string;
export type RoomId = string;

export type SplitOrientation = 'V' | 'H';

export type ScoreBreakdown = Record<string, number>;

export type SplitCandidate = {
  orientation: SplitOrientation;
  line: number; // x for V, y for H
  a: Rect;
  b: Rect;
  score: number;
  breakdown: ScoreBreakdown;
};

export type PartitionNode = {
  id: PartitionId;
  rect: Rect;
  depth: number;
  split?: { orientation: SplitOrientation; line: number; left: PartitionId; right: PartitionId };
  parent?: PartitionId;
  isLeaf: boolean;
};

export type Room = {
  id: RoomId;
  rect: Rect;
  center: Point;
  leafId: PartitionId;
};

export type RoomCandidate = {
  rect: Rect;
  score: number;
  breakdown: ScoreBreakdown;
};

export type GraphEdge = {
  a: RoomId;
  b: RoomId;
  weight: number;
};

export type CorridorPlan = {
  fromRoom: RoomId;
  toRoom: RoomId;
  start: Point; // usually a "door" point on room perimeter
  goal: Point; // usually a "door" point on room perimeter
  path: Point[]; // computed once, carved step-by-step
  stats: { visited: number; pathLen: number; cost: number };
};

export type GenStage =
  | 'init'
  | 'bsp'
  | 'rooms'
  | 'graph'
  | 'corridor-plan'
  | 'corridor-carve'
  | 'post'
  | 'done';

export type Overlay = {
  stage: GenStage;
  message: string;

  // Visual aids for transparency:
  partitions?: Rect[];
  splitCandidates?: SplitCandidate[];
  roomLeaf?: Rect;
  roomCandidates?: RoomCandidate[];
  chosenRoom?: Rect;

  graphCandidateEdges?: GraphEdge[];
  graphAcceptedEdges?: GraphEdge[];

  corridorPlan?: CorridorPlan;
  carvingIndex?: number; // how many points already carved
};

export type GenEvent =
  | { type: 'init'; seed: string; width: number; height: number }
  | { type: 'split-chosen'; nodeId: PartitionId; rect: Rect; candidates: SplitCandidate[]; chosen: SplitCandidate }
  | { type: 'split-skipped'; nodeId: PartitionId; rect: Rect; reason: string }
  | { type: 'room-chosen'; leafId: PartitionId; leafRect: Rect; candidates: RoomCandidate[]; chosen: RoomCandidate }
  | { type: 'room-fallback'; leafId: PartitionId; leafRect: Rect; reason: string; chosen: RoomCandidate }
  | { type: 'graph-edge-considered'; edge: GraphEdge; accepted: boolean; reason: string }
  | { type: 'graph-loop-added'; edge: GraphEdge; reason: string }
  | { type: 'corridor-path-found'; plan: Omit<CorridorPlan, 'path'> & { pathPreview: Point[] } }
  | { type: 'corridor-carve-cell'; point: Point; index: number; total: number }
  | { type: 'door-placed'; point: Point; roomId: RoomId; reason: string }
  | { type: 'done'; rooms: number; corridors: number };
