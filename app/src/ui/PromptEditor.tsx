import { useState, useEffect } from 'react'
import {
  getCustomPrompt,
  saveCustomPrompt,
  resetCustomPrompt,
  hasCustomPrompt,
  getDefaultGenerationPrompt,
  getDefaultPolishPrompt,
} from '../core/debug/prompts'
import type { PromptType } from '../core/debug/prompts'
import './PromptEditor.css'

function PromptEditor() {
  const [activePrompt, setActivePrompt] = useState<PromptType>('generation')
  const [promptText, setPromptText] = useState('')
  const [hasCustom, setHasCustom] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    loadPrompt(activePrompt)
  }, [activePrompt])

  const loadPrompt = (type: PromptType) => {
    const custom = getCustomPrompt(type)
    if (custom) {
      setPromptText(custom)
      setHasCustom(true)
    } else {
      const defaultPrompt =
        type === 'generation' ? getDefaultGenerationPrompt() : getDefaultPolishPrompt()
      setPromptText(defaultPrompt)
      setHasCustom(false)
    }
  }

  const handleSave = () => {
    saveCustomPrompt(activePrompt, promptText)
    setHasCustom(true)
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  const handleReset = () => {
    resetCustomPrompt(activePrompt)
    loadPrompt(activePrompt)
  }

  return (
    <div className="prompt-editor">
      <div className="prompt-tabs">
        <button
          className={`prompt-tab ${activePrompt === 'generation' ? 'active' : ''}`}
          onClick={() => setActivePrompt('generation')}
        >
          💬 Generation Prompt
        </button>
        <button
          className={`prompt-tab ${activePrompt === 'polish' ? 'active' : ''}`}
          onClick={() => setActivePrompt('polish')}
        >
          ✨ Polish Prompt
        </button>
      </div>

      <div className="prompt-info">
        {activePrompt === 'generation' ? (
          <div className="info-box">
            <strong>Available placeholders:</strong>
            <ul>
              <li>
                <code>{'{context}'}</code> - The retrieved document chunks
              </li>
              <li>
                <code>{'{question}'}</code> - The user's question
              </li>
            </ul>
            <p className="info-note">
              This prompt is used when generating answers from retrieved documents.
            </p>
          </div>
        ) : (
          <div className="info-box">
            <strong>Available placeholders:</strong>
            <ul>
              <li>
                <code>{'{question}'}</code> - The user's question
              </li>
              <li>
                <code>{'{answer}'}</code> - The extractive answer to polish
              </li>
            </ul>
            <p className="info-note">
              This prompt is used to make answers more fluent and natural.
            </p>
          </div>
        )}
      </div>

      <div className="prompt-status">
        {hasCustom ? (
          <span className="status-custom">🎨 Using custom prompt</span>
        ) : (
          <span className="status-default">📋 Using default prompt</span>
        )}
      </div>

      <textarea
        className="prompt-textarea"
        value={promptText}
        onChange={(e) => setPromptText(e.target.value)}
        placeholder="Enter your prompt template..."
        rows={15}
      />

      <div className="prompt-actions">
        <button className="btn-reset" onClick={handleReset} disabled={!hasCustom}>
          Reset to Default
        </button>
        <button className="btn-save" onClick={handleSave}>
          Save Custom Prompt
        </button>
      </div>

      {showSaved && <div className="save-notification">✅ Prompt saved!</div>}
    </div>
  )
}

export default PromptEditor
