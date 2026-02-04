import type { SearchQuery, SearchResult, Chunk, Citation } from '../types'
import { getAllChunks, getDoc } from '../storage/db'
import { loadLexicalIndex, saveLexicalIndex } from '../storage/indexCache'
import { buildLexicalIndex, search as bm25Search } from '../index_lex'
import { buildVectorIndex, semanticSearch } from '../index_vec'
import { queryLatencyTracker } from '../perf/latency'
import { normalizeScores } from './normalize'

export async function executeSearch(query: SearchQuery): Promise<SearchResult> {
  const startTime = performance.now()

  // Load chunks
  const chunks = await getAllChunks()
  const chunksMap = new Map(chunks.map((c) => [c.id, c]))

  // Load or build index
  let index = await loadLexicalIndex()
  if (!index) {
    index = buildLexicalIndex(chunks)
    await saveLexicalIndex(index)
  }

  // Execute search based on mode
  let results: Array<{ chunk: Chunk; score: number }> = []

  switch (query.mode) {
    case 'lexical':
      results = bm25Search(query.text, index, chunksMap, query.topK || 10)
      break
    case 'semantic': {
      const vectorIndex = await buildVectorIndex(chunks)
      results = await semanticSearch(query.text, vectorIndex, chunksMap, query.topK || 10)
      break
    }
    case 'hybrid': {
      // Hybrid: combine lexical and semantic scores
      const vectorIndex = await buildVectorIndex(chunks)
      const alpha = query.alpha !== undefined ? query.alpha : 0.5 // default 50/50

      const lexicalResults = bm25Search(query.text, index, chunksMap, chunks.length)
      const semanticResults = await semanticSearch(
        query.text,
        vectorIndex,
        chunksMap,
        chunks.length
      )

      // Normalize scores to 0-1 range
      const lexicalMap = normalizeScores(lexicalResults)
      const semanticMap = normalizeScores(semanticResults)

      // Combine scores with alpha weighting
      const combinedScores = new Map<string, number>()
      const allChunkIds = new Set([...lexicalMap.keys(), ...semanticMap.keys()])

      for (const chunkId of allChunkIds) {
        const lexScore = lexicalMap.get(chunkId) || 0
        const semScore = semanticMap.get(chunkId) || 0
        const combined = alpha * semScore + (1 - alpha) * lexScore
        combinedScores.set(chunkId, combined)
      }

      // Sort and get topK
      results = Array.from(combinedScores.entries())
        .map(([chunkId, score]) => ({
          chunk: chunksMap.get(chunkId)!,
          score,
        }))
        .filter((r) => r.chunk)
        .sort((a, b) => b.score - a.score)
        .slice(0, query.topK || 10)
      break
    }
  }

  // Build citations
  const citations: Citation[] = []
  for (const result of results) {
    const doc = await getDoc(result.chunk.docId)
    if (doc) {
      citations.push({
        chunkId: result.chunk.id,
        docId: result.chunk.docId,
        docName: doc.name,
        pageNumber: result.chunk.pageNumber,
        text: result.chunk.text,
        score: result.score,
      })
    }
  }

  const retrievalTime = performance.now() - startTime

  // Track latency
  queryLatencyTracker.record(retrievalTime)

  return {
    chunks: results.map((r) => r.chunk),
    citations,
    scores: results.map((r) => r.score),
    latency: {
      retrieval: retrievalTime,
      total: retrievalTime,
    },
  }
}

export async function rebuildLexicalIndex(): Promise<void> {
  const chunks = await getAllChunks()
  const index = buildLexicalIndex(chunks)
  await saveLexicalIndex(index)
}
