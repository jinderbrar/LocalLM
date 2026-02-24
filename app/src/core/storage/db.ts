import type { Doc, Chunk, Note } from '../types'

const DB_NAME = 'local-notebooklm'
const DB_VERSION = 2 // Incremented for file blobs store

// Object store names
export const STORES = {
  DOCS: 'docs',
  CHUNKS: 'chunks',
  VECTORS: 'vectors',
  NOTES: 'notes',
  LEXICAL_INDEX: 'lexical_index',
  METADATA: 'metadata',
  FILE_BLOBS: 'file_blobs', // Store original file blobs for preview
} as const

let dbInstance: IDBDatabase | null = null

export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('Failed to open database'))
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Docs store
      if (!db.objectStoreNames.contains(STORES.DOCS)) {
        const docStore = db.createObjectStore(STORES.DOCS, { keyPath: 'id' })
        docStore.createIndex('uploadedAt', 'uploadedAt', { unique: false })
      }

      // Chunks store
      if (!db.objectStoreNames.contains(STORES.CHUNKS)) {
        const chunkStore = db.createObjectStore(STORES.CHUNKS, { keyPath: 'id' })
        chunkStore.createIndex('docId', 'docId', { unique: false })
        chunkStore.createIndex('pageNumber', 'pageNumber', { unique: false })
      }

      // Vectors store (chunkId -> Float32Array)
      if (!db.objectStoreNames.contains(STORES.VECTORS)) {
        db.createObjectStore(STORES.VECTORS, { keyPath: 'chunkId' })
      }

      // Notes store
      if (!db.objectStoreNames.contains(STORES.NOTES)) {
        const noteStore = db.createObjectStore(STORES.NOTES, { keyPath: 'id' })
        noteStore.createIndex('createdAt', 'createdAt', { unique: false })
      }

      // Lexical index store
      if (!db.objectStoreNames.contains(STORES.LEXICAL_INDEX)) {
        db.createObjectStore(STORES.LEXICAL_INDEX)
      }

      // Metadata store (for system info, settings, etc.)
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA)
      }

      // File blobs store (for original PDF files)
      if (!db.objectStoreNames.contains(STORES.FILE_BLOBS)) {
        db.createObjectStore(STORES.FILE_BLOBS, { keyPath: 'docId' })
      }
    }
  })
}

// Generic CRUD operations

export async function get<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.get(key)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function put<T>(storeName: string, value: T, key?: string): Promise<void> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = key !== undefined ? store.put(value, key) : store.put(value)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function remove(storeName: string, key: string): Promise<void> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(key)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function clear(storeName: string): Promise<void> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.clear()

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getByIndex<T>(
  storeName: string,
  indexName: string,
  key: string | number
): Promise<T[]> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index(indexName)
    const request = index.getAll(key)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Specialized functions for common operations

export async function saveDoc(doc: Doc): Promise<void> {
  return put(STORES.DOCS, doc)
}

export async function getDoc(id: string): Promise<Doc | undefined> {
  return get<Doc>(STORES.DOCS, id)
}

export async function getAllDocs(): Promise<Doc[]> {
  return getAll<Doc>(STORES.DOCS)
}

export async function deleteDoc(id: string): Promise<void> {
  // Delete doc and all associated chunks, vectors, and file blob
  await remove(STORES.DOCS, id)
  await deleteFileBlob(id) // Delete the original file blob
  const chunks = await getChunksByDocId(id)
  for (const chunk of chunks) {
    await remove(STORES.CHUNKS, chunk.id)
    await remove(STORES.VECTORS, chunk.id)
  }
}

export async function saveChunk(chunk: Chunk): Promise<void> {
  return put(STORES.CHUNKS, chunk)
}

export async function getChunk(id: string): Promise<Chunk | undefined> {
  return get<Chunk>(STORES.CHUNKS, id)
}

export async function getChunksByDocId(docId: string): Promise<Chunk[]> {
  return getByIndex<Chunk>(STORES.CHUNKS, 'docId', docId)
}

export async function getAllChunks(): Promise<Chunk[]> {
  return getAll<Chunk>(STORES.CHUNKS)
}

export async function saveVector(chunkId: string, embedding: Float32Array): Promise<void> {
  return put(STORES.VECTORS, { chunkId, embedding })
}

export async function getVector(chunkId: string): Promise<Float32Array | undefined> {
  const result = await get<{ chunkId: string; embedding: Float32Array }>(STORES.VECTORS, chunkId)
  return result?.embedding
}

export async function saveNote(note: Note): Promise<void> {
  return put(STORES.NOTES, note)
}

export async function getNote(id: string): Promise<Note | undefined> {
  return get<Note>(STORES.NOTES, id)
}

export async function getAllNotes(): Promise<Note[]> {
  return getAll<Note>(STORES.NOTES)
}

export async function deleteNote(id: string): Promise<void> {
  return remove(STORES.NOTES, id)
}

// File blob operations (for PDF preview)
export async function saveFileBlob(docId: string, blob: Blob): Promise<void> {
  return put(STORES.FILE_BLOBS, { docId, blob })
}

export async function getFileBlob(docId: string): Promise<Blob | undefined> {
  const result = await get<{ docId: string; blob: Blob }>(STORES.FILE_BLOBS, docId)
  return result?.blob
}

export async function deleteFileBlob(docId: string): Promise<void> {
  return remove(STORES.FILE_BLOBS, docId)
}

export async function resetLibrary(): Promise<void> {
  await clear(STORES.DOCS)
  await clear(STORES.CHUNKS)
  await clear(STORES.VECTORS)
  await clear(STORES.LEXICAL_INDEX)
  await clear(STORES.FILE_BLOBS)
}

export async function resetAll(): Promise<void> {
  await resetLibrary()
  await clear(STORES.NOTES)
  await clear(STORES.METADATA)
}
