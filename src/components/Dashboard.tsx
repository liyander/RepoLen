import { useMemo, useState } from 'react'
import { Background, Controls, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react'
import { Activity, AlertTriangle, ArrowLeft, Blocks, BookOpen, Braces, ChevronRight, CircleDot, CloudDownload, Database, Download, ExternalLink, File, FileCode2, FileJson, Folder, GitBranch, GitFork, KeyRound, Menu, Moon, Network, Package, PanelLeftClose, PanelLeftOpen, Route, Search, ServerCog, ShieldCheck, Star, Sun, Terminal, Workflow, Wrench, X } from 'lucide-react'
import type { FileInsight, Finding, RepoFile, RepoResult } from '../types'

type Tab = 'overview' | 'guide' | 'impact' | 'health' | 'history' | 'architecture' | 'components' | 'flows' | 'repository' | 'dependencies' | 'data' | 'api' | 'infrastructure' | 'security'
const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <Activity /> }, { id: 'guide', label: 'Developer guide', icon: <BookOpen /> }, { id: 'impact', label: 'Impact explorer', icon: <Route /> }, { id: 'health', label: 'Code health', icon: <ShieldCheck /> }, { id: 'history', label: 'Recent history', icon: <GitBranch /> }, { id: 'architecture', label: 'Architecture', icon: <Network /> },
  { id: 'components', label: 'Components', icon: <Blocks /> }, { id: 'flows', label: 'System flows', icon: <Route /> },
  { id: 'repository', label: 'Repository', icon: <FileCode2 /> }, { id: 'dependencies', label: 'Dependencies', icon: <Package /> },
  { id: 'data', label: 'Data & config', icon: <Database /> },
  { id: 'api', label: 'API endpoints', icon: <GitBranch /> }, { id: 'infrastructure', label: 'Infrastructure', icon: <ServerCog /> },
  { id: 'security', label: 'Security surface', icon: <ShieldCheck /> },
]

function GraphNode({ data }: NodeProps) {
  const d = data as { label: string; detail: string; kind?: string }
  return <div className={`graph-node ${d.kind || ''}`}><Handle type="target" position={Position.Top} /><small>{d.kind || 'module'}</small><b>{d.label}</b><span>{d.detail}</span><Handle type="source" position={Position.Bottom} /></div>
}
const nodeTypes = { repoNode: GraphNode }

function FindingCard({ item }: { item: Finding }) {
  return <article className={`finding-card ${item.tone || 'green'}`}><span className="finding-dot" /><div><h4>{item.label}</h4><p>{item.detail}</p><div className="evidence">{item.evidence.slice(0, 3).map(e => <code key={e}>{e}</code>)}</div></div></article>
}

