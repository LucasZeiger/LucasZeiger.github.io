import { MinHeap } from './heap';
import { Point, Tile } from './types';

export type AStarResult = {
  path: Point[];
  visited: number;
  cost: number;
};

function idx(x: number, y: number, w: number): number {
  return y * w + x;
}

function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function aStarCarvePath(params: {
  tiles: Uint8Array;
  width: number;
  height: number;
  start: Point;
  goal: Point;
  roomPenalty: number; // discourage cutting through rooms
  reuseCorridorsBias: number; // < 1 favors reusing corridors
  turnPenalty: number; // extra cost when direction changes
}): AStarResult {
  const { tiles, width, height, start, goal, roomPenalty, reuseCorridorsBias, turnPenalty } = params;
  const startI = idx(start.x, start.y, width);
  const goalI = idx(goal.x, goal.y, width);

  const g = new Float64Array(width * height);
  const cameFrom = new Int32Array(width * height);
  const cameDir = new Int8Array(width * height);
  const closed = new Uint8Array(width * height);

  for (let i = 0; i < g.length; i++) {
    g[i] = Number.POSITIVE_INFINITY;
    cameFrom[i] = -1;
    cameDir[i] = -1;
    closed[i] = 0;
  }

  const open = new MinHeap();
  const minStep = Math.min(1, reuseCorridorsBias);
  g[startI] = 0;
  open.push({ key: manhattan(start, goal) * minStep, value: startI });

  let visited = 0;
  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 }
  ];

  const tileCost = (t: number): number => {
    if (t === Tile.Wall) return 1;
    if (t === Tile.Corridor || t === Tile.Door) return reuseCorridorsBias;
    if (t === Tile.Room) return roomPenalty;
    return 1;
  };

  while (open.size > 0) {
    const cur = open.pop()!;
    const curI = cur.value;
    if (closed[curI]) continue;

    closed[curI] = 1;
    visited++;

    if (curI === goalI) break;

    const cx = curI % width;
    const cy = Math.floor(curI / width);

    for (let dirIndex = 0; dirIndex < dirs.length; dirIndex++) {
      const d = dirs[dirIndex];
      const nx = cx + d.dx;
      const ny = cy + d.dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

      const ni = idx(nx, ny, width);
      if (closed[ni]) continue;

      const step = tileCost(tiles[ni]);
      const prevDir = cameDir[curI];
      const turnCost = prevDir !== -1 && prevDir !== dirIndex ? turnPenalty : 0;
      const tentative = g[curI] + step + turnCost;

      if (tentative < g[ni]) {
        g[ni] = tentative;
        cameFrom[ni] = curI;
        cameDir[ni] = dirIndex;
        const h = (Math.abs(nx - goal.x) + Math.abs(ny - goal.y)) * minStep;
        open.push({ key: tentative + h, value: ni });
      }
    }
  }

  if (cameFrom[goalI] === -1 && startI !== goalI) {
    // No path found: return direct fallback (still deterministic)
    return { path: [start, goal], visited, cost: Number.POSITIVE_INFINITY };
  }

  const path: Point[] = [];
  let cur = goalI;
  path.push({ x: goalI % width, y: Math.floor(goalI / width) });
  while (cur !== startI) {
    cur = cameFrom[cur];
    if (cur === -1) break;
    path.push({ x: cur % width, y: Math.floor(cur / width) });
  }
  path.reverse();

  return { path, visited, cost: g[goalI] };
}
