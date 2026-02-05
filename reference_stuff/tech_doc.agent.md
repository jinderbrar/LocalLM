## Tech Doc: **Local NotebookLM (100% local personal search + cited answers)**

### TL;DR (what you’re building)

A **static GitHub Pages app** that ingests PDFs/notes locally, builds **lexical + vector indexes in-browser**, and answers questions with **citations** + “notes” + “study kit”. Optional **≤100MB local mini-model** to *polish* summaries (not required).

This is **NotebookLM-like UX** with **real IR/ML engineering**: baselines, eval, latency, and privacy.

---

## 0) Product definition

### Goals

* **Local-only data**: user documents never leave the browser.
* **Search-first**: lexical baseline + semantic retrieval + hybrid ranking.
* **Cited answers**: every answer has clickable citations to source chunks.
* **Notebook UX**: notes, highlights, auto-brief, study kit, export.
* **Engineer-credible**: includes evaluation harness + perf metrics.

### Non-goals (v1)

* OCR for scanned PDFs (later).
* Multi-user sync / cloud storage.
* Full “big LLM reasoning” (100MB cap won’t match server LLMs).

### “Local” definition (be precise)

* The app runs on the client; **no document content is uploaded**.
* Models may be fetched once (same-origin or from model host), then cached.
* Offer “**Offline Pack**” option: bundle model files in `public/models/` so the demo runs without third-party network after first load.

---

## 1) UX spec (NotebookLM vibe)

### Main screens

1. **Library**

   * Upload: PDF / TXT / MD (drag-drop)
   * Document list: status badges (Parsed, Indexed-Lexical, Indexed-Vector)
   * “Reindex” button

2. **Ask**

   * Query box + mode toggle:

     * Lexical (BM25/TF-IDF)
     * Semantic (embeddings)
     * Hybrid (weighted)
   * Answer panel:

     * “Answer” (extractive by default)
     * “Sources” list with citations (doc, page, chunk)
     * “Add to notes” for selected text

3. **Notes**

   * Notebook cards (each card includes citations)
   * Export as Markdown (citations preserved)

4. **Study Kit**

   * From selected doc(s):

     * “Key bullets”
     * “Flashcards”
     * “Quiz (Q/A)”
   * Default: extractive + templated.
   * Optional: “Polish with mini-model”.

### Must-have UI polish (recruiter clickbait)

* Show **p50/p95 latency** after each query (toggle “Perf”).
* Show **Eval scorecard** (MRR@10, nDCG@10) on a built-in tiny benchmark.
* “Privacy badge”: “Local-only (no uploads)”.

---

## 2) System architecture (static site, no backend)

### Pipeline overview

1. **Ingest**

   * PDFs: use `pdfjs-dist` to extract text per page (best effort).
   * TXT/MD: read as text.
   * Normalize text + keep metadata (doc id, page, offsets).

2. **Chunk**

   * Chunk size: 300–600 tokens-ish (or chars approximation), overlap ~10–15%.
   * Store: `chunk_id`, `doc_id`, `page`, `text`, `span`.

3. **Index**

   * Lexical: BM25 / TF-IDF index over chunk texts.
   * Vector: embedding per chunk; store Float32Array.

4. **Query**

   * Compute:

     * lexical score
     * semantic cosine similarity score
   * **Hybrid rank**: `final = α * semantic + (1-α) * lexical`
   * Retrieve top K chunks.

5. **Answer + citations**

   * Default: extractive synthesis (bullet answer from top chunks).
   * Optional “Polish”: run mini text2text model to rewrite the extracted bullets.

### Storage

* Use **IndexedDB** for:

  * docs
  * chunks
  * lexical index data
  * vectors (store as ArrayBuffer)
  * cached model files (optional)
* Provide “Reset library” button.

---

## 3) Model choices (fits your constraints)

### Embeddings (recommended)

