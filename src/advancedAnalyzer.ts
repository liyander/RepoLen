import type { AdvancedAnalysis, ArchitectureViolation, CodeSymbol, ConfigUsage, FileInsight, Finding, GraphLink, RepoFile, SymbolCall, TestLink } from './types'

interface Context {
  tree: RepoFile[]
  textFiles: Array<{ path: string; text: string }>
  files: FileInsight[]
  symbols: CodeSymbol[]
  imports: GraphLink[]
  config: ConfigUsage[]
  entrypoints: string[]
}

const testPath = /((^|\/)(tests?|specs?|__tests__)\/|\.(test|spec)\.|_test\.(go|py)$|Test\.java$)/i
const callKeywords = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'sizeof', 'function', 'def', 'class', 'super', 'this', 'new', 'match', 'assert'])
const symbolId = (symbol: CodeSymbol) => `${symbol.file}#${symbol.name}:${symbol.line}`

export function analyzeAdvanced(ctx: Context): AdvancedAnalysis {
  const calls = extractCalls(ctx)
  const cycles = findCycles(ctx.imports)
  const testLinks = linkTests(ctx)
  const tested = new Set(testLinks.map(x => x.source))
  const untestedFiles = ctx.files.filter(x => !testPath.test(x.path) && ['core', 'service', 'data', 'module', 'hardware'].includes(x.category) && !tested.has(x.path)).slice(0, 150).map(x => x.path)
  const incomingCalls = new Set(calls.map(x => x.callee))
  const deadCandidates = ctx.symbols.filter(s => !s.exported && !incomingCalls.has(symbolId(s)) && !ctx.entrypoints.includes(s.file) && !testPath.test(s.file) && !/^(main|setup|loop|init|constructor|render)$/.test(s.name)).slice(0, 120)
  const violations = findViolations(ctx)
  const duplications = findDuplications(ctx.textFiles)
  const publicApi = ctx.symbols.filter(x => x.exported).slice(0, 500)
  const externalBoundaries = findEvidence(ctx.textFiles, [
    ['Outbound HTTP', 'Network clients or absolute service URLs are present', /https?:\/\/[\w.-]+|\b(fetch|axios|requests\.|HttpClient|URLSession|reqwest|curl_easy)\b/i, 'blue'],
    ['Cloud services', 'Cloud provider SDK or service integration detected', /\b(aws-sdk|boto3|google\.cloud|azure\.|Firebase|S3Client|DynamoDB|Cloudflare)\b/i, 'violet'],
    ['Messaging', 'Message broker, queue, or event-stream integration detected', /\b(kafka|rabbitmq|amqp|nats|pubsub|sqs|celery|bullmq|redis.*publish)\b/i, 'amber'],
    ['Native boundary', 'Foreign-function, native library, or operating-system boundary detected', /\b(ffi|extern\s+["']C|DllImport|PInvoke|ctypes|JNI|unsafe\s*\{)\b/i, 'amber'],
  ])
  const observability = findEvidence(ctx.textFiles, [
    ['Structured logging', 'Application logging calls or logging framework detected', /\b(logger\.|logging\.|log\.(info|warn|error)|tracing::|ILogger|os_log|printk)\b/i, 'green'],
    ['Tracing', 'Distributed tracing or span instrumentation detected', /\b(opentelemetry|OpenTelemetry|startSpan|tracer\.|@trace|instrument\()\b/i, 'violet'],
    ['Metrics', 'Metrics instrumentation or exporter detected', /\b(prometheus|micrometer|statsd|counter\(|histogram\(|gauge\()\b/i, 'blue'],
    ['Error reporting', 'External error reporting integration detected', /\b(sentry|bugsnag|rollbar|crashlytics)\b/i, 'amber'],
  ])
  const concurrency = findEvidence(ctx.textFiles, [
    ['Async execution', 'Asynchronous functions, tasks, or futures detected', /\b(async|await|Future<|CompletableFuture|Task<|tokio::|goroutine)\b/i, 'blue'],
    ['Threads', 'Explicit thread creation or worker management detected', /\b(Thread|pthread_|std::thread|threading\.|Worker\(|Isolate\.spawn)\b/i, 'amber'],
    ['Synchronization', 'Locks, mutexes, semaphores, or atomic operations detected', /\b(mutex|semaphore|synchronized|atomic|RwLock|Mutex<|lock_guard|Monitor\.)\b/i, 'violet'],
    ['Queues / channels', 'In-process channel or queue communication detected', /\b(channel\(|mpsc|BlockingQueue|asyncio\.Queue|DispatchQueue|HandlerThread)\b/i, 'green'],
  ])
  const featureFlags = ctx.config.filter(x => /(FEATURE|FLAG|ENABLE|DISABLE|EXPERIMENT|ROLLOUT)/i.test(x.name))
  const averageComplexity = ctx.files.length ? ctx.files.reduce((n, x) => n + x.complexity, 0) / ctx.files.length : 0
  const testCount = ctx.tree.filter(x => x.type === 'blob' && testPath.test(x.path)).length
  const sourceCount = ctx.tree.filter(x => x.type === 'blob' && /\.(tsx?|jsx?|py|go|rs|java|kt|c|cc|cpp|cxx|cs|swift|dart|rb|php)$/i.test(x.path) && !testPath.test(x.path)).length
  const testRatio = sourceCount ? Math.min(100, Math.round(testCount / sourceCount * 100)) : 0
  const maintainability = Math.max(0, Math.min(100, Math.round(100 - averageComplexity * 1.4 - cycles.length * 4 - violations.length * 1.5 - duplications.length + Math.min(testRatio, 20))))
  return { calls, cycles, testLinks, untestedFiles, deadCandidates, violations, duplications, publicApi, externalBoundaries, observability, concurrency, featureFlags, metrics: { maintainability, testRatio, averageComplexity: Math.round(averageComplexity * 10) / 10, maxDependencyDepth: dependencyDepth(ctx.imports) } }
}

function extractCalls(ctx: Context): SymbolCall[] {
  const byName = new Map<string, CodeSymbol[]>()
  ctx.symbols.forEach(s => byName.set(s.name, [...(byName.get(s.name) || []), s]))
  const byFile = new Map<string, CodeSymbol[]>()
  ctx.symbols.forEach(s => byFile.set(s.file, [...(byFile.get(s.file) || []), s].sort((a, b) => a.line - b.line)))
  const output: SymbolCall[] = []; const seen = new Set<string>()
  ctx.textFiles.forEach(({ path, text }) => {
    const local = byFile.get(path) || []
    text.split('\n').forEach((lineText, index) => {
      const line = index + 1; const caller = [...local].reverse().find(x => x.line <= line)
      if (!caller) return
      for (const match of lineText.matchAll(/\b([A-Za-z_$][\w$]*)\s*(?:<[^;()]+>)?\s*\(/g)) {
        const name = match[1]; if (callKeywords.has(name) || name === caller.name) continue
        const candidates = byName.get(name) || []; if (!candidates.length) continue
        const sameFile = candidates.find(x => x.file === path); const callee = sameFile || (candidates.length === 1 ? candidates[0] : undefined)
        const key = `${symbolId(caller)}>${callee ? symbolId(callee) : name}@${line}`; if (seen.has(key)) continue; seen.add(key)
        output.push({ caller: symbolId(caller), callee: callee ? symbolId(callee) : name, callerFile: path, calleeFile: callee?.file, line, confidence: sameFile ? 'resolved' : callee ? 'name-match' : 'inferred' })
        if (output.length >= 2500) return
      }
    })
  })
  return output
}

function findCycles(edges: GraphLink[]) {
  const graph = new Map<string, string[]>(); edges.forEach(x => graph.set(x.source, [...(graph.get(x.source) || []), x.target]))
  const cycles: string[][] = []; const visiting = new Set<string>(); const visited = new Set<string>(); const stack: string[] = []
  const visit = (node: string) => {
    if (visiting.has(node)) { const start = stack.indexOf(node); const cycle = [...stack.slice(start), node]; const key = [...new Set(cycle)].sort().join('|'); if (!cycles.some(x => [...new Set(x)].sort().join('|') === key)) cycles.push(cycle); return }
    if (visited.has(node) || cycles.length >= 50) return
    visiting.add(node); stack.push(node); (graph.get(node) || []).forEach(visit); stack.pop(); visiting.delete(node); visited.add(node)
  }
  graph.forEach((_, node) => visit(node)); return cycles
}

function linkTests(ctx: Context): TestLink[] {
  const tests = ctx.tree.filter(x => x.type === 'blob' && testPath.test(x.path)).map(x => x.path); const links: TestLink[] = []
  tests.forEach(test => {
    ctx.imports.filter(x => x.source === test).forEach(x => links.push({ source: x.target, test, confidence: 'imported' }))
    const base = test.split('/').pop()?.replace(/(\.test|\.spec|_test|Test)?\.[^.]+$/, '').toLowerCase(); if (!base) return
    const matches = ctx.files.filter(x => !testPath.test(x.path) && x.path.split('/').pop()?.replace(/\.[^.]+$/, '').toLowerCase() === base)
    matches.forEach(x => { if (!links.some(l => l.source === x.path && l.test === test)) links.push({ source: x.path, test, confidence: 'name-match' }) })
  }); return links.slice(0, 500)
}

function findViolations(ctx: Context): ArchitectureViolation[] {
  const insight = new Map(ctx.files.map(x => [x.path, x])); const output: ArchitectureViolation[] = []
  ctx.imports.forEach(edge => {
    const source = insight.get(edge.source); const target = insight.get(edge.target); if (!source || !target) return
    const add = (rule: string, detail: string, severity: ArchitectureViolation['severity'] = 'review') => output.push({ rule, source: edge.source, target: edge.target, detail, severity })
    if (source.category === 'ui' && target.category === 'data') add('UI → data coupling', 'Presentation code directly depends on persistence code.', 'warning')
    if (source.category === 'core' && ['platform', 'ui', 'infrastructure'].includes(target.category)) add('Core isolation', `Core logic depends on ${target.category} concerns.`, 'warning')
    if (source.category === 'service' && target.category === 'ui') add('Dependency direction', 'Service logic depends on presentation code.')
    if (!testPath.test(source.path) && testPath.test(target.path)) add('Production → test dependency', 'Production code imports test-only code.', 'warning')
    if (source.category === 'hardware' && target.category === 'ui') add('Hardware → UI coupling', 'Low-level hardware code depends on presentation code.')
  }); return output.slice(0, 150)
}

function findDuplications(files: Array<{ path: string; text: string }>) {
  const blocks = new Map<string, Set<string>>(); const samples = new Map<string, string>()
  files.filter(x => !testPath.test(x.path)).forEach(file => {
    const lines = file.text.split('\n').map(x => x.trim().replace(/\s+/g, ' ')).filter(x => x.length > 18 && !/^[{}()[\],;]+$/.test(x) && !/^(\/\/|#|\*)/.test(x))
    for (let i = 0; i <= lines.length - 4; i += 2) { const raw = lines.slice(i, i + 4).join('\n'); const key = raw.replace(/["'][^"']+["']/g, 'STR').replace(/\b\d+\b/g, 'N'); blocks.set(key, new Set([...(blocks.get(key) || []), file.path])); samples.set(key, raw.slice(0, 240)) }
  })
  return [...blocks].filter(([, paths]) => paths.size > 1).sort((a, b) => b[1].size - a[1].size).slice(0, 30).map(([key, paths]) => ({ files: [...paths], sharedBlocks: 1, sample: samples.get(key) || '' }))
}

function findEvidence(files: Array<{ path: string; text: string }>, rules: Array<[string, string, RegExp, Finding['tone']]>) {
  return rules.flatMap(([label, detail, regex, tone]) => { const hits = files.filter(x => regex.test(x.text)).slice(0, 5).map(x => x.path); return hits.length ? [{ label, detail, evidence: hits, tone }] : [] })
}

function dependencyDepth(edges: GraphLink[]) {
  const graph = new Map<string, string[]>(); edges.forEach(x => graph.set(x.source, [...(graph.get(x.source) || []), x.target]))
  const depth = (node: string, seen: Set<string>): number => { if (seen.has(node)) return 0; const next = new Set(seen).add(node); return 1 + Math.max(0, ...(graph.get(node) || []).map(x => depth(x, next))) }
  return Math.min(100, Math.max(0, ...[...graph.keys()].map(x => depth(x, new Set()))))
}
