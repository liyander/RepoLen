import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { analyzeRepository } from './analyzer'
import { fetchImportantFiles, getCdnRepository, getMetadata, getRecentCommits, getTree, isGitHubRateLimitError, parseRepositoryUrl } from './repository'
import { Home } from './components/Home'
import { AboutPage, DeveloperPage } from './components/InfoPages'
import { saveRecent } from './storage'
import type { AnalysisDepth, AnalysisStage, CommitInfo, RepoFile, RepoMeta, RepoResult } from './types'

const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })))

export function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('repolens-theme')
    if (saved === 'dark' || saved === 'light') return saved
    return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })
  const [result, setResult] = useState<RepoResult | null>(null)
  const [stage, setStage] = useState<AnalysisStage>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const stageText = useMemo(() => ({
    idle: '', metadata: 'Reading repository metadata', tree: 'Indexing the file tree', prioritizing: 'Selecting useful source files',
    fetching: 'Fetching prioritized source', analyzing: 'Building the repository map', complete: 'Analysis complete', error: 'Analysis stopped',
  }[stage]), [stage])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f5f8f6' : '#08100e')
    localStorage.setItem('repolens-theme', theme)
  }, [theme])

  useEffect(() => {
    const pages: Record<string, { title: string; description: string }> = {
      '/about': { title: 'About RepoLens | Visual Software Understanding', description: 'Learn why RepoLens was created and how it helps developers understand unfamiliar software repositories through evidence-backed static analysis.' },
      '/developers': { title: 'RepoLens for Developers | Analysis Pipeline and Capabilities', description: 'Explore the RepoLens repository acquisition pipeline, architecture analysis, execution-flow mapping, change impact, code health, and automatic rate-limit fallback.' },
      '/developer': { title: 'RepoLens for Developers | Analysis Pipeline and Capabilities', description: 'Explore the RepoLens repository acquisition pipeline, architecture analysis, execution-flow mapping, change impact, code health, and automatic rate-limit fallback.' },
    }
    const page = pages[location.pathname]
    if (!page) return
    document.title = page.title
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', page.description)
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', `https://repolen-957ab.web.app${location.pathname === '/developer' ? '/developers' : location.pathname}`)
  }, [])

  useEffect(() => {
    const path = location.pathname.match(/^\/repository\/github\/([^/]+)\/([^/]+)/)
    if (path) void run(`https://github.com/${path[1]}/${path[2]}`, 'deep', false)
  }, [])

  async function run(url: string, depth: AnalysisDepth = 'deep', updateHistory = true) {
    try {
      setError(''); setResult(null); setProgress(3); setStage('metadata')
      const id = parseRepositoryUrl(url)
      let meta: RepoMeta
      let files: RepoFile[]
      let recentCommits: CommitInfo[] = []
      try {
        meta = await getMetadata(id)
        setProgress(15); setStage('tree')
        try {
          [files, recentCommits] = await Promise.all([getTree(id, meta.defaultBranch), getRecentCommits(id)])
        } catch (treeError) {
          if (!isGitHubRateLimitError(treeError)) throw treeError
          const fallback = await getCdnRepository(id, meta)
          meta = fallback.meta; files = fallback.files
        }
      } catch (metadataError) {
        if (!isGitHubRateLimitError(metadataError)) throw metadataError
        setProgress(15); setStage('tree')
        const fallback = await getCdnRepository(id)
        meta = fallback.meta; files = fallback.files
      }
      setProgress(30); setStage('prioritizing')
      await new Promise(resolve => setTimeout(resolve, 180))
      setStage('fetching')
      const fetched = await fetchImportantFiles(id, files, (done, total) => setProgress(30 + Math.round(done / Math.max(total, 1) * 50)), depth, meta.dataSource === 'cdn' ? 'cdn' : 'github')
      setStage('analyzing'); setProgress(87)
      await new Promise(resolve => setTimeout(resolve, 100))
      const analysis = analyzeRepository(meta, files, fetched)
      if (meta.dataSource === 'cdn') analysis.diagnostics.warnings.unshift('GitHub API limit reached: source analysis continued through the automatic public CDN fallback. Live stars, forks, and commit history may be unavailable.')
      const next = { meta, files: files.map(f => fetched.find(x => x.path === f.path) || f), analysis, history: recentCommits, analyzedAt: new Date().toISOString() }
      setResult(next); saveRecent(next); setProgress(100); setStage('complete')
      if (updateHistory) history.pushState({}, '', `/repository/github/${id.owner}/${id.repository}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong while analyzing this repository.')
      setStage('error'); setProgress(0)
    }
  }

  function reset() {
    setResult(null); setStage('idle'); setProgress(0); setError(''); history.pushState({}, '', '/')
  }

  function toggleTheme() { setTheme(current => current === 'dark' ? 'light' : 'dark') }

  if (location.pathname === '/about') return <AboutPage theme={theme} onToggleTheme={toggleTheme} />
  if (location.pathname === '/developer' || location.pathname === '/developers') return <DeveloperPage theme={theme} onToggleTheme={toggleTheme} />

  return result ? <Suspense fallback={<div className="dashboard-loading">Preparing repository intelligence…</div>}><Dashboard result={result} onReset={reset} theme={theme} onToggleTheme={toggleTheme} /></Suspense> : <Home onAnalyze={run} stage={stage} stageText={stageText} progress={progress} error={error} theme={theme} onToggleTheme={toggleTheme} />
}