* Use Transformers.js `feature-extraction` with **Xenova/all-MiniLM-L6-v2** (fast, popular for embeddings in browser). ([Hugging Face][1])
* Enable GPU where available via `device: 'webgpu'` (fallback to WASM). ([Hugging Face][2])

### Optional mini “polish” model (≤100MB)

* `Xenova/flan-t5-small` ONNX-compatible with Transformers.js (use for short summaries / rewrite). ([Hugging Face][3])
* Be honest in README: “Used for rewriting extracted notes; retrieval is the main engine.”

### Runtime

* Transformers.js runs ONNX models in-browser and supports WebGPU; it collaborates with ONNX Runtime Web under the hood. ([Hugging Face][2])
* If you ever want direct ONNX execution, ONNX Runtime Web docs show the standard web flow. ([ONNX Runtime][4])

---

## 4) Constraints you must respect (GitHub Pages reality)

* GitHub blocks files larger than **100 MiB** in a repo (use LFS if needed, but avoid for this project). ([GitHub Docs][5])
* GitHub Pages published site size **≤ 1 GB** and soft bandwidth **100 GB/month**. ([GitHub Docs][6])

**Practical rule:** keep models under ~80–90MB, keep demo data small.

---

## 5) Evaluation spec (this is what makes it “real”)

### Built-in mini benchmark (ship inside repo)

Create:

* `data/benchmark/docs.json` (20–50 short docs)
* `data/benchmark/qrels.json`:

  * list of queries with relevant chunk ids (top 1–3 relevant per query)

Metrics:

* **MRR@10**
* **nDCG@10**
* Query latency: p50/p95 for:

  * embedding time
  * retrieval time
  * total time

Also include:

* “Robustness”: run queries with 10% typos; report delta in MRR/nDCG.

Output:

* `RESULTS.md` with:

  * lexical vs semantic vs hybrid table
  * latency table
  * 3 failure cases (short explanations)

---

## 6) PDF extraction notes (avoid surprises)

* Use `pdfjs-dist` `getTextContent()` per page; extraction can be imperfect on some PDFs, so document limitations and provide fallback UX (“copy/paste text” import). ([Nutrient][7])

---

# 7) Repo structure (clean + scalable)

```
/app
  /public
    /models            # optional offline model pack (kept under ~90MB)
    /demo              # tiny benchmark docs + qrels
  /src
    /ui
    /core
      ingest/
      chunk/
      index_lex/
      index_vec/
      rank/
      answer/
      storage/
      eval/
      perf/
  package.json
  vite.config.ts

README.md
RESULTS.md
PRIVACY.md
```

---

# 8) “Human-looking” development plan (many small commits)

## Commit rules (tell your agent)

* Each commit = **one concept**. No mega commits.
* Commit message format:

  * `feat: ...`
  * `chore: ...`
  * `refactor: ...`
  * `test: ...`
  * `docs: ...`
* Every 3–5 commits: a small refactor + README touch (looks human).

---

## Milestones + suggested commit sequence

### Milestone A — Foundation (6–10 commits)

1. `chore: init vite + react + typescript`
2. `chore: add eslint/prettier + basic folder layout`
3. `feat: add app shell (Library / Ask / Notes tabs)`
4. `feat: define core types (Doc, Page, Chunk, Citation)`
5. `feat: add IndexedDB wrapper + basic CRUD`
6. `docs: add README skeleton + roadmap`
7. `chore: add github actions (lint + build)`

**DoD:** app runs, navigation works, IndexedDB saves/reloads dummy docs.

---

### Milestone B — Ingestion + chunking (8–12 commits)

8. `feat: add txt/md upload + local storage`
9. `feat: implement chunker (size + overlap) with tests`
10. `feat: show chunk preview per document`
11. `feat: add pdfjs-dist ingestion (per-page extraction)`
12. `fix: preserve page metadata + stable doc ids`
13. `feat: progress UI for parsing + cancel button`
14. `docs: document pdf limitations + fallback import`

**DoD:** you can upload PDFs and see chunks with page numbers.

