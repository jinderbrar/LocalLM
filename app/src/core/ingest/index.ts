import type { Doc, Page } from '../types'
import { ingestTextFile } from './text'
import { ingestPdfFile } from './pdf'

export interface IngestResult {
  doc: Doc
  pages: Page[]
}

export async function ingestFile(file: File): Promise<IngestResult> {
  const fileType = getFileType(file)

  switch (fileType) {
    case 'txt':
    case 'md':
      return ingestTextFile(file)
    case 'pdf':
      return ingestPdfFile(file)
    default:
      throw new Error(`Unsupported file type: ${file.name}`)
  }
}

function getFileType(file: File): 'txt' | 'md' | 'pdf' | 'unknown' {
  const name = file.name.toLowerCase()
  if (name.endsWith('.txt')) return 'txt'
  if (name.endsWith('.md')) return 'md'
  if (name.endsWith('.pdf')) return 'pdf'
  return 'unknown'
}

export function isFileSupported(file: File): boolean {
  const type = getFileType(file)
  return type === 'txt' || type === 'md' || type === 'pdf'
}
