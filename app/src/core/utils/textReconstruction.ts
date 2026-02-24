import type { Chunk } from '../types'

/**
 * Reconstruct document text from chunks, handling overlaps intelligently
 */
export function reconstructTextFromChunks(chunks: Chunk[]): string {
  if (chunks.length === 0) {
    return ''
  }

  // Sort chunks by page number and offset
  const sortedChunks = [...chunks].sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) {
      return a.pageNumber - b.pageNumber
    }
    return a.startOffset - b.startOffset
  })

  let reconstructed = sortedChunks[0].text

  for (let i = 1; i < sortedChunks.length; i++) {
    const currentChunk = sortedChunks[i]
    const prevChunk = sortedChunks[i - 1]

    // If chunks are from different pages, just add a page break
    if (currentChunk.pageNumber !== prevChunk.pageNumber) {
      reconstructed += '\n\n' + currentChunk.text
      continue
    }

    // Find overlap between end of reconstructed text and start of current chunk
    const overlap = findOverlap(reconstructed, currentChunk.text)

    if (overlap > 0) {
      // Remove the overlapping part from current chunk and append
      const newContent = currentChunk.text.substring(overlap)
      if (newContent.trim()) {
        reconstructed += newContent
      }
    } else {
      // No overlap detected, add with spacing
      reconstructed += '\n\n' + currentChunk.text
    }
  }

  return reconstructed
}

/**
 * Find the longest overlap between the end of text1 and the start of text2
 * Returns the length of the overlap
 */
function findOverlap(text1: string, text2: string): number {
  // Start with larger overlaps and work down
  const maxOverlap = Math.min(text1.length, text2.length, 500) // Check up to 500 chars

  for (let overlapLen = maxOverlap; overlapLen >= 20; overlapLen--) {
    const endOfText1 = text1.substring(text1.length - overlapLen)
    const startOfText2 = text2.substring(0, overlapLen)

    if (endOfText1 === startOfText2) {
      return overlapLen
    }
  }

  // Try approximate matching for small differences (typos, whitespace)
  for (let overlapLen = 100; overlapLen >= 20; overlapLen--) {
    const endOfText1 = normalizeText(text1.substring(text1.length - overlapLen))
    const startOfText2 = normalizeText(text2.substring(0, overlapLen))

    if (endOfText1 === startOfText2) {
      return overlapLen
    }
  }

  return 0
}

/**
 * Normalize text for comparison (remove extra whitespace, lowercase)
 */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Format plain text (non-markdown) for better readability
 */
export function formatPlainText(text: string): string {
  // Split into paragraphs (double newlines)
  const paragraphs = text.split(/\n\s*\n/)

  return paragraphs
    .map(para => para.trim())
    .filter(para => para.length > 0)
    .join('\n\n')
}
