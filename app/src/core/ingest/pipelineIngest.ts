/**
 * Pipeline-based document ingestion
 *
 * This provides the same API as the old manual ingestion process,
 * but uses the RAGPipeline under the hood.
 */

import { getPipeline } from '../init'
import type { IngestResult } from '../pipeline/types'

/**
 * Ingest a file using the RAGPipeline
 *
 * This handles:
 * - File parsing (PDF/TXT/MD)
 * - Chunking with configured strategy
 * - Embedding generation with configured strategy
 * - Storage in IndexedDB
 * - Index rebuilding
 *
 * @param file - File to ingest
 * @param onProgress - Optional progress callback
 * @returns Document ID and metadata
 */
export async function ingestDocument(
  file: File,
  onProgress?: (stage: string, progress: number) => void
): Promise<IngestResult> {
  const pipeline = getPipeline()
  return await pipeline.ingest(file, onProgress)
}
