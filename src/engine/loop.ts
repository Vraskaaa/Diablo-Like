// Fixed-timestep game loop with a render interpolation-free (but stable)
// accumulator. Gameplay updates at a fixed rate for deterministic simulation;
// rendering happens once per animation frame.

export interface LoopCallbacks {
  /** Called at a fixed rate with a constant dt (seconds). */
  update(dt: number): void;
  /** Called once per rendered frame. */
  render(): void;
}

export class GameLoop {
  private readonly fixedDt: number;
  private accumulator = 0;
  private lastTime = 0;
  private running = false;
  private cb: LoopCallbacks;
  private readonly maxFrame = 0.25; // clamp huge gaps (e.g. tab was hidden)

  constructor(cb: LoopCallbacks, updatesPerSecond = 60) {
    this.cb = cb;
    this.fixedDt = 1 / updatesPerSecond;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    let frameTime = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (frameTime > this.maxFrame) frameTime = this.maxFrame;

    this.accumulator += frameTime;
    // Run as many fixed steps as have accumulated.
    let steps = 0;
    while (this.accumulator >= this.fixedDt && steps < 240) {
      this.cb.update(this.fixedDt);
      this.accumulator -= this.fixedDt;
      steps++;
    }

    this.cb.render();
    requestAnimationFrame(this.frame);
  };
}