export function Dashboard({ result, onReset, theme, onToggleTheme }: { result: RepoResult; onReset: () => void; theme: 'dark' | 'light'; onToggleTheme: () => void }) {
  const [tab, setTab] = useState<Tab>('overview')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<RepoFile | null>(null)
  const [sidebar, setSidebar] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('repolens-sidebar-collapsed') === 'true')
  const { meta, files, analysis } = result
  const sourceFiles = files.filter(f => f.type === 'blob')
  const filteredFiles = sourceFiles.filter(f => f.path.toLowerCase().includes(query.toLowerCase())).slice(0, 300)

  function exportJson() {
    const blob = new Blob([JSON.stringify({ repository: meta, analysis }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${meta.name}-repolens.json`; a.click(); URL.revokeObjectURL(a.href)
  }
  function exportMarkdown() {
    const a = analysis; const text = `# ${meta.fullName} — RepoLens report\n\n${a.summary}\n\n## Software profile\n\n- Type: ${a.profile.primaryKind}\n- Platforms: ${a.profile.platforms.join(', ') || 'Unknown'}\n- Architecture: ${a.profile.architectureStyle.join(', ')}\n- Languages: ${a.languages.map(x => `${x.name} ${x.percent}%`).join(', ')}\n\n## Analysis\n\n- ${a.diagnostics.indexedFiles} indexed files\n- ${a.diagnostics.parsedFiles} parsed files\n- ${a.symbols.length} symbols\n- ${a.imports.length} relationships\n- ${a.advanced.cycles.length} dependency cycles\n- ${a.advanced.violations.length} architecture review items\n- Maintainability indicator: ${a.advanced.metrics.maintainability}/100\n\n## Start here\n\n${a.developerGuide.readingOrder.map((x, i) => `${i + 1}. \`${x.path}\` — ${x.reason}`).join('\n')}\n\n## Development commands\n\n${a.developerGuide.commands.map(x => `- \`${x.command}\` — ${x.label}`).join('\n')}\n\n## Entrypoints\n\n${a.entrypoints.map(x => `- \`${x}\``).join('\n')}\n\n## System flows\n\n${a.flows.map(x => `- **${x.name}**: ${x.steps.map(s => s.label).join(' → ')}`).join('\n')}\n`
    download(`${meta.name}-repolens.md`, text, 'text/markdown')
  }
  function download(name: string, content: string, type: string) { const blob = new Blob([content], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href) }
  function toggleSidebar() {
    setSidebarCollapsed(current => {
      localStorage.setItem('repolens-sidebar-collapsed', String(!current))
      return !current
    })
  }

  return <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
    <aside className={`sidebar ${sidebar ? 'open' : ''}`}>
      <button className="mobile-close" onClick={() => setSidebar(false)} aria-label="Close navigation"><X /></button>
      <button className="brand dashboard-brand" onClick={onReset}><span className="brand-mark"><Braces size={19} /></span><span>RepoLens</span></button>
      <button className="back-link" onClick={onReset} title="Analyze another repository"><ArrowLeft /><span>Analyze another repo</span></button>
      <div className="repo-block"><span className="repo-avatar">{meta.name.slice(0, 2).toUpperCase()}</span><div><small>{meta.fullName.split('/')[0]}</small><strong>{meta.name}</strong></div></div>
      <nav className="side-nav" aria-label="Repository analysis sections">{tabs.map(t => <button key={t.id} title={sidebarCollapsed ? t.label : undefined} className={tab === t.id ? 'active' : ''} onClick={() => { setTab(t.id); setSidebar(false) }}>{t.icon}<span>{t.label}</span>{t.id === 'api' && analysis.endpoints.length > 0 && <em>{analysis.endpoints.length}</em>}</button>)}</nav>
      <div className="sidebar-foot"><span><CircleDot /> Analysis complete</span><small>{analysis.fetchedFiles} source files analyzed</small></div>
    </aside>
    {sidebar && <button className="sidebar-scrim" onClick={() => setSidebar(false)} aria-label="Close navigation" />}

    <div className="dashboard-main">
      <header className="dashboard-header"><button className="menu-button" onClick={() => setSidebar(true)} aria-label="Open navigation"><Menu /></button><button className="desktop-sidebar-toggle" onClick={toggleSidebar} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</button><div className="header-repository"><span className="header-owner">{meta.fullName.split('/')[0]} /</span> <b>{meta.name}</b><span className={`public-badge ${meta.dataSource === 'cdn' ? 'fallback' : ''}`}>{meta.dataSource === 'cdn' ? 'CDN FALLBACK' : 'PUBLIC'}</span></div><div className="header-actions"><button className="theme-toggle dashboard-theme" type="button" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? <Sun /> : <Moon />}<span>{theme === 'dark' ? 'Light' : 'Dark'}</span></button><a href={meta.url} target="_blank" rel="noreferrer"><GitFork /> View repo <ExternalLink /></a><button onClick={exportMarkdown}><BookOpen /> Report</button><button onClick={exportJson}><Download /> JSON</button></div></header>
      <main className="dashboard-content">
        {tab === 'overview' && <Overview result={result} onNavigate={setTab} />}
        {tab === 'guide' && <DeveloperGuideView result={result} onNavigate={setTab} />}
        {tab === 'impact' && <ImpactExplorer result={result} />}
        {tab === 'health' && <CodeHealthView result={result} />}
        {tab === 'history' && <HistoryView result={result} />}
        {tab === 'architecture' && <Architecture result={result} />}
        {tab === 'components' && <ComponentsView result={result} />}
        {tab === 'flows' && <FlowsView result={result} />}
        {tab === 'repository' && <RepositoryView files={filteredFiles} query={query} setQuery={setQuery} selected={selected} setSelected={setSelected} insights={analysis.fileInsights} />}
        {tab === 'dependencies' && <ListView title="Dependencies" subtitle={`${analysis.dependencies.length} packages found in fetched manifests`} icon={<Package />} empty="No dependency manifest was found in the prioritized source." items={analysis.dependencies} />}
        {tab === 'data' && <DataView result={result} />}
        {tab === 'api' && <FindingsView title="API endpoints" subtitle="Route declarations found through static pattern analysis." items={analysis.endpoints} empty="No supported route declarations were detected." />}
        {tab === 'infrastructure' && <FindingsView title="Infrastructure" subtitle="Containers, delivery pipelines and operational configuration." items={analysis.infrastructure} empty="No supported infrastructure files were detected." />}
        {tab === 'security' && <FindingsView title="Security surface" subtitle="Review areas—not vulnerability claims. Each signal is tied to evidence." items={analysis.security} empty="No security-sensitive patterns were detected in the fetched files." />}
      </main>
    </div>
  </div>
}

function Overview({ result, onNavigate }: { result: RepoResult; onNavigate: (t: Tab) => void }) {
  const { meta, files, analysis } = result
  return <>
    <section className="welcome-row"><div><div className="section-kicker">REPOSITORY OVERVIEW</div><h1>{meta.name}</h1><p>{meta.description}</p><div className="meta-row">{meta.dataSource === 'cdn' ? <span className="fallback-meta"><CloudDownload /> Automatic CDN fallback</span> : <><span><Star /> {meta.stars.toLocaleString()}</span><span><GitBranch /> {meta.forks.toLocaleString()}</span><span><CircleDot /> {meta.defaultBranch}</span><span>Updated {new Date(meta.updatedAt).toLocaleDateString()}</span></>}</div></div><div className="confidence-card"><span>ANALYSIS COVERAGE</span><strong>{Math.min(100, Math.round(analysis.fetchedFiles / Math.max(analysis.fetchedFiles, 80) * 100))}%</strong><small>{analysis.fetchedFiles} high-signal files inspected</small></div></section>
    <section className="summary-card"><div className="summary-icon"><SparkIcon /></div><div><span>REPOLENS SUMMARY</span><p>{analysis.summary}</p></div></section>
    <section className="profile-banner"><div><span className="section-kicker">SOFTWARE PROFILE</span><h3>{analysis.profile.primaryKind}</h3><p>{analysis.profile.kinds.join(' · ')}</p></div><div><small>Target platforms</small><p>{analysis.profile.platforms.length ? analysis.profile.platforms.join(', ') : 'Platform not proven'}</p></div><div><small>Architecture</small><p>{analysis.profile.architectureStyle.join(', ')}</p></div><button onClick={() => onNavigate('guide')}>Open developer guide <ChevronRight /></button></section>
    <section className="stats-grid">
      <article><span>INDEXED FILES</span><strong>{files.filter(f => f.type === 'blob').length.toLocaleString()}</strong><small>Repository tree</small></article>
      <article><span>MODULES</span><strong>{analysis.modules.length}</strong><small>Top-level subsystems</small></article>
      <article><span>SYMBOLS</span><strong>{analysis.symbols.length.toLocaleString()}</strong><small>Functions, classes & components</small></article>
      <article><span>RELATIONSHIPS</span><strong>{analysis.imports.length}</strong><small>Resolved local imports</small></article>
    </section>
    <div className="overview-grid">
      <section className="panel language-panel"><div className="panel-head"><div><span className="section-kicker">LANGUAGES</span><h3>Code composition</h3></div></div><div className="language-bar">{analysis.languages.map((l, i) => <span key={l.name} className={`c${i}`} style={{ width: `${l.percent}%` }} title={`${l.name} ${l.percent}%`} />)}</div><div className="language-list">{analysis.languages.map((l, i) => <div key={l.name}><span className={`lang-dot c${i}`} /><b>{l.name}</b><small>{l.percent}%</small><em>{l.count} files</em></div>)}</div></section>
      <section className="panel"><div className="panel-head"><div><span className="section-kicker">TECH STACK</span><h3>Detected technologies</h3></div></div><div className="stack-list">{analysis.stack.length ? analysis.stack.slice(0, 5).map(s => <FindingCard key={s.label} item={s} />) : <Empty text="No supported frameworks detected." />}</div></section>
    </div>
    <div className="overview-grid lower">
      <section className="panel"><div className="panel-head"><div><span className="section-kicker">ENTRY POINTS</span><h3>Where execution may begin</h3></div><button onClick={() => onNavigate('repository')}>Browse files <ChevronRight /></button></div><div className="code-list">{analysis.entrypoints.slice(0, 7).map(x => <div key={x}><FileCode2 /><code>{x}</code></div>)}{!analysis.entrypoints.length && <Empty text="No conventional entry points found." />}</div></section>
      <section className="panel"><div className="panel-head"><div><span className="section-kicker">SYSTEM SIGNALS</span><h3>What stands out</h3></div><button onClick={() => onNavigate('security')}>Review all <ChevronRight /></button></div><div className="signal-list">{[...analysis.infrastructure, ...analysis.security].slice(0, 5).map(f => <div key={f.label}><span className={`signal-icon ${f.tone}`}><Workflow /></span><span><b>{f.label}</b><small>{f.detail}</small></span></div>)}{!analysis.infrastructure.length && !analysis.security.length && <Empty text="No additional system signals detected." />}</div></section>
    </div>
  </>
}

function SparkIcon() { return <Braces /> }

function DeveloperGuideView({ result, onNavigate }: { result: RepoResult; onNavigate: (tab: Tab) => void }) {
  const { profile, developerGuide: guide } = result.analysis
  const [commandFilter, setCommandFilter] = useState<'all' | 'build' | 'run' | 'test'>('all')
  const commands = guide.commands.filter(x => commandFilter === 'all' || x.kind === commandFilter)
  return <div className="full-page"><div className="page-title"><div><div className="section-kicker">DEVELOPER ONBOARDING</div><h1>Understand and work on this software</h1><p>A practical map from cloning the repository to safely changing its most important components.</p></div><span className={`profile-confidence ${profile.confidence}`}>{profile.confidence} confidence</span></div>
    <section className="software-profile"><div className="profile-primary"><small>PRIMARY SOFTWARE TYPE</small><h2>{profile.primaryKind}</h2><div>{profile.kinds.map(x => <span key={x}>{x}</span>)}</div></div><div><small>PLATFORMS</small>{profile.platforms.length ? profile.platforms.map(x => <p key={x}><CircleDot />{x}</p>) : <p>Not proven from repository evidence</p>}</div><div><small>PACKAGE MANAGEMENT</small>{profile.packageManagers.length ? profile.packageManagers.map(x => <p key={x}><Package />{x}</p>) : <p>No supported package manager found</p>}</div><div><small>ARCHITECTURE STYLE</small>{profile.architectureStyle.map(x => <p key={x}><Network />{x}</p>)}</div></section>
    <div className="guide-grid"><section className="panel guide-commands"><div className="panel-head"><div><span className="section-kicker">DEVELOPMENT WORKFLOW</span><h3>Commands</h3></div><div className="mini-tabs">{(['all', 'build', 'run', 'test'] as const).map(x => <button className={commandFilter === x ? 'active' : ''} onClick={() => setCommandFilter(x)} key={x}>{x}</button>)}</div></div><div className="command-list">{commands.map((item, i) => <article key={`${item.command}-${i}`}><span className={`command-kind ${item.kind}`}><Terminal /></span><div><b>{item.label}</b><code>{item.command}</code><small>Source: {item.source}{item.inferred ? ' · conventional command, verify before running' : ''}</small></div></article>)}{!commands.length && <Empty text="No commands found for this filter." />}</div></section>
      <section className="panel reading-order"><div className="panel-head"><div><span className="section-kicker">ONBOARDING PATH</span><h3>Recommended reading order</h3></div></div>{guide.readingOrder.map((item, i) => <article key={item.path}><span>{String(i + 1).padStart(2, '0')}</span><div><code>{item.path}</code><p>{item.reason}</p></div></article>)}{!guide.readingOrder.length && <Empty text="No reading order could be generated." />}</section>
    </div>
    <div className="guide-grid"><section className="panel"><div className="panel-head"><div><span className="section-kicker">CHANGE RISK</span><h3>Complexity hotspots</h3></div><button onClick={() => onNavigate('components')}>Inspect components <ChevronRight /></button></div><div className="hotspot-list">{guide.hotspots.slice(0, 10).map((item, i) => <article key={item.path}><span>{i + 1}</span><div><code>{item.path}</code><p>{item.reason}</p></div><div><b>{Math.round(item.score)}</b><small>score</small></div></article>)}{!guide.hotspots.length && <Empty text="No significant hotspots found in analyzed files." />}</div></section>
      <section className="panel"><div className="panel-head"><div><span className="section-kicker">EXTENSIBILITY</span><h3>Likely extension points</h3></div></div><div className="extension-list">{guide.extensionPoints.slice(0, 12).map(item => <article key={`${item.file}-${item.symbol}`}><span><Wrench /></span><div><b>{item.symbol}</b><code>{item.file}</code><p>{item.reason}</p></div></article>)}{!guide.extensionPoints.length && <Empty text="No conventional interfaces, providers, adapters, plugins, or hooks were detected." />}</div></section>
    </div>
    <div className="guide-grid"><section className="panel"><div className="panel-head"><div><span className="section-kicker">BUILD SYSTEM</span><h3>Toolchain evidence</h3></div></div><div className="stack-list">{profile.buildTools.map(x => <FindingCard key={x.label} item={x} />)}{!profile.buildTools.length && <Empty text="No supported build system was detected." />}</div></section><section className="panel"><div className="panel-head"><div><span className="section-kicker">PROJECT HEALTH</span><h3>Engineering signals</h3></div></div><div className="stack-list">{guide.qualitySignals.map(x => <FindingCard key={x.label} item={x} />)}{!guide.qualitySignals.length && <Empty text="No supported testing, CI, license, or quality configuration was detected." />}</div></section></div>
  </div>
}

function ImpactExplorer({ result }: { result: RepoResult }) {
  const { analysis } = result
  const candidates = analysis.symbols.filter(x => x.exported || analysis.advanced.calls.some(c => c.caller.includes(`#${x.name}:`) || c.callee.includes(`#${x.name}:`)))
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(candidates[0] ? `${candidates[0].file}#${candidates[0].name}:${candidates[0].line}` : '')
  const selected = analysis.symbols.find(x => `${x.file}#${x.name}:${x.line}` === selectedId)
  const relatedCalls = analysis.advanced.calls.filter(x => x.caller === selectedId || x.callee === selectedId)
  const callers = relatedCalls.filter(x => x.callee === selectedId)
  const callees = relatedCalls.filter(x => x.caller === selectedId)
  const affectedFiles = useMemo(() => {
    if (!selected) return []
    const found = new Set([selected.file]); let frontier = [selected.file]
    for (let depth = 0; depth < 3; depth++) { const next = analysis.imports.filter(x => frontier.includes(x.target)).map(x => x.source).filter(x => !found.has(x)); next.forEach(x => found.add(x)); frontier = next }
    callers.forEach(x => found.add(x.callerFile)); return [...found]
  }, [selected, analysis.imports, callers])
  const tests = analysis.advanced.testLinks.filter(x => affectedFiles.includes(x.source))
  const flows = analysis.flows.filter(x => x.steps.some(step => step.file && affectedFiles.includes(step.file)))
  const selectedFile = analysis.fileInsights.find(x => x.path === selected?.file)
  const risk = selected ? Math.min(100, Math.round((selectedFile?.complexity || 0) * 2 + (selectedFile?.importedBy.length || 0) * 6 + callers.length * 5 + (tests.length ? 0 : 20))) : 0
  const graph = useMemo(() => {
    if (!selected) return { nodes: [] as Node[], edges: [] as Edge[] }
    const ns: Node[] = [{ id: selectedId, type: 'repoNode', position: { x: 360, y: 180 }, data: { label: selected.name, detail: selected.file, kind: selected.kind } }]; const es: Edge[] = []
    callers.slice(0, 8).forEach((call, i) => { if (!ns.some(x => x.id === call.caller)) ns.push({ id: call.caller, type: 'repoNode', position: { x: 20, y: i * 120 }, data: { label: symbolLabel(call.caller), detail: call.callerFile, kind: 'caller' } }); es.push({ id: `in-${i}`, source: call.caller, target: selectedId, animated: true }) })
    callees.slice(0, 8).forEach((call, i) => { if (!ns.some(x => x.id === call.callee)) ns.push({ id: call.callee, type: 'repoNode', position: { x: 710, y: i * 120 }, data: { label: symbolLabel(call.callee), detail: call.calleeFile || call.callee, kind: 'callee' } }); es.push({ id: `out-${i}`, source: selectedId, target: call.callee, animated: true }) })
    return { nodes: ns, edges: es }
  }, [selected, selectedId, callers, callees])
  const visible = candidates.filter(x => `${x.name} ${x.file}`.toLowerCase().includes(query.toLowerCase())).slice(0, 300)
  return <div className="full-page"><div className="page-title"><div><div className="section-kicker">CHANGE IMPACT ANALYSIS</div><h1>Developer Impact Explorer</h1><p>Select a symbol to see callers, downstream dependencies, affected files, relevant tests and execution flows.</p></div>{selected && <span className={`risk-badge ${risk > 65 ? 'high' : risk > 35 ? 'medium' : 'low'}`}>{risk}% change risk</span>}</div>
    <div className="impact-layout"><aside className="symbol-browser"><label className="search-box"><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a function, class or component…" /></label><div className="file-count">{visible.length} matching symbols</div>{visible.map(symbol => { const id = `${symbol.file}#${symbol.name}:${symbol.line}`; return <button className={selectedId === id ? 'active' : ''} key={id} onClick={() => setSelectedId(id)}><span>{symbol.kind}</span><b>{symbol.name}</b><small>{symbol.file} · L{symbol.line}</small></button> })}</aside>
      <section className="impact-main">{selected ? <><div className="impact-heading"><div><span>{selected.kind}{selected.exported ? ' · public/exported' : ''}</span><h2>{selected.name}</h2><code>{selected.file}:{selected.line}</code><p>{selected.signature}</p></div><div className="impact-numbers"><div><b>{callers.length}</b><small>callers</small></div><div><b>{callees.length}</b><small>calls</small></div><div><b>{affectedFiles.length}</b><small>affected files</small></div><div><b>{tests.length}</b><small>linked tests</small></div></div></div><div className="call-graph"><ReactFlow key={selectedId} nodes={graph.nodes} edges={graph.edges} nodeTypes={nodeTypes} fitView minZoom={0.3} maxZoom={1.4}><Background color="#243a34" gap={22} /><Controls /></ReactFlow></div><div className="impact-panels"><ImpactList title="Potentially affected files" items={affectedFiles} empty="No transitive dependents found." /><ImpactList title="Tests to run" items={[...new Set(tests.map(x => x.test))]} empty="No tests could be linked. Review test coverage before changing this symbol." /><ImpactList title="Affected system flows" items={flows.map(x => x.name)} empty="No inferred system flows contain this symbol's dependency chain." /></div></> : <Empty text="No callable or exported symbols were extracted." />}</section>
    </div>
  </div>
}

function symbolLabel(id: string) { return id.includes('#') ? id.split('#')[1].replace(/:\d+$/, '') : id }
function ImpactList({ title, items, empty }: { title: string; items: string[]; empty: string }) { return <article><h3>{title}</h3>{items.slice(0, 12).map(x => <code key={x}>{x}</code>)}{!items.length && <p>{empty}</p>}</article> }

function CodeHealthView({ result }: { result: RepoResult }) {
  const { advanced } = result.analysis
  const [section, setSection] = useState<'risks' | 'tests' | 'runtime' | 'api'>('risks')
  return <div className="full-page"><div className="page-title"><div><div className="section-kicker">ENGINEERING INTELLIGENCE</div><h1>Code health</h1><p>Static indicators for maintainability, architecture, testing and runtime boundaries.</p></div><div className="health-score"><strong>{advanced.metrics.maintainability}</strong><span>Maintainability<br />indicator</span></div></div>
    <div className="health-metrics"><article><span>TEST RATIO</span><b>{advanced.metrics.testRatio}%</b><small>test files / source files</small></article><article><span>AVG COMPLEXITY</span><b>{advanced.metrics.averageComplexity}</b><small>branch and symbol proxy</small></article><article><span>DEPENDENCY DEPTH</span><b>{advanced.metrics.maxDependencyDepth}</b><small>maximum file chain</small></article><article><span>CYCLES</span><b>{advanced.cycles.length}</b><small>circular dependency groups</small></article><article><span>VIOLATIONS</span><b>{advanced.violations.length}</b><small>architecture review items</small></article></div>
    <div className="health-tabs">{(['risks', 'tests', 'runtime', 'api'] as const).map(x => <button className={section === x ? 'active' : ''} onClick={() => setSection(x)} key={x}>{x === 'api' ? 'Public API' : x}</button>)}</div>
    {section === 'risks' && <div className="health-columns"><HealthSection title="Dependency cycles" count={advanced.cycles.length}>{advanced.cycles.map((cycle, i) => <article className="cycle-card" key={i}>{cycle.map((x, j) => <span key={`${x}-${j}`}><code>{x}</code>{j < cycle.length - 1 && <ChevronRight />}</span>)}</article>)}</HealthSection><HealthSection title="Architecture violations" count={advanced.violations.length}>{advanced.violations.map((x, i) => <article className={`violation-card ${x.severity}`} key={`${x.source}-${x.target}-${i}`}><b>{x.rule}</b><p>{x.detail}</p><code>{x.source}</code><span>depends on</span><code>{x.target}</code></article>)}</HealthSection><HealthSection title="Possible dead symbols" count={advanced.deadCandidates.length}>{advanced.deadCandidates.map(x => <article className="simple-row" key={`${x.file}-${x.name}-${x.line}`}><span>{x.kind}</span><div><b>{x.name}</b><code>{x.file}:{x.line}</code></div></article>)}</HealthSection><HealthSection title="Duplicated logic" count={advanced.duplications.length}>{advanced.duplications.map((x, i) => <article className="duplicate-card" key={i}><b>{x.files.length} files share this block</b>{x.files.map(f => <code key={f}>{f}</code>)}<pre>{x.sample}</pre></article>)}</HealthSection></div>}
    {section === 'tests' && <div className="health-columns"><HealthSection title="Source-to-test links" count={advanced.testLinks.length}>{advanced.testLinks.map((x, i) => <article className="test-link" key={`${x.source}-${x.test}-${i}`}><code>{x.source}</code><span>{x.confidence}</span><code>{x.test}</code></article>)}</HealthSection><HealthSection title="Untested core files" count={advanced.untestedFiles.length}>{advanced.untestedFiles.map(x => <article className="simple-row" key={x}><AlertTriangle /><code>{x}</code></article>)}</HealthSection></div>}
    {section === 'runtime' && <div className="health-columns"><EvidenceSection title="External boundaries" items={advanced.externalBoundaries} /><EvidenceSection title="Observability" items={advanced.observability} /><EvidenceSection title="Concurrency" items={advanced.concurrency} /><section className="panel"><div className="panel-head"><div><span className="section-kicker">RUNTIME CONTROL</span><h3>Feature flags</h3></div><b>{advanced.featureFlags.length}</b></div><div className="config-list">{advanced.featureFlags.map(x => <article key={x.name}><span><KeyRound /></span><div><b>{x.name}</b><small>{x.files.join(', ')}</small></div></article>)}{!advanced.featureFlags.length && <Empty text="No conventional environment-based feature flags found." />}</div></section></div>}
    {section === 'api' && <div className="api-surface"><div className="api-summary"><b>{advanced.publicApi.length}</b><span>exported or public symbols</span></div><div className="api-table"><div><span>Kind</span><span>Symbol</span><span>Location</span><span>Signature</span></div>{advanced.publicApi.map(x => <article key={`${x.file}-${x.name}-${x.line}`}><span>{x.kind}</span><b>{x.name}</b><code>{x.file}:{x.line}</code><small>{x.signature}</small></article>)}</div></div>}
  </div>
}

function HealthSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) { return <section className="panel health-section"><div className="panel-head"><h3>{title}</h3><b>{count}</b></div><div>{count ? children : <Empty text={`No ${title.toLowerCase()} detected.`} />}</div></section> }
function EvidenceSection({ title, items }: { title: string; items: Finding[] }) { return <section className="panel"><div className="panel-head"><h3>{title}</h3><b>{items.length}</b></div><div className="stack-list">{items.map(x => <FindingCard key={x.label} item={x} />)}{!items.length && <Empty text={`No supported ${title.toLowerCase()} signals found.`} />}</div></section> }

