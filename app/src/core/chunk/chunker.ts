import type { Chunk, Page } from '../types'

export interface ChunkerConfig {
  chunkSize: number // in characters (approximate tokens * 4)
  overlapPercent: number // 0-100
}

export const DEFAULT_CONFIG: ChunkerConfig = {
  chunkSize: 400, // ~100 tokens (assuming ~4 chars per token)
  overlapPercent: 12, // 12% overlap
}

export function chunkPages(pages: Page[], config: ChunkerConfig = DEFAULT_CONFIG): Chunk[] {
  const chunks: Chunk[] = []
  let chunkIndex = 0

  for (const page of pages) {
    const pageChunks = chunkText(page.text, page.docId, page.pageNumber, chunkIndex, config)
    chunks.push(...pageChunks)
    chunkIndex += pageChunks.length
  }

  return chunks
}

export function chunkText(
  text: string,
  docId: string,
  pageNumber: number,
  startIndex: number,
  config: ChunkerConfig
): Chunk[] {
  if (!text.trim()) {
    return []
  }

  const { chunkSize, overlapPercent } = config
  const overlapSize = Math.floor(chunkSize * (overlapPercent / 100))
  const chunks: Chunk[] = []

  let position = 0
  let chunkId = startIndex

  while (position < text.length) {
    const end = Math.min(position + chunkSize, text.length)

    // Try to break at sentence boundary if possible
    let chunkEnd = end
    if (end < text.length) {
      const sentenceEnd = findSentenceBoundary(text, position, end)
      if (sentenceEnd > position) {
        chunkEnd = sentenceEnd
      }
    }

    const chunkText = text.slice(position, chunkEnd).trim()

    if (chunkText.length > 0) {
      const chunk: Chunk = {
        id: `${docId}-chunk-${chunkId}`,
        docId,
        pageNumber,
        text: chunkText,
        startOffset: position,
        endOffset: chunkEnd,
        tokens: estimateTokens(chunkText),
      }
      chunks.push(chunk)
      chunkId++
    }

    // Move position forward, accounting for overlap
    if (chunkEnd >= text.length) {
      break
    }

    position = chunkEnd - overlapSize
    if (position <= 0) position = chunkEnd
  }

  return chunks
}

function findSentenceBoundary(text: string, start: number, end: number): number {
  // Look for sentence-ending punctuation near the end
  const searchStart = Math.max(start, end - 100)
  const searchText = text.slice(searchStart, end)

  // Find last occurrence of sentence-ending punctuation
  const matches = Array.from(searchText.matchAll(/[.!?]\s+/g))
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1]
    if (lastMatch.index !== undefined) {
      return searchStart + lastMatch.index + 1
    }
  }

  // If no sentence boundary found, look for paragraph break
  const paragraphBreak = searchText.lastIndexOf('\n\n')
  if (paragraphBreak > 0) {
    return searchStart + paragraphBreak + 2
  }

  // Fall back to word boundary
  const spaceIndex = searchText.lastIndexOf(' ')
  if (spaceIndex > 0) {
    return searchStart + spaceIndex + 1
  }

  return end
}

function estimateTokens(text: string): number {
  // Rough approximation: ~4 characters per token
  // This is a simple heuristic and not exact
  return Math.ceil(text.length / 4)
}
