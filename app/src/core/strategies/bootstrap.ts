/**
 * Bootstrap file to register all strategies
 *
 * Import this file early in your app initialization to ensure
 * all strategies are registered before use.
 */

// Import registries for use in functions
import {
  ChunkingRegistry,
  EmbeddingRegistry,
  RetrievalRegistry,
  GenerationRegistry,
  PostProcessRegistry,
} from './index'

// Import all strategy implementations
// They will auto-register themselves via their module-level code

// Chunking strategies
import './chunking/FixedSizeChunker'

// Embedding strategies
import './embedding/MiniLMEmbedder'

// Retrieval strategies
import './retrieval/BM25Retriever'
import './retrieval/SemanticRetriever'
import './retrieval/HybridRetriever'

// Generation strategies
import './generation/ExtractiveGenerator'
import './generation/GenerativeGenerator'

// Post-processing strategies
import './postprocess/AnswerPolisher'

// Export registries for convenience
export {
  ChunkingRegistry,
  EmbeddingRegistry,
  RetrievalRegistry,
  GenerationRegistry,
  PostProcessRegistry,
}

/**
 * Get counts of registered strategies (useful for debugging)
 */
export function getRegisteredStrategyCounts() {
  return {
    chunking: ChunkingRegistry.getAll().length,
    embedding: EmbeddingRegistry.getAll().length,
    retrieval: RetrievalRegistry.getAll().length,
    generation: GenerationRegistry.getAll().length,
    postProcess: PostProcessRegistry.getAll().length,
  }
}

/**
 * Log registered strategies (useful for debugging)
 */
export function logRegisteredStrategies() {
  const counts = getRegisteredStrategyCounts()

  console.log('📋 Registered Strategies:')
  console.log(`  Chunking (${counts.chunking}):`, ChunkingRegistry.getAll().map((s: any) => s.id))
  console.log(`  Embedding (${counts.embedding}):`, EmbeddingRegistry.getAll().map((s: any) => s.id))
  console.log(`  Retrieval (${counts.retrieval}):`, RetrievalRegistry.getAll().map((s: any) => s.id))
  console.log(`  Generation (${counts.generation}):`, GenerationRegistry.getAll().map((s: any) => s.id))
  console.log(`  PostProcess (${counts.postProcess}):`, PostProcessRegistry.getAll().map((s: any) => s.id))
  console.log(`  Total: ${Object.values(counts).reduce((a, b) => a + b, 0)} strategies`)
}
