import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { analyzeRepository } from './analyzer'
import { fetchImportantFiles, getMetadata, getRecentCommits, getTree, parseRepositoryUrl } from './repository'
import { Home } from './components/Home'
import { saveRecent } from './storage'
import type { AnalysisDepth, AnalysisStage, RepoResult } from './types'

const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })))

export function App() {
  const [result, setResult] = useState<RepoResult | null>(null)
  const [stage, setStage] = useState<AnalysisStage>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const stageText = useMemo(() => ({
    idle: '', metadata: 'Reading repository metadata', tree: 'Indexing the file tree', prioritizing: 'Selecting useful source files',
    fetching: 'Fetching prioritized source', analyzing: 'Building the repository map', complete: 'Analysis complete', error: 'Analysis stopped',
  }[stage]), [stage])

  useEffect(() => {
    const path = location.pathname.match(/^\/repository\/github\/([^/]+)\/([^/]+)/)
    if (path) void run(`https://github.com/${path[1]}/${path[2]}`, 'deep', false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function run(url: string, depth: AnalysisDepth = 'deep', updateHistory = true) {
    try {
      setError(''); setResult(null); setProgress(3); setStage('metadata')
      const id = parseRepositoryUrl(url)
      const meta = await getMetadata(id)
      setProgress(15); setStage('tree')
      const [files, recentCommits] = await Promise.all([getTree(id, meta.defaultBranch), getRecentCommits(id)])
      setProgress(30); setStage('prioritizing')
      await new Promise(resolve => setTimeout(resolve, 180))
      setStage('fetching')
      const fetched = await fetchImportantFiles(id, files, (done, total) => setProgress(30 + Math.round(done / Math.max(total, 1) * 50)), depth)
      setStage('analyzing'); setProgress(87)
      await new Promise(resolve => setTimeout(resolve, 100))
      const analysis = analyzeRepository(meta, files, fetched)
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

  return result ? <Suspense fallback={<div className="dashboard-loading">Preparing repository intelligence…</div>}><Dashboard result={result} onReset={reset} /></Suspense> : <Home onAnalyze={run} stage={stage} stageText={stageText} progress={progress} error={error} />
}
