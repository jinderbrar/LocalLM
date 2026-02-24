import type { SearchResult, Chunk, Citation } from '../types'

/**
 * Options for pipeline execution
 */
export interface PipelineOptions {
  /**
   * Enable debug logging
   */
  debug?: boolean

  /**
   * Progress callback for long-running operations
   */
  onProgress?: (stage: string, progress: number) => void
}

/**
 * Stage of the RAG pipeline
 */
export type PipelineStage =
  | 'ingest'
  | 'chunk'
  | 'embed'
  | 'index'
  | 'retrieve'
  | 'generate'
  | 'postprocess'

/**
 * Pipeline execution context (passed between stages)
 */
export interface PipelineContext {
  stage: PipelineStage
  startTime: number
  metadata: Record<string, any>
}

/**
 * Result from the ingest stage
 */
export interface IngestResult {
  docId: string
  chunkCount: number
  duration: number
}

/**
 * Result from the query stage (same as SearchResult for now)
 */
export interface QueryResult extends SearchResult {}
