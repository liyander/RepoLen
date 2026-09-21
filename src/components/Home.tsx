import { useState } from 'react'
import { ArrowRight, Braces, Check, GitBranch, GitFork, Layers3, LockKeyhole, Moon, Network, Sparkles, Sun } from 'lucide-react'
import { getRecent } from '../storage'
import type { AnalysisDepth, AnalysisStage } from '../types'

interface Props { onAnalyze: (url: string, depth?: AnalysisDepth) => void; stage: AnalysisStage; stageText: string; progress: number; error: string; theme: 'dark' | 'light'; onToggleTheme: () => void }

export function Home({ onAnalyze, stage, stageText, progress, error, theme, onToggleTheme }: Props) {
  const [url, setUrl] = useState('')
  const [depth, setDepth] = useState<AnalysisDepth>('deep')
  const recent = getRecent()
  const busy = !['idle', 'error', 'complete'].includes(stage)
  const steps = ['Repository indexed', 'Important files selected', 'Architecture mapped']

  function submit(e: React.FormEvent) { e.preventDefault(); if (url.trim() && !busy) onAnalyze(url, depth) }

  return <div className="home-shell">
    <nav className="topbar home-nav">
      <a href="/" className="brand"><span className="brand-mark"><Braces size={19} /></span><span>RepoLens</span></a>
      <div className="nav-links"><a href="#how">How it works</a><a href="#capabilities">Capabilities</a><a href="/about">About</a><a href="/developers">Developers</a><span className="local-pill"><LockKeyhole size={13} /> Client-side</span></div>
      <div className="home-actions"><button className="theme-toggle" type="button" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? <Sun /> : <Moon />}<span>{theme === 'dark' ? 'Light' : 'Dark'}</span></button><a className="github-link" href="https://github.com" target="_blank" rel="noreferrer"><GitFork size={17} /> GitHub</a></div>
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

      <section id="capabilities" className="seo-section" aria-labelledby="seo-heading">
        <div><div className="section-kicker">GITHUB REPOSITORY ANALYSIS</div><h2 id="seo-heading">Code intelligence for every kind of software.</h2></div>
        <div className="seo-copy"><p><strong>RepoLens</strong> (also searched as RepoLen) helps developers understand public GitHub repositories without cloning or executing their code. It maps architecture, modules, dependencies, functions, classes, execution flows, data models, tests, external services, security-sensitive boundaries, and the impact of proposed changes.</p><p>Created by <strong>Liyander Rishwanth</strong>, also known as <a href="https://github.com/CyberGhost05" target="_blank" rel="author noreferrer">CyberGhost05 on GitHub</a>, RepoLens supports web applications, backend services, native and desktop software, mobile apps, CLI tools, SDKs, games, embedded firmware, data and machine-learning systems, infrastructure, and monorepos.</p></div>
        <div className="seo-features"><article><Network /><h3>Visual architecture analysis</h3><p>Explore system, module, component, import, and symbol call graphs with direct source evidence.</p></article><article><GitBranch /><h3>Execution and data flows</h3><p>Trace API requests, startup sequences, callbacks, commands, services, storage, and hardware interactions.</p></article><article><LockKeyhole /><h3>Developer impact analysis</h3><p>Find callers, affected files, relevant tests, architecture risks, and code-health signals before changing code.</p></article></div>
      </section>

      {recent.length > 0 && <section className="recent-section"><div><div className="section-kicker">RECENT</div><h2>Pick up where you left off.</h2></div><div className="recent-list">
        {recent.map(repo => <button key={repo.fullName} onClick={() => onAnalyze(repo.url)}><span className="repo-avatar">{repo.fullName.split('/')[1]?.slice(0, 2).toUpperCase()}</span><span><b>{repo.fullName}</b><small>{repo.description}</small></span><ArrowRight /></button>)}
      </div></section>}
    </main>
    <footer><a className="brand" href="/"><span className="brand-mark"><Braces size={16} /></span>RepoLens</a><span><a href="/about">About</a> · <a href="/developers">Developers</a></span><span>Created by <a href="https://github.com/CyberGhost05" rel="author">Liyander Rishwanth · CyberGhost05</a></span></footer>
  </div>
}
