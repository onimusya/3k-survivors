export class SpatialHash {
  constructor(cell = 96) {
    this.cell = cell;
    this.map = new Map();
  }
  clear() { this.map.clear(); }
  key(cx, cy) { return cx + ',' + cy; }
  insert(obj, x, y) {
    const cx = Math.floor(x / this.cell), cy = Math.floor(y / this.cell);
    const k = this.key(cx, cy);
    let b = this.map.get(k);
    if (!b) { b = []; this.map.set(k, b); }
    b.push(obj);
    obj._cx = cx; obj._cy = cy;
  }
  query(x, y, r) {
    const out = [];
    const c0 = Math.floor((x - r) / this.cell), c1 = Math.floor((x + r) / this.cell);
    const r0 = Math.floor((y - r) / this.cell), r1 = Math.floor((y + r) / this.cell);
    for (let cx = c0; cx <= c1; cx++) {
      for (let cy = r0; cy <= r1; cy++) {
        const b = this.map.get(this.key(cx, cy));
        if (b) for (const o of b) out.push(o);
      }
    }
    return out;
  }
}