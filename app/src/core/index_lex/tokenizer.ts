// Simple tokenizer for BM25 indexing

export function tokenize(text: string): string[] {
  // Convert to lowercase and split on non-alphanumeric characters
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .filter((token) => !isStopWord(token))
}

// Common English stop words
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'that',
  'the',
  'to',
  'was',
  'will',
  'with',
])

function isStopWord(token: string): boolean {
  return STOP_WORDS.has(token)
}

export function computeTermFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()

  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1)
  }

  return tf
}
