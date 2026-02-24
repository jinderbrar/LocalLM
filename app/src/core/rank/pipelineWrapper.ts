/**
 * Backward-compatible wrapper for RAGPipeline
 *
 * This file provides the same API as the old executeSearch function,
 * but uses the new RAGPipeline under the hood.
 */

import { getPipeline } from '../init'
import type { SearchQuery, SearchResult } from '../types'

/**
 * Execute a search query using the RAGPipeline
 *
 * This is a drop-in replacement for the old executeSearch function.
 * It maintains the same API but uses the new modular pipeline architecture.
 *
 * @param query - Search query parameters
 * @returns Search result with chunks, citations, and optional generated answer
 */
export async function executeSearch(query: SearchQuery): Promise<SearchResult> {
  const pipeline = getPipeline()
  return await pipeline.query(query)
}

/**
 * Rebuild the lexical index for all documents
 *
 * This is maintained for backward compatibility.
 */
export async function rebuildLexicalIndex(): Promise<void> {
  // This is still using the old implementation for now
  const { rebuildLexicalIndex: oldRebuild } = await import('./search')
  await oldRebuild()
}
