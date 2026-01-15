import { describe, it, expect } from 'vitest'
import { buildLexicalIndex, computeBM25Score, search } from './bm25'
import type { Chunk } from '../types'

describe('BM25 Index', () => {
  const testChunks: Chunk[] = [
    {
      id: 'chunk1',
      docId: 'doc1',
      pageNumber: 1,
      text: 'The quick brown fox jumps over the lazy dog',
      startOffset: 0,
      endOffset: 44,
    },
    {
      id: 'chunk2',
      docId: 'doc1',
      pageNumber: 1,
      text: 'The dog was very lazy and slept all day',
      startOffset: 44,
      endOffset: 84,
    },
    {
      id: 'chunk3',
      docId: 'doc2',
      pageNumber: 1,
      text: 'Machine learning algorithms process data efficiently',
      startOffset: 0,
      endOffset: 52,
    },
  ]

  it('should build lexical index from chunks', () => {
    const index = buildLexicalIndex(testChunks)

    expect(index.chunkIds).toHaveLength(3)
    expect(index.docFreq.size).toBeGreaterThan(0)
    expect(index.termFreq.size).toBe(3)
    expect(index.avgDocLength).toBeGreaterThan(0)
  })

  it('should compute BM25 scores', () => {
    const index = buildLexicalIndex(testChunks)
    const score1 = computeBM25Score('lazy dog', 'chunk1', index)
    const score2 = computeBM25Score('lazy dog', 'chunk2', index)
    const score3 = computeBM25Score('lazy dog', 'chunk3', index)

    // Chunks 1 and 2 should have higher scores than chunk 3
    expect(score1).toBeGreaterThan(0)
    expect(score2).toBeGreaterThan(0)
    expect(score3).toBe(0) // No matching terms
  })

  it('should rank relevant chunks higher', () => {
    const index = buildLexicalIndex(testChunks)
    const chunksMap = new Map(testChunks.map((c) => [c.id, c]))

    const results = search('lazy dog', index, chunksMap, 10)

    expect(results.length).toBeGreaterThan(0)
    expect(results[0].score).toBeGreaterThan(0)

    // Results should be sorted by score descending
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
    }
  })

  it('should return topK results', () => {
    const index = buildLexicalIndex(testChunks)
    const chunksMap = new Map(testChunks.map((c) => [c.id, c]))

    const results = search('lazy dog', index, chunksMap, 1)

    expect(results.length).toBeLessThanOrEqual(1)
  })

  it('should handle queries with no matches', () => {
    const index = buildLexicalIndex(testChunks)
    const chunksMap = new Map(testChunks.map((c) => [c.id, c]))

    const results = search('nonexistent query terms', index, chunksMap, 10)

    expect(results.length).toBe(0)
  })

  it('should handle empty index', () => {
    const index = buildLexicalIndex([])

    expect(index.chunkIds).toHaveLength(0)
    expect(index.avgDocLength).toBe(0)
  })

  it('should give higher scores to documents with more term occurrences', () => {
    const chunks: Chunk[] = [
      {
        id: 'c1',
        docId: 'd1',
        pageNumber: 1,
        text: 'cat',
        startOffset: 0,
        endOffset: 3,
      },
      {
        id: 'c2',
        docId: 'd2',
        pageNumber: 1,
        text: 'cat cat cat',
        startOffset: 0,
        endOffset: 11,
      },
    ]

    const index = buildLexicalIndex(chunks)
    const score1 = computeBM25Score('cat', 'c1', index)
    const score2 = computeBM25Score('cat', 'c2', index)

    expect(score2).toBeGreaterThan(score1)
  })
})
