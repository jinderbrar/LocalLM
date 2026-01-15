import type { Doc, Page } from '../types'

export async function ingestTextFile(file: File): Promise<{ doc: Doc; pages: Page[] }> {
  const text = await file.text()
  const docId = generateDocId(file)

  const doc: Doc = {
    id: docId,
    name: file.name,
    type: file.name.endsWith('.md') ? 'md' : 'txt',
    size: file.size,
    uploadedAt: Date.now(),
    status: {
      parsed: true,
      indexedLexical: false,
      indexedVector: false,
    },
  }

  // For text files, treat entire content as one "page"
  const pages: Page[] = [
    {
      docId,
      pageNumber: 1,
      text: text.trim(),
    },
  ]

  return { doc, pages }
}

function generateDocId(file: File): string {
  // Generate stable ID based on filename, size, and timestamp
  const timestamp = Date.now()
  const hash = simpleHash(`${file.name}-${file.size}-${timestamp}`)
  return `doc-${hash}`
}

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}
