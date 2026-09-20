import { useState } from 'react'
import { ArrowRight, Braces, Check, GitBranch, GitFork, Layers3, LockKeyhole, Network, Sparkles } from 'lucide-react'
import { getRecent } from '../storage'
import type { AnalysisDepth, AnalysisStage } from '../types'

interface Props { onAnalyze: (url: string, depth?: AnalysisDepth) => void; stage: AnalysisStage; stageText: string; progress: number; error: string }

export function Home({ onAnalyze, stage, stageText, progress, error }: Props) {
  const [url, setUrl] = useState('')
  const [depth, setDepth] = useState<AnalysisDepth>('deep')
  const recent = getRecent()
  const busy = !['idle', 'error', 'complete'].includes(stage)
  const steps = ['Repository indexed', 'Important files selected', 'Architecture mapped']

  function submit(e: React.FormEvent) { e.preventDefault(); if (url.trim() && !busy) onAnalyze(url, depth) }

  return <div className="home-shell">
    <nav className="topbar home-nav">
      <a href="/" className="brand"><span className="brand-mark"><Braces size={19} /></span><span>RepoLens</span></a>
      <div className="nav-links"><a href="#how">How it works</a><a href="#capabilities">Capabilities</a><span className="local-pill"><LockKeyhole size={13} /> Client-side</span></div>
      <a className="github-link" href="https://github.com" target="_blank" rel="noreferrer"><GitFork size={17} /> GitHub</a>
    </nav>

    <main>
      <section className="hero">
        <div className="ambient-grid" />
        <div className="eyebrow"><Sparkles size={14} /> Evidence-backed code intelligence</div>
        <h1>See the system inside<br />the <em>repository.</em></h1>
        <p className="hero-copy">Paste a public GitHub repository. RepoLens maps its architecture, stack, dependencies and security surface—without executing a single line of code.</p>
        <form className={`repo-form ${busy ? 'is-busy' : ''}`} onSubmit={submit}>
          <GitFork size={22} />
          <input aria-label="GitHub repository URL" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://github.com/owner/repository" disabled={busy} />
          <button type="submit" disabled={busy || !url.trim()}>{busy ? 'Analyzing' : 'Analyze repository'} {!busy && <ArrowRight size={18} />}</button>
        </form>
        {!busy && <div className="depth-picker"><span>Analysis depth</span>{(['quick', 'standard', 'deep'] as const).map(item => <button type="button" className={depth === item ? 'active' : ''} onClick={() => setDepth(item)} key={item}><b>{item}</b><small>{item === 'quick' ? '40 files · ~5 MB' : item === 'standard' ? '100 files · ~12 MB' : '180 files · ~20 MB'}</small></button>)}</div>}
        {error && <div className="error-banner" role="alert">{error}</div>}
        {busy && <div className="progress-card">
          <div className="progress-top"><span>{stageText}</span><strong>{progress}%</strong></div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          <div className="progress-steps">{steps.map((s, i) => <span className={progress > [20, 45, 88][i] ? 'done' : ''} key={s}><Check size={13} /> {s}</span>)}</div>
        </div>}
        {!busy && <div className="try-row"><span>Try an example</span><button onClick={() => setUrl('https://github.com/fastapi/fastapi')}>fastapi/fastapi</button><button onClick={() => setUrl('https://github.com/expressjs/express')}>expressjs/express</button></div>}
        <div className="trust-row"><span><LockKeyhole size={15} /> Runs in your browser</span><i /><span>No code execution</span><i /><span>Public repositories only</span></div>
      </section>

      <section className="signal-strip" aria-label="Analysis capabilities">
        <div><Network /><span><b>Architecture</b><small>Modules & relationships</small></span></div>
        <div><Layers3 /><span><b>Technology</b><small>Frameworks & packages</small></span></div>
        <div><GitBranch /><span><b>Data flow</b><small>Routes & entry points</small></span></div>
        <div><LockKeyhole /><span><b>Security surface</b><small>Boundaries, not guesses</small></span></div>
      </section>

      <section id="how" className="how-section">
        <div className="section-kicker">HOW IT WORKS</div><h2>From URL to understanding.</h2>
        <div className="steps-grid">
          <article><span>01</span><div className="step-icon"><GitFork /></div><h3>Index</h3><p>We read the public repository tree and select high-signal files. Large repos are safely bounded.</p></article>
          <article><span>02</span><div className="step-icon"><Braces /></div><h3>Analyze</h3><p>Deterministic detectors find frameworks, dependencies, routes, entry points and infrastructure.</p></article>
          <article><span>03</span><div className="step-icon"><Network /></div><h3>Map</h3><p>Evidence becomes an explorable system view—with every conclusion tied to its source.</p></article>
        </div>
      </section>

      {recent.length > 0 && <section className="recent-section"><div><div className="section-kicker">RECENT</div><h2>Pick up where you left off.</h2></div><div className="recent-list">
        {recent.map(repo => <button key={repo.fullName} onClick={() => onAnalyze(repo.url)}><span className="repo-avatar">{repo.fullName.split('/')[1]?.slice(0, 2).toUpperCase()}</span><span><b>{repo.fullName}</b><small>{repo.description}</small></span><ArrowRight /></button>)}
      </div></section>}
    </main>
    <footer><a className="brand"><span className="brand-mark"><Braces size={16} /></span>RepoLens</a><span>Static analysis first. AI second.</span><span>Built for curious engineers.</span></footer>
  </div>
}
