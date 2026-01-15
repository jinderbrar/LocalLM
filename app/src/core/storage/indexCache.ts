import type { LexicalIndex } from '../types'
import { get, put, STORES } from './db'

const INDEX_KEY = 'lexical_index'

export async function saveLexicalIndex(index: LexicalIndex): Promise<void> {
  // Convert Maps to objects for serialization
  const serializable = {
    docFreq: Array.from(index.docFreq.entries()),
    termFreq: Array.from(index.termFreq.entries()).map(([chunkId, tf]) => [
      chunkId,
      Array.from(tf.entries()),
    ]),
    chunkIds: index.chunkIds,
    avgDocLength: index.avgDocLength,
  }

  await put(STORES.LEXICAL_INDEX, serializable, INDEX_KEY)
}

export async function loadLexicalIndex(): Promise<LexicalIndex | null> {
  const stored = await get<any>(STORES.LEXICAL_INDEX, INDEX_KEY)

  if (!stored) return null

  // Reconstruct Maps from serialized data
  const docFreq = new Map(stored.docFreq)
  const termFreq = new Map(
    stored.termFreq.map(([chunkId, tf]: [string, [string, number][]]) => [
      chunkId,
      new Map(tf),
    ])
  )

  return {
    docFreq,
    termFreq,
    chunkIds: stored.chunkIds,
    avgDocLength: stored.avgDocLength,
  }
}
