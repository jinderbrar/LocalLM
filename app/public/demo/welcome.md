# Welcome to Local NotebookLM

Local NotebookLM is a privacy-focused document search assistant that runs entirely in your browser. Unlike cloud-based services, all your documents and searches stay completely private on your device. No uploads, no tracking, no data leaving your computer.

## Key Features

### Privacy First
All processing happens locally using WebAssembly and browser-based machine learning models. Your documents never leave your device, and no data is sent to any servers.

### Smart Search
The app uses semantic search powered by embedding models to understand the meaning of your questions, not just keyword matching. This means you can ask natural questions and get relevant answers even if the exact words don't appear in your documents.

### Document Support
Currently supports:
- PDF files with text extraction
- Markdown documents (.md)
- Plain text files (.txt)

### How It Works

1. **Upload Documents**: Add your PDFs, text files, or markdown documents using the Sources panel
2. **Automatic Processing**: Documents are parsed, chunked into smaller sections, and indexed for fast searching
3. **Ask Questions**: Type natural language questions about your documents
4. **Get Cited Answers**: Receive answers extracted directly from your documents with source citations

## Example Questions to Try

- "What are the key features of this application?"
- "How does the search work?"
- "What types of documents are supported?"
- "Is my data private?"

## Technical Details

### Architecture
- **Frontend**: React with TypeScript and Vite
- **Search**: BM25 lexical search + semantic embeddings
- **Storage**: IndexedDB for documents and vectors
- **ML Models**: Transformers.js running in-browser

### Models Used
- **Embeddings**: all-MiniLM-L6-v2 (~23MB) for semantic search
- **Extraction**: Simple text extraction from top relevant chunks

### Performance
All operations are optimized for speed:
- Document parsing: ~1-2 seconds per document
- Embedding generation: ~100-300ms per chunk
- Search queries: ~50-200ms typical response time

## Privacy Guarantee

This application processes all documents locally in your browser. No document content is ever:
- Uploaded to a server
- Sent to third-party APIs
- Stored in the cloud
- Tracked or analyzed

Models are fetched once from Hugging Face and cached in your browser for offline use. After the initial download, the app works completely offline.

## Getting Started

Ready to try it out? You can:

1. Keep this sample document and ask questions about it
2. Upload your own documents using the Sources panel
3. Paste text directly using the "Paste Text" button

Try asking: "What models does this app use?" or "How is my privacy protected?"
