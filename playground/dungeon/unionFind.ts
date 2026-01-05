export class UnionFind<T extends string> {
  private parent = new Map<T, T>();
  private rank = new Map<T, number>();

  constructor(items: readonly T[]) {
    for (const it of items) {
      this.parent.set(it, it);
      this.rank.set(it, 0);
    }
  }

  find(x: T): T {
    const p = this.parent.get(x);
    if (!p) throw new Error(`UnionFind: missing item ${x}`);
    if (p === x) return x;
    const root = this.find(p);
    this.parent.set(x, root);
    return root;
  }

  union(a: T, b: T): boolean {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return false;

    const rka = this.rank.get(ra) ?? 0;
    const rkb = this.rank.get(rb) ?? 0;

    if (rka < rkb) {
      [ra, rb] = [rb, ra];
    }
    this.parent.set(rb, ra);
    if (rka === rkb) this.rank.set(ra, rka + 1);
    return true;
  }
}
