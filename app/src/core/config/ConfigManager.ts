import type { RAGConfig } from './types'
import { DEFAULT_MODEL_ID } from '../generate/models'

/**
 * Centralized configuration manager for RAG pipeline
 */
export class ConfigManager {
  private static readonly STORAGE_KEY = 'rag-config'
  private static readonly VERSION_KEY = 'rag-config-version'
  private static readonly CURRENT_VERSION = 4 // Bumped to use extractive-only (no generative models)

  /**
   * Get current configuration from localStorage
   */
  static getConfig(): RAGConfig {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      const version = localStorage.getItem(this.VERSION_KEY)

      if (stored && version === String(this.CURRENT_VERSION)) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.warn('Failed to load config from localStorage:', error)
    }

    // Return default config if no valid config found
    return this.getDefaultConfig()
  }

  /**
   * Save configuration to localStorage
   */
  static saveConfig(config: RAGConfig): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config))
      localStorage.setItem(this.VERSION_KEY, String(this.CURRENT_VERSION))
    } catch (error) {
      console.error('Failed to save config to localStorage:', error)
    }
  }

  /**
   * Get default configuration (matches current app behavior)
   */
  static getDefaultConfig(): RAGConfig {
    return {
      chunking: {
        strategyId: 'fixed-size',
        config: {
          chunkSize: 400,
          overlapPercent: 12,
        },
      },
      embedding: {
        strategyId: 'minilm-l6-v2',
        config: {
          batchSize: 1,
          normalize: true,
        },
      },
      retrieval: {
        strategyId: 'semantic',
        config: {
          topK: 5,
        },
      },
      generation: {
        strategyId: 'extractive-distilbert-qa',
        config: {
          maxTokens: 200,
        },
      },
      postProcess: [
        {
          strategyId: 'polish',
          config: {
            enabled: false,
          },
        },
      ],
    }
  }

  /**
   * Reset configuration to default
   */
  static resetConfig(): void {
    this.saveConfig(this.getDefaultConfig())
  }

  /**
   * Update a specific stage configuration
   */
  static updateStage(
    stage: keyof Omit<RAGConfig, 'postProcess'>,
    strategyId: string,
    config: Record<string, any>
  ): void {
    const currentConfig = this.getConfig()
    currentConfig[stage] = { strategyId, config }
    this.saveConfig(currentConfig)
  }

  /**
   * Add or update a post-processing strategy
   */
  static updatePostProcess(strategyId: string, config: Record<string, any>): void {
    const currentConfig = this.getConfig()
    const existingIndex = currentConfig.postProcess.findIndex(
      (p) => p.strategyId === strategyId
    )

    if (existingIndex >= 0) {
      currentConfig.postProcess[existingIndex] = { strategyId, config }
    } else {
      currentConfig.postProcess.push({ strategyId, config })
    }

    this.saveConfig(currentConfig)
  }

  /**
   * Remove a post-processing strategy
   */
  static removePostProcess(strategyId: string): void {
    const currentConfig = this.getConfig()
    currentConfig.postProcess = currentConfig.postProcess.filter(
      (p) => p.strategyId !== strategyId
    )
    this.saveConfig(currentConfig)
  }

  /**
   * Export configuration as JSON string
   */
  static exportConfig(): string {
    return JSON.stringify(this.getConfig(), null, 2)
  }

  /**
   * Import configuration from JSON string
   */
  static importConfig(jsonString: string): boolean {
    try {
      const config = JSON.parse(jsonString)
      // Basic validation
      if (
        config.chunking &&
        config.embedding &&
        config.retrieval &&
        config.generation &&
        Array.isArray(config.postProcess)
      ) {
        this.saveConfig(config)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to import config:', error)
      return false
    }
  }
}
