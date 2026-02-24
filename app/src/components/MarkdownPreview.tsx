import { memo } from 'react'

interface MarkdownPreviewProps {
  content: string
}

/**
 * Improved markdown renderer for document previews
 * Properly handles paragraphs, lists, and other markdown elements
 */
export const MarkdownPreview = memo(({ content }: MarkdownPreviewProps) => {
  if (!content || content.trim() === '') {
    return <div className="text-muted-foreground text-sm">No content available</div>
  }

  const lines = content.split('\n')
  const elements: JSX.Element[] = []

  let currentParagraph: string[] = []
  let listItems: string[] = []
  let inCodeBlock = false
  let codeBlockContent: string[] = []
  let elementKey = 0

  const getKey = () => `md-${elementKey++}`

  const parseInline = (text: string): JSX.Element => {
    let html = text

    // Escape HTML first
    html = html.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Handle inline code (before other formatting)
    html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')

    // Handle bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    html = html.replace(/__(.+?)__/g, '<strong class="font-semibold">$1</strong>')

    // Handle italic (after bold to avoid conflicts)
    html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    html = html.replace(/_(.+?)_/g, '<em class="italic">$1</em>')

    // Handle links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline underline-offset-2" target="_blank" rel="noopener noreferrer">$1</a>')

    return <span dangerouslySetInnerHTML={{ __html: html }} />
  }

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ')
      if (text.trim()) {
        elements.push(
          <p key={getKey()} className="mb-4 leading-7 text-foreground">
            {parseInline(text)}
          </p>
        )
      }
      currentParagraph = []
    }
  }

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={getKey()} className="list-disc list-outside ml-6 mb-4 space-y-2">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-7 text-foreground">
              {parseInline(item)}
            </li>
          ))}
        </ul>
      )
      listItems = []
    }
  }

  const flushCodeBlock = () => {
    if (codeBlockContent.length > 0) {
      elements.push(
        <pre key={getKey()} className="bg-muted p-4 rounded-lg mb-4 overflow-x-auto border border-border">
          <code className="text-sm font-mono text-foreground">{codeBlockContent.join('\n')}</code>
        </pre>
      )
      codeBlockContent = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Handle code blocks
    if (trimmed.startsWith('```')) {
      flushParagraph()
      flushList()

      if (inCodeBlock) {
        flushCodeBlock()
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockContent.push(line)
      continue
    }

    // Empty line - paragraph break
    if (trimmed === '') {
      flushParagraph()
      flushList()
      continue
    }

    // H1
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      flushParagraph()
      flushList()
      elements.push(
        <h1 key={getKey()} className="text-3xl font-bold mt-6 mb-4 text-foreground">
          {parseInline(trimmed.substring(2))}
        </h1>
      )
      continue
    }

    // H2
    if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      flushParagraph()
      flushList()
      elements.push(
        <h2 key={getKey()} className="text-2xl font-bold mt-5 mb-3 text-foreground">
          {parseInline(trimmed.substring(3))}
        </h2>
      )
      continue
    }

    // H3
    if (trimmed.startsWith('### ') && !trimmed.startsWith('#### ')) {
      flushParagraph()
      flushList()
      elements.push(
        <h3 key={getKey()} className="text-xl font-semibold mt-4 mb-2 text-foreground">
          {parseInline(trimmed.substring(4))}
        </h3>
      )
      continue
    }

    // H4
    if (trimmed.startsWith('#### ')) {
      flushParagraph()
      flushList()
      elements.push(
        <h4 key={getKey()} className="text-lg font-semibold mt-3 mb-2 text-foreground">
          {parseInline(trimmed.substring(5))}
        </h4>
      )
      continue
    }

    // Unordered list
    if (trimmed.match(/^[-*+]\s+/)) {
      flushParagraph()
      const content = trimmed.replace(/^[-*+]\s+/, '')
      listItems.push(content)
      continue
    }

    // Ordered list
    if (trimmed.match(/^\d+\.\s+/)) {
      flushParagraph()
      const content = trimmed.replace(/^\d+\.\s+/, '')
      listItems.push(content)
      continue
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushParagraph()
      flushList()
      elements.push(
        <blockquote key={getKey()} className="border-l-4 border-primary/40 pl-4 mb-4 italic text-muted-foreground">
          {parseInline(trimmed.substring(2))}
        </blockquote>
      )
      continue
    }

    // Horizontal rule
    if (trimmed.match(/^(---+|___+|\*\*\*+)$/)) {
      flushParagraph()
      flushList()
      elements.push(<hr key={getKey()} className="my-6 border-border" />)
      continue
    }

    // Regular text - accumulate into paragraph
    flushList()

    // If line has content, add it to current paragraph
    if (trimmed) {
      currentParagraph.push(trimmed)
    }
  }

  // Flush any remaining content
  flushParagraph()
  flushList()
  flushCodeBlock()

  return (
    <div className="markdown-content text-sm">
      {elements.length > 0 ? elements : (
        <div className="text-muted-foreground">No content to display</div>
      )}
    </div>
  )
})

MarkdownPreview.displayName = 'MarkdownPreview'
