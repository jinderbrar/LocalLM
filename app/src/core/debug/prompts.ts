/**
 * Custom prompt templates storage and management
 */

const STORAGE_KEY_PREFIX = 'custom_prompt_'

export type PromptType = 'generation' | 'polish'

/**
 * Get custom prompt template from localStorage
 */
export function getCustomPrompt(type: PromptType): string | null {
  const key = `${STORAGE_KEY_PREFIX}${type}`
  return localStorage.getItem(key)
}

/**
 * Save custom prompt template to localStorage
 */
export function saveCustomPrompt(type: PromptType, template: string): void {
  const key = `${STORAGE_KEY_PREFIX}${type}`
  localStorage.setItem(key, template)
}

/**
 * Reset prompt to default (remove custom)
 */
export function resetCustomPrompt(type: PromptType): void {
  const key = `${STORAGE_KEY_PREFIX}${type}`
  localStorage.removeItem(key)
}

/**
 * Check if custom prompt exists
 */
export function hasCustomPrompt(type: PromptType): boolean {
  return getCustomPrompt(type) !== null
}

/**
 * Get default generation prompt template
 */
export function getDefaultGenerationPrompt(): string {
  return `Rules:
- Use ONLY the context.
- If the answer is not in the context, reply exactly: NOT IN CONTEXT.
- Be brief (1-3 sentences).
- If you use context, include citations like [1][3].

Context:
{context}

Question: {question}
Answer:`
}

/**
 * Get default polish prompt template
 */
export function getDefaultPolishPrompt(): string {
  return `Rephrase this answer to be more fluent and natural while keeping the same information:

Question: {question}
Answer: {answer}

Rephrased:`
}

/**
 * Build prompt by replacing placeholders
 */
export function buildPromptFromTemplate(
  template: string,
  replacements: Record<string, string>
): string {
  let result = template
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return result
}
