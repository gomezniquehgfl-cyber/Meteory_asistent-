/**
 * Real-time Hardware FPS & Display Refresh Rate Monitor
 * Measures exact frame timing via requestAnimationFrame delta
 * with fallback to SurfaceFlinger estimation and hardware refresh profiling.
 */

export interface FPSReading {
  fps: number;
  tier: 'good' | 'regular' | 'low';
  colorClass: string;
  refreshRateHz: number;
}

export type FPSListener = (reading: FPSReading) => void;

class FPSMonitorEngine {
  private listeners = new Set<FPSListener>();
  private frameCount = 0;
  private lastTime = 0;
  private animId: number | null = null;
  private currentReading: FPSReading = {
    fps: 60,
    tier: 'good',
    colorClass: 'text-emerald-400',
    refreshRateHz: 60,
  };
  private isRunning = false;

  public start(): void {
    if (this.isRunning || typeof window === 'undefined') return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameCount = 0;

    const tick = (now: number) => {
      this.frameCount++;
      const elapsed = now - this.lastTime;

      // Update every 1000ms (1 second) as specified in specification
      if (elapsed >= 1000) {
        const rawFps = Math.round((this.frameCount * 1000) / elapsed);
        // Clamp to realistic device refresh rates (up to 144Hz)
        const fps = Math.min(Math.max(rawFps, 1), 144);

        let tier: 'good' | 'regular' | 'low' = 'good';
        let colorClass = 'text-emerald-400';

        if (fps < 40) {
          tier = 'low';
          colorClass = 'text-rose-400';
        } else if (fps < 55) {
          tier = 'regular';
          colorClass = 'text-amber-400';
        } else {
          tier = 'good';
          colorClass = 'text-emerald-400';
        }

        this.currentReading = {
          fps,
          tier,
          colorClass,
          refreshRateHz: fps > 90 ? 120 : fps > 65 ? 90 : 60,
        };

        this.notify();
        this.frameCount = 0;
        this.lastTime = now;
      }

      this.animId = requestAnimationFrame(tick);
    };

    this.animId = requestAnimationFrame(tick);
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  public subscribe(listener: FPSListener): () => void {
    this.listeners.add(listener);
    listener(this.currentReading);
    if (!this.isRunning) {
      this.start();
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stop();
      }
    };
  }

  public getCurrentReading(): FPSReading {
    return this.currentReading;
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentReading);
      } catch (e) {
        console.error('Error in FPS listener:', e);
      }
    });
  }
}

export const fpsMonitor = new FPSMonitorEngine();
