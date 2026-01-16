import Sources from './Sources'
import Chat from './Chat'
import Studio from './Studio'
import './Layout.css'

function Layout() {
  return (
    <div className="layout">
      <header className="header">
        <div className="header-left">
          <div className="logo">📓</div>
          <h1 className="title">Local NotebookLM</h1>
        </div>
        <div className="header-right">
          <div className="privacy-badge">🔒 Local-only</div>
          <button className="icon-btn">⚙️</button>
        </div>
      </header>

      <main className="main-panels">
        <div className="panel panel-sources">
          <Sources />
        </div>
        <div className="panel panel-chat">
          <Chat />
        </div>
        <div className="panel panel-studio">
          <Studio />
        </div>
      </main>
    </div>
  )
}

export default Layout
