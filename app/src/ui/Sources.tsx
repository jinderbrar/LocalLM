import { useState, useEffect, useRef } from 'react'
import { ingestFile, isFileSupported } from '../core/ingest'
import { saveDoc, getAllDocs, saveChunk, getChunksByDocId, deleteDoc } from '../core/storage/db'
import { chunkPages } from '../core/chunk/chunker'
import { rebuildLexicalIndex } from '../core/rank'
import { buildVectorIndex } from '../core/index_vec'
import type { Doc } from '../core/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { FileText, FileCode, File, Loader2, X, Trash2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

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
        if (abortControllerRef.current?.signal.aborted) break

        if (!isFileSupported(file)) {
          setError(`Unsupported file: ${file.name}`)
          continue
        }

        setUploadProgress({ fileName: file.name, stage: 'Parsing...' })
        const { doc, pages } = await ingestFile(file)

        if (abortControllerRef.current?.signal.aborted) break

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
        await buildVectorIndex(chunks)

        doc.status.indexedLexical = false
        doc.status.indexedVector = true
        await saveDoc(doc)
      }

      setUploadProgress({ fileName: 'all documents', stage: 'Building search index...' })
      await rebuildLexicalIndex()

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
    abortControllerRef.current?.abort()
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
      await rebuildLexicalIndex()
      await loadDocs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document')
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b p-4">
        <h2 className="text-lg font-semibold">Sources</h2>
        <Button onClick={handleAddSourceClick} disabled={uploading} className="w-full">
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add source
            </>
          )}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.pdf"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Error Alert */}
      {error && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setError(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress && (
        <div className="border-b p-4">
          <Card className="p-4">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div>
                  <p className="font-medium">{uploadProgress.fileName}</p>
                  <p className="text-sm text-muted-foreground">{uploadProgress.stage}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCancelUpload}>
                Cancel
              </Button>
            </div>
            <Progress value={undefined} className="h-1" />
          </Card>
        </div>
      )}

      {/* Documents List */}
      {docs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="mb-4 text-6xl opacity-20">📄</div>
          <h3 className="mb-2 font-semibold">No sources yet</h3>
          <p className="text-sm text-muted-foreground">
            Upload PDFs, text files, or markdown documents to get started
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {docs.map((doc) => (
            <Card
              key={doc.id}
              className={cn(
                'group relative p-4 transition-colors hover:bg-accent/50',
                'flex gap-3'
              )}
            >
              <div className="flex-shrink-0 text-2xl">{getDocIcon(doc.type)}</div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-medium">{doc.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(doc.size)} • {formatDate(doc.uploadedAt)}
                  {chunkCounts[doc.id] > 0 && ` • ${chunkCounts[doc.id]} chunks`}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge
                    variant={doc.status.parsed ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {doc.status.parsed ? '✓' : '○'} Parsed
                  </Badge>
                  <Badge
                    variant={doc.status.indexedLexical ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {doc.status.indexedLexical ? '✓' : '○'} Lexical
                  </Badge>
                  <Badge
                    variant={doc.status.indexedVector ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {doc.status.indexedVector ? '✓' : '○'} Vector
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => handleDeleteDoc(doc.id, doc.name)}
                title="Delete document"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function getDocIcon(type: string) {
  switch (type) {
    case 'pdf':
      return <FileText className="h-6 w-6 text-red-500" />
    case 'md':
      return <FileCode className="h-6 w-6 text-blue-500" />
    case 'txt':
      return <File className="h-6 w-6 text-gray-500" />
    default:
      return <File className="h-6 w-6" />
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
