import * as pdfjsLib from 'pdfjs-dist'
import type { Doc, Page } from '../types'

// Set worker source for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export async function ingestPdfFile(file: File): Promise<{ doc: Doc; pages: Page[] }> {
  const docId = generateDocId(file)

  const doc: Doc = {
    id: docId,
    name: file.name,
    type: 'pdf',
    size: file.size,
    uploadedAt: Date.now(),
    status: {
      parsed: false,
      indexedLexical: false,
      indexedVector: false,
    },
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdfDoc = await loadingTask.promise

    const pages: Page[] = []

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum)
      const textContent = await page.getTextContent()

      // Extract text from text items
      const pageText = textContent.items
        .map((item) => {
          if ('str' in item) {
            return item.str
          }
          return ''
        })
        .join(' ')

      pages.push({
        docId,
        pageNumber: pageNum,
        text: pageText.trim(),
        metadata: {
          width: page.view[2],
          height: page.view[3],
        },
      })
    }

    doc.status.parsed = true
    return { doc, pages }
  } catch (error) {
    doc.status.error = error instanceof Error ? error.message : 'Failed to parse PDF'
    throw new Error(`PDF parsing failed: ${doc.status.error}`)
  }
}

function generateDocId(file: File): string {
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
