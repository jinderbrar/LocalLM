import './Studio.css'

function Studio() {
  return (
    <div className="studio">
      <div className="studio-header">
        <h2>Studio</h2>
      </div>

      <div className="studio-content">
        <section className="studio-section">
          <div className="section-header">
            <h3>Audio Overview</h3>
            <button className="icon-btn-sm">ℹ️</button>
          </div>
          <div className="audio-card">
            <div className="audio-icon">🎙️</div>
            <div className="audio-info">
              <p className="audio-title">Deep dive conversation</p>
              <p className="audio-subtitle">2 hosts (English only)</p>
            </div>
          </div>
          <div className="audio-actions">
            <button className="btn-studio">Customize</button>
            <button className="btn-studio btn-studio-primary">Generate</button>
          </div>
        </section>

        <section className="studio-section">
          <div className="section-header">
            <h3>Notes</h3>
            <div className="section-tools">
              <button className="icon-btn-sm">🔍</button>
              <button className="icon-btn-sm">☰</button>
              <button className="icon-btn-sm">⋮</button>
            </div>
          </div>
          <button className="btn-add-note">+ Add note</button>
          <div className="study-tools">
            <button className="tool-btn">📖 Study guide</button>
            <button className="tool-btn">📄 Briefing doc</button>
            <button className="tool-btn">❓ FAQ</button>
            <button className="tool-btn">📅 Timeline</button>
          </div>
          <div className="notes-empty-state">
            <div className="empty-icon">📝</div>
            <p className="empty-text">Saved notes will appear here</p>
            <p className="empty-hint">
              Save a chat message to create a new note, or click Add note above.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Studio
