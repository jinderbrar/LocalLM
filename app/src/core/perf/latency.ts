// Latency tracking for query performance

export class LatencyTracker {
  private measurements: number[] = []
  private maxSize: number

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize
  }

  record(latencyMs: number): void {
    this.measurements.push(latencyMs)

    // Keep only the most recent measurements
    if (this.measurements.length > this.maxSize) {
      this.measurements.shift()
    }
  }

  getP50(): number {
    return this.percentile(50)
  }

  getP95(): number {
    return this.percentile(95)
  }

  getP99(): number {
    return this.percentile(99)
  }

  getMean(): number {
    if (this.measurements.length === 0) return 0
    const sum = this.measurements.reduce((a, b) => a + b, 0)
    return sum / this.measurements.length
  }

  getCount(): number {
    return this.measurements.length
  }

  clear(): void {
    this.measurements = []
  }

  private percentile(p: number): number {
    if (this.measurements.length === 0) return 0

    const sorted = [...this.measurements].sort((a, b) => a - b)
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }
}

// Global tracker instance
export const queryLatencyTracker = new LatencyTracker()

export interface LatencyStats {
  p50: number
  p95: number
  p99: number
  mean: number
  count: number
}

export function getLatencyStats(): LatencyStats {
  return {
    p50: queryLatencyTracker.getP50(),
    p95: queryLatencyTracker.getP95(),
    p99: queryLatencyTracker.getP99(),
    mean: queryLatencyTracker.getMean(),
    count: queryLatencyTracker.getCount(),
  }
}
