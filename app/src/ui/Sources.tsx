import { useState, useEffect, useRef } from 'react'
import { MarkdownPreview } from '@/components/MarkdownPreview'
import { PDFPreview } from '@/components/PDFPreview'
import { ingestFile, isFileSupported } from '../core/ingest'
import { saveDoc, getAllDocs, saveChunk, getChunksByDocId, deleteDoc, getDoc, saveFileBlob, getFileBlob } from '../core/storage/db'
import { reconstructTextFromChunks } from '../core/utils/textReconstruction'
import type { Doc } from '../core/types'
import { chunkPages } from '../core/chunk/chunker'
import { rebuildLexicalIndex } from '../core/rank'
import { buildVectorIndex } from '../core/index_vec'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  const [previewDoc, setPreviewDoc] = useState<{ name: string; content: string; type: Doc['type']; blob?: Blob } | null>(null)
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

        // Save original file blob for PDF preview
        if (doc.type === 'pdf') {
          await saveFileBlob(doc.id, file)
        }

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

  async function handlePreviewDocument(docId: string) {
    try {
      console.log('📄 Loading preview for docId:', docId)
      const doc = await getDoc(docId)
      if (!doc) {
        console.error('Document not found:', docId)
        setError('Document not found')
        return
      }

      console.log('📄 Document found:', doc.name, 'type:', doc.type)

      // For PDFs, try to load the original file blob
      if (doc.type === 'pdf') {
        const blob = await getFileBlob(docId)
        if (blob) {
          console.log('📄 Loaded PDF blob')
          setPreviewDoc({
            name: doc.name,
            content: '', // Not used for PDF
            type: doc.type,
            blob
          })
          return
        }
        console.log('⚠️ PDF blob not found, falling back to text')
      }

      // Get all chunks for this document to reconstruct the text
      const chunks = await getChunksByDocId(docId)
      console.log(`📄 Loaded ${chunks.length} chunks`)

      // Reconstruct text with intelligent overlap handling
      const content = reconstructTextFromChunks(chunks)
      console.log(`📄 Reconstructed ${content.length} characters`)

      setPreviewDoc({
        name: doc.name,
        content: content || 'No content available',
        type: doc.type
      })
    } catch (error) {
      console.error('Failed to load document:', error)
      setError('Failed to load document preview')
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-shrink-0 flex-col gap-3 border-b p-4">
        <h2 className="text-lg font-semibold">Sources</h2>
        <Button onClick={handleAddSourceClick} disabled={uploading} className="w-full" size="sm">
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
                'group relative p-4 transition-colors hover:bg-accent/50 cursor-pointer hover:border-primary',
                'flex gap-3'
              )}
              onClick={(e) => {
                console.log('Document card clicked:', doc.id, doc.name)
                handlePreviewDocument(doc.id)
              }}
              title="Click to preview document"
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
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteDoc(doc.id, doc.name)
                }}
                title="Delete document"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {previewDoc?.name}
            </DialogTitle>
            <DialogDescription>
              Full document preview
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            {previewDoc?.type === 'pdf' && previewDoc?.blob ? (
              <PDFPreview blob={previewDoc.blob} />
            ) : previewDoc?.type === 'md' ? (
              <div className="p-4 bg-muted/30 rounded-lg">
                <MarkdownPreview content={previewDoc?.content || ''} />
              </div>
            ) : (
              <div className="p-4 bg-muted/30 rounded-lg whitespace-pre-wrap font-sans text-sm leading-7 text-foreground">
                {previewDoc?.content.split('\n\n').map((para, idx) => (
                  <p key={idx} className="mb-4">
                    {para.trim()}
                  </p>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDoc(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
