import { useState, useEffect, useRef } from 'react'
import { ingestFile, isFileSupported } from '../core/ingest'
import { saveDoc, getAllDocs, saveChunk, getChunksByDocId, deleteDoc } from '../core/storage/db'
import { chunkPages } from '../core/chunk/chunker'
import { rebuildLexicalIndex } from '../core/rank'
import { buildVectorIndex } from '../core/index_vec'
import type { Doc } from '../core/types'
import './Sources.css'

function Sources() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [chunkCounts, setChunkCounts] = useState<Record<string, number>>({})
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{
    fileName: string
    stage: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    loadDocs()
  }, [])

  async function loadDocs() {
    try {
      const allDocs = await getAllDocs()
      setDocs(allDocs.sort((a, b) => b.uploadedAt - a.uploadedAt))

      // Load chunk counts for each document
      const counts: Record<string, number> = {}
      for (const doc of allDocs) {
        const chunks = await getChunksByDocId(doc.id)
        counts[doc.id] = chunks.length
      }
      setChunkCounts(counts)
    } catch (err) {
      console.error('Failed to load documents:', err)
    }
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    setError(null)
    setUploading(true)
    abortControllerRef.current = new AbortController()

    try {
      for (const file of Array.from(files)) {
        if (abortControllerRef.current?.signal.aborted) {
          break
        }

        if (!isFileSupported(file)) {
          setError(`Unsupported file: ${file.name}`)
          continue
        }

        setUploadProgress({ fileName: file.name, stage: 'Parsing...' })
        const { doc, pages } = await ingestFile(file)

        if (abortControllerRef.current?.signal.aborted) {
          break
        }

        setUploadProgress({ fileName: file.name, stage: 'Saving...' })
        await saveDoc(doc)

        setUploadProgress({ fileName: file.name, stage: 'Chunking...' })
        const chunks = chunkPages(pages)

        setUploadProgress({ fileName: file.name, stage: 'Saving chunks...' })
        for (const chunk of chunks) {
          await saveChunk(chunk)
        }

        setUploadProgress({
          fileName: file.name,
          stage: `Generating embeddings (${chunks.length} chunks)...`,
        })
        // Pre-compute vector embeddings for all chunks
        await buildVectorIndex(chunks)

        // Update doc status
        doc.status.indexedLexical = false
        doc.status.indexedVector = true // Mark vector embeddings as generated
        await saveDoc(doc)
      }

      // Rebuild lexical index for all documents
      setUploadProgress({ fileName: 'all documents', stage: 'Building search index...' })
      await rebuildLexicalIndex()

      // Update all docs to mark them as indexed
      const allDocs = await getAllDocs()
      for (const doc of allDocs) {
        if (!doc.status.indexedLexical) {
          doc.status.indexedLexical = true
          await saveDoc(doc)
        }
      }

      await loadDocs()
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Upload cancelled')
      } else {
        setError(err instanceof Error ? err.message : 'Upload failed')
      }
    } finally {
      setUploading(false)
      setUploadProgress(null)
      abortControllerRef.current = null
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function handleCancelUpload() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  function handleAddSourceClick() {
    fileInputRef.current?.click()
  }

  async function handleDeleteDoc(docId: string, docName: string) {
    if (!confirm(`Delete "${docName}"? This will remove all associated chunks and index data.`)) {
      return
    }

    try {
      await deleteDoc(docId)
      await rebuildLexicalIndex() // Rebuild index after deletion
      await loadDocs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document')
    }
  }

  return (
    <div className="sources">
      <div className="sources-header">
        <h2>Sources</h2>
        <div className="sources-actions">
          <button className="btn btn-primary" onClick={handleAddSourceClick} disabled={uploading}>
            {uploading ? '⏳ Uploading...' : '+ Add source'}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.pdf"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {uploadProgress && (
        <div className="progress-message">
          <div className="progress-content">
            <div className="progress-spinner">⏳</div>
            <div>
              <div className="progress-file">{uploadProgress.fileName}</div>
              <div className="progress-stage">{uploadProgress.stage}</div>
            </div>
          </div>
          <button className="btn-cancel" onClick={handleCancelUpload}>
            Cancel
          </button>
        </div>
      )}

      {docs.length === 0 ? (
        <div className="sources-empty">
          <div className="empty-icon">📄</div>
          <p className="empty-title">No sources yet</p>
          <p className="empty-subtitle">
            Upload PDFs, text files, or markdown documents to get started
          </p>
        </div>
      ) : (
        <div className="docs-list">
          {docs.map((doc) => (
            <div key={doc.id} className="doc-card">
              <div className="doc-icon">{getDocIcon(doc.type)}</div>
              <div className="doc-info">
                <h3 className="doc-name">{doc.name}</h3>
                <p className="doc-meta">
                  {formatFileSize(doc.size)} • {formatDate(doc.uploadedAt)}
                  {chunkCounts[doc.id] > 0 && ` • ${chunkCounts[doc.id]} chunks`}
                </p>
                <div className="doc-status">
                  <span className={`status-badge ${doc.status.parsed ? 'success' : 'pending'}`}>
                    {doc.status.parsed ? '✓' : '○'} Parsed
                  </span>
                  <span
                    className={`status-badge ${doc.status.indexedLexical ? 'success' : 'pending'}`}
                  >
                    {doc.status.indexedLexical ? '✓' : '○'} Lexical
                  </span>
                  <span
                    className={`status-badge ${doc.status.indexedVector ? 'success' : 'pending'}`}
                  >
                    {doc.status.indexedVector ? '✓' : '○'} Vector
                  </span>
                </div>
              </div>
              <button
                className="doc-delete-btn"
                onClick={() => handleDeleteDoc(doc.id, doc.name)}
                title="Delete document"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function getDocIcon(type: string): string {
  switch (type) {
    case 'pdf':
      return '📕'
    case 'md':
      return '📘'
    case 'txt':
      return '📄'
    default:
      return '📄'
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default Sources
