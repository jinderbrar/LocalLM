type ProgressCallback = (progress: { generation: number; embedding: number }) => void

class ModelProgressTracker {
  private generationProgress = 0
  private embeddingProgress = 0
  private listeners: ProgressCallback[] = []

  subscribe(callback: ProgressCallback): () => void {
    this.listeners.push(callback)
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback)
    }
  }

  updateGeneration(progress: number): void {
    this.generationProgress = Math.min(100, Math.max(0, progress))
    this.notifyListeners()
  }

  updateEmbedding(progress: number): void {
    this.embeddingProgress = Math.min(100, Math.max(0, progress))
    this.notifyListeners()
  }

  getProgress(): { generation: number; embedding: number } {
    return {
      generation: this.generationProgress,
      embedding: this.embeddingProgress,
    }
  }

  reset(): void {
    this.generationProgress = 0
    this.embeddingProgress = 0
    this.notifyListeners()
  }

  private notifyListeners(): void {
    const progress = this.getProgress()
    this.listeners.forEach((callback) => callback(progress))
  }
}

export const modelProgressTracker = new ModelProgressTracker()
