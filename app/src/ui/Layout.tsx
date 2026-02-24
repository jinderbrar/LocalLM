import Sources from './Sources'
import Chat from './Chat'
import Debug from './Debug'
import { ThemeToggle } from '@/components/theme-toggle'
import { Badge } from '@/components/ui/badge'

function Layout() {

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📓</span>
          <h1 className="text-xl font-semibold tracking-tight">Local NotebookLM</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1.5 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
            Local-only
          </Badge>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex min-h-0 flex-1 gap-4 overflow-hidden p-4">
        {/* Sources Panel - Left */}
        <div className="hidden w-56 min-w-0 flex-shrink-0 overflow-hidden rounded-xl border bg-card shadow-sm lg:flex xl:w-64">
          <Sources />
        </div>

        {/* Chat Panel - Center */}
        <div className="flex min-w-0 flex-1 overflow-hidden rounded-xl border bg-card shadow-sm">
          <Chat />
        </div>

        {/* Debug Panel - Right */}
        <div className="hidden w-80 min-w-0 flex-shrink-0 overflow-hidden rounded-xl border bg-card shadow-sm xl:flex xl:w-96">
          <Debug />
        </div>
      </main>
    </div>
  )
}

export default Layout