function HistoryView({ result }: { result: RepoResult }) {
  const commits = result.history
  const contributors = [...commits.reduce((map, commit) => map.set(commit.author, (map.get(commit.author) || 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1])
  const dates = commits.map(x => new Date(x.date).getTime()).filter(Number.isFinite).sort((a, b) => b - a)
  const spanDays = dates.length > 1 ? Math.max(1, Math.round((dates[0] - dates[dates.length - 1]) / 86_400_000)) : 0
  const cadence = spanDays ? Math.round(commits.length / spanDays * 10) / 10 : 0
  const themes = [['fix', /fix|bug|crash|regression/i], ['feature', /feat|add|implement|support/i], ['refactor', /refactor|cleanup|simplif/i], ['docs', /docs?|readme/i], ['tests', /tests?|spec/i]].map(([label, rx]) => ({ label: String(label), count: commits.filter(x => (rx as RegExp).test(x.message)).length }))
  return <div className="full-page"><div className="page-title"><div><div className="section-kicker">RECENT REPOSITORY ACTIVITY</div><h1>Git history intelligence</h1><p>A lightweight view of the latest public commits without requiring GitHub credentials.</p></div><span className="notice-pill"><CircleDot /> {commits.length} recent commits</span></div>{commits.length ? <><div className="history-stats"><article><b>{contributors.length}</b><small>recent contributors</small></article><article><b>{spanDays}</b><small>days represented</small></article><article><b>{cadence}</b><small>commits per day</small></article>{themes.map(x => <article key={x.label}><b>{x.count}</b><small>{x.label} commits</small></article>)}</div><div className="history-layout"><section className="panel commit-list"><div className="panel-head"><h3>Timeline</h3></div>{commits.map(commit => <a href={commit.url} target="_blank" rel="noreferrer" key={commit.sha}><span>{commit.sha.slice(0, 7)}</span><div><b>{commit.message}</b><small>{commit.author} · {commit.date ? new Date(commit.date).toLocaleDateString() : 'Unknown date'}</small></div><ExternalLink /></a>)}</section><section className="panel contributor-list"><div className="panel-head"><h3>Recent contributors</h3></div>{contributors.map(([name, count], i) => <article key={name}><span>{i + 1}</span><div><b>{name}</b><small>{count} commit{count === 1 ? '' : 's'} in sample</small></div><em style={{ width: `${count / contributors[0][1] * 100}%` }} /></article>)}</section></div></> : <Empty text="Recent commit history was unavailable, usually because of API rate limits or repository settings." />}</div>
}

function Architecture({ result }: { result: RepoResult }) {
  const { meta, analysis } = result
  const [mode, setMode] = useState<'system' | 'modules' | 'components'>('modules')
  const { nodes, edges } = useMemo(() => {
    const ns: Node[] = []; const es: Edge[] = []
    const place = (i: number) => ({ x: (i % 4) * 240, y: Math.floor(i / 4) * 170 })
    if (mode === 'system') {
      ns.push({ id: 'repo', type: 'repoNode', position: { x: 360, y: 0 }, data: { label: meta.name, detail: 'Repository root', kind: 'repository' } })
      analysis.stack.slice(0, 5).forEach((x, i) => { const id = `stack-${i}`; ns.push({ id, type: 'repoNode', position: { x: 30 + i * 210, y: 170 }, data: { label: x.label, detail: x.detail, kind: 'technology' } }); es.push({ id: `e-${id}`, source: 'repo', target: id, animated: true }) })
      analysis.entrypoints.slice(0, 5).forEach((x, i) => { const id = `entry-${i}`; ns.push({ id, type: 'repoNode', position: { x: 30 + i * 210, y: 360 }, data: { label: x.split('/').pop() || x, detail: x, kind: 'entry point' } }); es.push({ id: `e-${id}`, source: 'repo', target: id }) })
    } else if (mode === 'modules') {
      const shown = analysis.modules.slice(0, 24)
      shown.forEach((m, i) => ns.push({ id: m.name, type: 'repoNode', position: place(i), data: { label: m.name, detail: `${m.files} files · ${m.symbols} symbols`, kind: 'module' } }))
      shown.forEach(m => m.dependencies.filter(d => shown.some(x => x.name === d)).forEach(d => es.push({ id: `${m.name}-${d}`, source: m.name, target: d, animated: false })))
    } else {
      const shown = analysis.fileInsights.slice(0, 28)
      shown.forEach((f, i) => ns.push({ id: f.path, type: 'repoNode', position: place(i), data: { label: f.path.split('/').pop() || f.path, detail: `${f.symbols.length} symbols · complexity ${f.complexity}`, kind: f.category } }))
      const ids = new Set(shown.map(x => x.path)); analysis.imports.filter(x => ids.has(x.source) && ids.has(x.target)).forEach((x, i) => es.push({ id: `import-${i}`, source: x.source, target: x.target }))
    }
    return { nodes: ns, edges: es }
  }, [analysis, meta.name, mode])
  return <div className="full-page"><div className="page-title"><div><div className="section-kicker">INTERACTIVE SYSTEM MAP</div><h1>Architecture</h1><p>Switch layers to move from the platform view into modules and individual components.</p></div><span className="notice-pill"><CircleDot /> {nodes.length} nodes · {edges.length} links</span></div><div className="graph-toolbar"><span>Graph layer</span>{(['system', 'modules', 'components'] as const).map(x => <button className={mode === x ? 'active' : ''} key={x} onClick={() => setMode(x)}>{x}</button>)}</div><div className="graph-wrap"><ReactFlow key={mode} nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.25} maxZoom={1.5}><Background color="#243a34" gap={24} /><Controls /></ReactFlow></div></div>
}

function RepositoryView({ files, query, setQuery, selected, setSelected, insights }: { files: RepoFile[]; query: string; setQuery: (x: string) => void; selected: RepoFile | null; setSelected: (x: RepoFile | null) => void; insights: FileInsight[] }) {
  const insight = selected ? insights.find(x => x.path === selected.path) : undefined
  return <div className="full-page"><div className="page-title"><div><div className="section-kicker">SOURCE EXPLORER</div><h1>Repository</h1><p>Search indexed paths and inspect the prioritized files fetched for analysis.</p></div></div><div className="repo-explorer">
    <section className="file-browser"><label className="search-box"><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search file paths…" /></label><div className="file-count">{files.length} matching files</div><div className="file-rows">{files.map(f => <button key={f.path} className={selected?.path === f.path ? 'active' : ''} onClick={() => setSelected(f)}>{f.content ? <FileCode2 /> : <File />}<span>{f.path}</span><small>{f.size ? `${Math.ceil(f.size / 1024)} KB` : ''}</small><ChevronRight /></button>)}</div></section>
    <section className="code-viewer">{selected ? <><div className="code-head"><span><FileJson /> {selected.path}</span><small>{selected.content ? 'Analyzed source' : 'Path indexed · content not fetched'}</small></div>{insight && <div className="file-explanation"><div><span>{insight.category}</span><p>{insight.purpose}</p></div><div className="file-metrics"><b>{insight.lines}<small>lines</small></b><b>{insight.symbols.length}<small>symbols</small></b><b>{insight.imports.length}<small>imports</small></b><b>{insight.importedBy.length}<small>consumers</small></b><b>{insight.complexity}<small>complexity</small></b></div>{insight.symbols.length > 0 && <div className="symbol-chips">{insight.symbols.slice(0, 20).map(s => <span key={`${s.name}-${s.line}`}><em>{s.kind}</em>{s.name}<small>L{s.line}</small></span>)}</div>}</div>}{selected.content ? <pre><code>{selected.content.slice(0, 120_000)}</code></pre> : <Empty text="This lower-priority file was indexed but not downloaded, preserving the browser resource budget." />}</> : <div className="viewer-empty"><Folder /><h3>Select a file</h3><p>Files with a green code icon were fetched and analyzed.</p></div>}</section>
  </div></div>
}

function ComponentsView({ result }: { result: RepoResult }) {
  const { analysis } = result
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [selected, setSelected] = useState<FileInsight | null>(analysis.fileInsights[0] || null)
  const categories = ['all', ...new Set(analysis.fileInsights.map(x => x.category))]
  const visible = analysis.fileInsights.filter(x => (category === 'all' || x.category === category) && `${x.path} ${x.symbols.map(s => s.name).join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="full-page"><div className="page-title"><div><div className="section-kicker">COMPONENT INTELLIGENCE</div><h1>Components</h1><p>Understand the purpose, public symbols, dependencies and consumers of each analyzed file.</p></div><span className="notice-pill"><CircleDot /> {analysis.fileInsights.length} analyzed files</span></div>
    <div className="module-strip">{analysis.modules.slice(0, 8).map(m => <article key={m.name}><span>{m.name}</span><b>{m.sourceFiles}</b><small>analyzed files</small><em>{m.symbols} symbols · {m.dependencies.length} dependencies</em></article>)}</div>
    <div className="component-toolbar"><label className="search-box"><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search components or symbols…" /></label><div>{categories.map(x => <button className={category === x ? 'active' : ''} onClick={() => setCategory(x)} key={x}>{x}</button>)}</div></div>
    <div className="component-layout"><section className="component-list"><div className="component-list-head"><span>Component</span><span>Purpose</span><span>Symbols</span><span>Links</span></div>{visible.slice(0, 250).map(file => <button key={file.path} className={selected?.path === file.path ? 'active' : ''} onClick={() => setSelected(file)}><span><FileCode2 /><b>{file.path.split('/').pop()}</b><small>{file.path}</small></span><p>{file.purpose}</p><em>{file.symbols.length}</em><em>{file.imports.length + file.importedBy.length}</em></button>)}</section>
      <aside className="component-detail">{selected ? <><span className="category-tag">{selected.category}</span><h2>{selected.path.split('/').pop()}</h2><code>{selected.path}</code><p>{selected.purpose}</p><div className="detail-stats"><div><b>{selected.lines}</b><small>lines</small></div><div><b>{selected.complexity}</b><small>complexity</small></div><div><b>{selected.importedBy.length}</b><small>consumers</small></div></div><h3>Symbols</h3><div className="detail-symbols">{selected.symbols.map(s => <div key={`${s.name}-${s.line}`}><span>{s.kind}</span><b>{s.name}</b><small>line {s.line}{s.exported ? ' · exported' : ''}</small></div>)}{!selected.symbols.length && <p>No supported symbols extracted.</p>}</div><h3>Depends on</h3><div className="path-list">{selected.imports.map(x => <code key={x}>{x}</code>)}{!selected.imports.length && <small>No resolved local imports.</small>}</div><h3>Used by</h3><div className="path-list">{selected.importedBy.map(x => <code key={x}>{x}</code>)}{!selected.importedBy.length && <small>No analyzed consumers.</small>}</div></> : <Empty text="Select a component to inspect it." />}</aside>
    </div>
  </div>
}

function FlowsView({ result }: { result: RepoResult }) {
  const { flows } = result.analysis
  const [selected, setSelected] = useState(0)
  const flow = flows[selected]
  return <div className="full-page"><div className="page-title"><div><div className="section-kicker">BEHAVIOR MAP</div><h1>System flows</h1><p>Follow inferred request and startup paths across route, service and data boundaries.</p></div><span className="notice-pill"><CircleDot /> {flows.length} flows</span></div>
    {flow ? <div className="flows-layout"><section className="flow-index">{flows.map((item, i) => <button key={`${item.name}-${i}`} className={selected === i ? 'active' : ''} onClick={() => setSelected(i)}><span>{String(i + 1).padStart(2, '0')}</span><div><b>{item.name}</b><small>{item.steps.length} steps · {item.confidence} confidence</small></div><ChevronRight /></button>)}</section><section className="flow-canvas"><div className="flow-heading"><span className={`confidence ${flow.confidence}`}>{flow.confidence} confidence</span><h2>{flow.name}</h2><p>{flow.description}</p></div><div className="flow-steps">{flow.steps.map((step, i) => <div className={`flow-step ${step.kind}`} key={`${step.label}-${i}`}><div className="flow-line"><span>{i + 1}</span>{i < flow.steps.length - 1 && <i />}</div><article><small>{step.kind}</small><h3>{step.label}</h3><p>{step.detail}</p>{step.file && <code>{step.file}</code>}</article></div>)}</div><div className="inference-note"><AlertTriangle /><p>Flows are conservative static inferences based on declarations and resolved local imports. Runtime dispatch, dependency injection and dynamic imports may add paths that cannot be proven without executing code.</p></div></section></div> : <Empty text="No route or startup flows could be inferred from the fetched source." />}
  </div>
}

function DataView({ result }: { result: RepoResult }) {
  const { models, config, diagnostics } = result.analysis
  return <div className="full-page"><div className="page-title"><div><div className="section-kicker">STATE & CONFIGURATION</div><h1>Data and configuration</h1><p>Detected data shapes, environment inputs and analysis coverage.</p></div></div>
    <div className="diagnostics-grid"><article><span>INDEXED</span><b>{diagnostics.indexedFiles.toLocaleString()}</b><small>repository files</small></article><article><span>PARSED</span><b>{diagnostics.parsedFiles}</b><small>prioritized text files</small></article><article><span>SYMBOLS</span><b>{diagnostics.symbols}</b><small>code entities</small></article><article><span>LINKS</span><b>{diagnostics.relationships}</b><small>local relationships</small></article></div>
    {diagnostics.warnings.length > 0 && <div className="diagnostic-warnings">{diagnostics.warnings.map(x => <span key={x}><AlertTriangle />{x}</span>)}</div>}
    <div className="data-columns"><section className="panel"><div className="panel-head"><div><span className="section-kicker">DATA MODELS</span><h3>Entities and shapes</h3></div><b>{models.length}</b></div><div className="model-list">{models.map((model, i) => <article key={`${model.file}-${model.name}-${i}`}><div><Database /><span><b>{model.name}</b><small>{model.kind}</small></span></div><code>{model.file}</code><div>{model.fields.map(f => <span key={f}>{f}</span>)}</div></article>)}{!models.length && <Empty text="No supported ORM or schema declarations were found." />}</div></section>
      <section className="panel"><div className="panel-head"><div><span className="section-kicker">ENVIRONMENT INPUTS</span><h3>Runtime configuration</h3></div><b>{config.length}</b></div><div className="config-list">{config.map(item => <article key={item.name}><span className={item.sensitive ? 'sensitive' : ''}>{item.sensitive ? <KeyRound /> : <Braces />}</span><div><b>{item.name}</b><small>{item.files.length} reference{item.files.length === 1 ? '' : 's'}</small><div>{item.files.slice(0, 3).map(x => <code key={x}>{x}</code>)}</div></div></article>)}{!config.length && <Empty text="No supported environment-variable reads were detected." />}</div></section>
    </div>
  </div>
}

function FindingsView({ title, subtitle, items, empty }: { title: string; subtitle: string; items: Finding[]; empty: string }) {
  return <div className="full-page"><div className="page-title"><div><div className="section-kicker">STATIC ANALYSIS</div><h1>{title}</h1><p>{subtitle}</p></div><span className="notice-pill"><CircleDot /> {items.length} findings</span></div><div className="findings-grid">{items.map((item, i) => <FindingCard key={`${item.label}-${i}`} item={item} />)}{!items.length && <Empty text={empty} />}</div></div>
}

function ListView({ title, subtitle, icon, items, empty }: { title: string; subtitle: string; icon: React.ReactNode; items: string[]; empty: string }) {
  return <div className="full-page"><div className="page-title"><div><div className="section-kicker">MANIFEST ANALYSIS</div><h1>{title}</h1><p>{subtitle}</p></div></div><div className="package-grid">{items.map(item => <div key={item}><span>{icon}</span><b>{item}</b></div>)}{!items.length && <Empty text={empty} />}</div></div>
}

function Empty({ text }: { text: string }) { return <div className="empty-state"><AlertTriangle /><p>{text}</p></div> }
