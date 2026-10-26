export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const dist2 = (ax, ay, bx, by) => {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
};
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

export class Pool {
  constructor(factory, reset, initial = 0) {
    this.factory = factory;
    this.reset = reset;
    this.free = [];
    this.active = [];
    for (let i = 0; i < initial; i++) this.free.push(factory());
  }
  acquire() {
    const o = this.free.length ? this.free.pop() : this.factory();
    this.active.push(o);
    return o;
  }
  release(o) {
    const i = this.active.indexOf(o);
    if (i >= 0) this.active.splice(i, 1);
    if (this.reset) this.reset(o);
    this.free.push(o);
  }
  releaseAll() {
    for (const o of this.active) {
      if (this.reset) this.reset(o);
      this.free.push(o);
    }
    this.active.length = 0;
  }
}