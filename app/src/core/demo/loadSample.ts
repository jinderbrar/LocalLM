/**
 * Load sample document on first use
 */

import { getAllDocs } from '../storage/db'
import { ingestDocument } from '../ingest/pipelineIngest'

const SAMPLE_DOC_KEY = 'demo-document-loaded'

/**
 * Check if sample document should be loaded (first time user)
 */
export async function shouldLoadSampleDoc(): Promise<boolean> {
  // Check if user has any documents
  const docs = await getAllDocs()

  // If no documents, clear the flag and load sample
  if (docs.length === 0) {
    localStorage.removeItem(SAMPLE_DOC_KEY)
    return true
  }

  // Check if we've already loaded the sample
  const alreadyLoaded = localStorage.getItem(SAMPLE_DOC_KEY)
  if (alreadyLoaded === 'true') {
    return false
  }

  return docs.length === 0
}

/**
 * Load the sample welcome document
 */
export async function loadSampleDocument(
  onProgress?: (stage: string, progress: number) => void
): Promise<void> {
  try {
    console.log('Loading sample document...')

    // Fetch the sample document from public folder
    const response = await fetch('/demo/welcome.md')
    if (!response.ok) {
      throw new Error('Failed to fetch sample document')
    }

    const content = await response.text()

    // Create a File object from the content
    const file = new File([content], 'Welcome to Local NotebookLM.md', {
      type: 'text/markdown',
    })

    // Ingest the document
    await ingestDocument(file, (stage, progress) => {
      console.log(`Sample doc: ${stage} - ${Math.round(progress * 100)}%`)
      onProgress?.(stage, progress)
    })

    // Mark as loaded
    localStorage.setItem(SAMPLE_DOC_KEY, 'true')
    console.log('✅ Sample document loaded successfully')
  } catch (error) {
    console.error('Failed to load sample document:', error)
    // Don't throw - fail gracefully
  }
}

/**
 * Reset sample document loading (for testing)
 */
export function resetSampleDocFlag(): void {
  localStorage.removeItem(SAMPLE_DOC_KEY)
}
