import { describe, it, expect } from 'vitest'
import { chunkText, DEFAULT_CONFIG } from './chunker'

describe('chunker', () => {
  it('should create chunks from text', () => {
    const text = 'This is a test. '.repeat(50) // ~750 chars
    const chunks = chunkText(text, 'doc1', 1, 0, DEFAULT_CONFIG)

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0].docId).toBe('doc1')
    expect(chunks[0].pageNumber).toBe(1)
  })

  it('should respect chunk size', () => {
    const text = 'a'.repeat(1000)
    const config = { chunkSize: 100, overlapPercent: 10 }
    const chunks = chunkText(text, 'doc1', 1, 0, config)

    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(config.chunkSize + 50) // +50 for boundary adjustments
    }
  })

  it('should create overlap between chunks', () => {
    const text = 'This is sentence one. This is sentence two. This is sentence three. This is sentence four.'
    const config = { chunkSize: 50, overlapPercent: 20 }
    const chunks = chunkText(text, 'doc1', 1, 0, config)

    if (chunks.length > 1) {
      // Check that consecutive chunks have some overlapping content
      const firstChunkEnd = chunks[0].text.slice(-20)
      const secondChunkStart = chunks[1].text.slice(0, 20)

      // Overlap should exist (not strict equality due to boundary adjustments)
      expect(chunks[1].startOffset).toBeLessThan(chunks[0].endOffset)
    }
  })

  it('should handle empty text', () => {
    const chunks = chunkText('', 'doc1', 1, 0, DEFAULT_CONFIG)
    expect(chunks).toHaveLength(0)
  })

  it('should handle single short text', () => {
    const text = 'Short text.'
    const chunks = chunkText(text, 'doc1', 1, 0, DEFAULT_CONFIG)

    expect(chunks).toHaveLength(1)
    expect(chunks[0].text).toBe(text)
  })

  it('should generate stable chunk IDs', () => {
    const text = 'a'.repeat(1000)
    const chunks = chunkText(text, 'doc123', 1, 0, DEFAULT_CONFIG)

    chunks.forEach((chunk, i) => {
      expect(chunk.id).toBe(`doc123-chunk-${i}`)
    })
  })

  it('should preserve offsets', () => {
    const text = 'First sentence. Second sentence. Third sentence.'
    const chunks = chunkText(text, 'doc1', 1, 0, { chunkSize: 20, overlapPercent: 10 })

    for (const chunk of chunks) {
      expect(chunk.startOffset).toBeGreaterThanOrEqual(0)
      expect(chunk.endOffset).toBeLessThanOrEqual(text.length)
      expect(chunk.endOffset).toBeGreaterThan(chunk.startOffset)
    }
  })

  it('should estimate tokens', () => {
    const text = 'This is a test.'
    const chunks = chunkText(text, 'doc1', 1, 0, DEFAULT_CONFIG)

    expect(chunks[0].tokens).toBeGreaterThan(0)
    expect(chunks[0].tokens).toBeLessThan(text.length) // tokens < chars
  })
})