---

### Milestone C — Lexical baseline (8–12 commits)

15. `feat: add lexical index builder (tf-idf or bm25)`
16. `feat: lexical query + topK chunks`
17. `feat: Ask UI shows ranked chunks + snippets`
18. `feat: citations component (doc + page + chunk)`
19. `test: add retrieval tests on demo corpus`
20. `perf: add timers (p50/p95) for lexical queries`

**DoD:** lexical search works and shows citations + latency.

---

### Milestone D — Vector search (10–16 commits)

21. `feat: add transformers.js embedding pipeline (MiniLM)`
22. `feat: embed chunks + store vectors in IndexedDB`
23. `feat: semantic query embedding + cosine ranking`
24. `feat: hybrid ranking alpha slider`
25. `perf: add embedding + total query latency stats`
26. `fix: caching + warmup to reduce first-query latency`
27. `docs: add model download/caching explanation`

**DoD:** semantic + hybrid search works; shows measurable perf.

---

### Milestone E — NotebookLM-like answer UX (8–14 commits)

28. `feat: extractive answer composer (bullets + citations)`
29. `feat: add "Add to notes" with citations`
30. `feat: Notes view + markdown export`
31. `feat: Study Kit generator (template-based)`
32. `docs: PRIVACY.md local-only guarantee + caveats`

**DoD:** users can ask, get an answer, save notes, export.

---

### Milestone F — Optional mini model (6–12 commits)

33. `feat: add optional flan-t5-small polish mode`
34. `feat: rewrite extracted bullets into cleaner summary`
35. `perf: add “polish time” + token limit safeguards`
36. `feat: offline model pack script (download to /public/models)`
37. `docs: explain offline pack + size constraints (GitHub limits)`

**DoD:** “Polish” toggle works; still stable without it.

---

### Milestone G — Evaluation + publish (6–10 commits)

38. `feat: add benchmark corpus + qrels`
39. `feat: eval runner (MRR@10, nDCG@10, typo robustness)`
40. `feat: results page + export results.json`
41. `docs: RESULTS.md with tables + failure cases`
42. `chore: deploy to GitHub Pages`

**DoD:** live demo + scorecard + GIF + reproducible eval.

---

## 9) Agent prompt (copy/paste)

Use this with your coding agent to keep work incremental:

* Implement **Milestone A commits 1–7** one by one.
* For each commit:

  * produce code + minimal tests (where relevant)
  * update README briefly
  * do not refactor unrelated areas
* Keep diffs small, avoid “rewrite everything”.
* Prefer pure functions in `/core`, UI in `/ui`.

---

## 10) MVP “wow” checklist (what recruiters notice)

* ✅ Live demo link (GitHub Pages)
* ✅ “Local-only, no uploads” statement + PRIVACY.md
* ✅ Scorecard: lexical vs semantic vs hybrid
* ✅ Latency stats (p50/p95) + WebGPU toggle
* ✅ GIF: upload PDF → ask → citations → save note → export

---

## May be helpful resource

[1]: https://huggingface.co/Xenova/all-MiniLM-L6-v2?utm_source=chatgpt.com "Xenova/all-MiniLM-L6-v2"
[2]: https://huggingface.co/docs/transformers.js/en/guides/webgpu?utm_source=chatgpt.com "Running models on WebGPU"
[3]: https://huggingface.co/Xenova/flan-t5-small?utm_source=chatgpt.com "Xenova/flan-t5-small"
[4]: https://onnxruntime.ai/docs/tutorials/web/?utm_source=chatgpt.com "Web | onnxruntime"
[5]: https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github?utm_source=chatgpt.com "About large files on GitHub"
[6]: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits?utm_source=chatgpt.com "GitHub Pages limits"
[7]: https://www.nutrient.io/blog/how-to-extract-text-from-a-pdf-using-javascript/?utm_source=chatgpt.com "Extract text from PDF files using PDF.js and JavaScript"
