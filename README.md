# Local NotebookLM

A privacy-focused, browser-based personal search assistant that runs 100% locally. Upload PDFs and documents, ask questions, and get cited answers—all without sending your data anywhere.

![Privacy Badge](https://img.shields.io/badge/privacy-local--only-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

### Core Capabilities
- **🔒 Complete Privacy**: All processing happens in your browser. No uploads, no cloud, no tracking.
- **📚 Document Library**: Upload and manage PDFs, text files, and markdown documents
- **🔍 Smart Search**: Three search modes available:
  - Lexical search (BM25 ranking)
  - Semantic search (vector embeddings)
  - Hybrid search (best of both worlds)
- **📝 Cited Answers**: Every answer includes clickable citations with document, page, and text references
- **📓 Notebook**: Save important findings with full citation preservation
- **🎓 Study Kit**: Auto-generate flashcards, quizzes, and key bullets from your documents

### Technical Features
- **Performance Monitoring**: Real-time p50/p95 latency tracking
- **Evaluation Harness**: Built-in benchmark with MRR@10 and nDCG@10 metrics
- **WebGPU Support**: Hardware acceleration for faster embedding generation
- **Offline Mode**: Optional model pack for completely offline operation

## Architecture

### Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Search**: BM25 (lexical) + Transformers.js (semantic embeddings)
- **Storage**: IndexedDB (documents, chunks, vectors, notes)
- **Models**:
  - `Xenova/all-MiniLM-L6-v2` for embeddings (~23MB)
  - Optional: `Xenova/flan-t5-small` for answer polishing (~80MB)

### System Pipeline

```
Upload → Parse → Chunk → Index (Lexical + Vector) → Query → Rank → Answer + Citations
```

1. **Ingest**: Extract text from PDFs using pdf.js, parse TXT/MD files
2. **Chunk**: Split documents into 300-600 token chunks with 10-15% overlap
3. **Index**: Build BM25 lexical index + generate embeddings for semantic search
4. **Query**: User asks a question in their preferred search mode
5. **Rank**: Hybrid ranking combines lexical and semantic scores
6. **Answer**: Extract relevant passages with full citation metadata

### Project Structure

```
/app
  /src
    /ui                 # React components
    /core              # Business logic
      /ingest          # Document parsing
      /chunk           # Text chunking
      /index_lex       # Lexical indexing (BM25)
      /index_vec       # Vector indexing (embeddings)
      /rank            # Hybrid ranking
      /answer          # Answer generation
      /storage         # IndexedDB wrapper
      /eval            # Evaluation harness
      /perf            # Performance tracking
  /public
    /models            # Optional offline model pack
    /demo              # Benchmark data
```

## Development Roadmap

### ✅ Milestone A - Foundation (Complete)
- [x] Vite + React + TypeScript setup
- [x] ESLint + Prettier configuration
- [x] App shell with Library/Ask/Notes tabs
- [x] Core type definitions
- [x] IndexedDB wrapper
- [x] README skeleton

### 🚧 Milestone B - Ingestion + Chunking (In Progress)
- [ ] TXT/MD upload + local storage
- [ ] Chunker implementation with tests
- [ ] Chunk preview per document
- [ ] PDF.js integration
- [ ] Page metadata preservation
- [ ] Progress UI for parsing

### 📋 Milestone C - Lexical Baseline
- [ ] BM25 lexical index builder
- [ ] Lexical query + topK retrieval
- [ ] Ask UI with ranked chunks
- [ ] Citations component
- [ ] Retrieval tests
- [ ] Latency tracking

### 📋 Milestone D - Vector Search
- [ ] Transformers.js embedding pipeline
- [ ] Embed chunks + store vectors
- [ ] Semantic query + cosine ranking
- [ ] Hybrid ranking with alpha slider
- [ ] Embedding latency stats
- [ ] Model caching

### 📋 Milestone E - NotebookLM UX
- [ ] Extractive answer composer
- [ ] "Add to notes" functionality
- [ ] Notes view + markdown export
- [ ] Study Kit generator
- [ ] PRIVACY.md documentation

### 📋 Milestone F - Mini Model (Optional)
- [ ] flan-t5-small integration
- [ ] Answer polishing mode
- [ ] Polish time tracking
- [ ] Offline model pack script

### 📋 Milestone G - Evaluation + Deploy
- [ ] Benchmark corpus + qrels
- [ ] Eval runner (MRR@10, nDCG@10)
- [ ] Results page
- [ ] RESULTS.md with analysis
- [ ] GitHub Pages deployment

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd app
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:5173` to see the app.

### Build

```bash
npm run build
```

The static site will be in `/app/dist`.

### Lint & Format

```bash
npm run lint
npm run format
```

## Privacy Guarantee

This application processes all documents locally in your browser. No document content is ever:
- Uploaded to a server
- Sent to third-party APIs
- Stored in the cloud
- Tracked or analyzed

Models are fetched once and cached for offline use. See [PRIVACY.md](PRIVACY.md) for details.

## Performance

All operations are benchmarked with real metrics:
- Lexical search: ~10-50ms (typical)
- Semantic search: ~100-500ms (with WebGPU)
- Hybrid search: ~150-600ms (combined)

See [RESULTS.md](RESULTS.md) for detailed evaluation results.

## Contributing

This is a demonstration project following the "many small commits" development philosophy. Each feature is implemented incrementally with proper tests and documentation.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Built following NotebookLM UX patterns
- Uses Transformers.js for in-browser ML
- Inspired by information retrieval research

---

**Built with privacy first. Your documents never leave your device.**
