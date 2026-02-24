import type { StrategyConfig } from '../strategies/types'

/**
 * Configuration for a single strategy
 */
export interface StrategySelection {
  strategyId: string
  config: StrategyConfig
}

/**
 * Complete RAG pipeline configuration
 */
export interface RAGConfig {
  // Strategy selections for each stage
  chunking: StrategySelection
  embedding: StrategySelection
  retrieval: StrategySelection
  generation: StrategySelection
  postProcess: StrategySelection[]
}

/**
 * Metadata about a configuration preset
 */
export interface ConfigPreset {
  id: string
  name: string
  description: string
  icon?: string
  config: RAGConfig
}
