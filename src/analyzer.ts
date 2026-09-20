import type { Analysis, CodeSymbol, ConfigUsage, DataModel, FileInsight, Finding, GraphLink, ModuleInsight, RepoFile, RepoMeta, SystemFlow } from './types'
import { analyzeUniversalSoftware } from './universalAnalyzer'
import { analyzeAdvanced } from './advancedAnalyzer'

const extensions: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript', py: 'Python', go: 'Go', rs: 'Rust',
  java: 'Java', css: 'CSS', scss: 'SCSS', html: 'HTML', vue: 'Vue', svelte: 'Svelte', json: 'JSON', sql: 'SQL',
  yml: 'YAML', yaml: 'YAML', md: 'Markdown', sh: 'Shell', toml: 'TOML', c: 'C', h: 'C/C++ Header', cpp: 'C++', cc: 'C++', cxx: 'C++', hpp: 'C++ Header',
  cs: 'C#', fs: 'F#', kt: 'Kotlin', kts: 'Kotlin', swift: 'Swift', dart: 'Dart', rb: 'Ruby', php: 'PHP', lua: 'Lua', r: 'R', scala: 'Scala', ex: 'Elixir', exs: 'Elixir', ino: 'Arduino',
}

function has(files: RepoFile[], pattern: RegExp) { return files.filter(f => pattern.test(f.path)) }
function evidence(files: RepoFile[], pattern: RegExp) { return has(files, pattern).slice(0, 3).map(f => f.path) }
function contents(files: RepoFile[]) { return files.filter(f => f.content).map(f => ({ path: f.path, text: f.content! })) }

function lineAt(text: string, index: number) { return text.slice(0, index).split('\n').length }

function categoryFor(path: string): FileInsight['category'] {
  if (/(^|\/)(main|app|server|index|manage|program|__main__|cli|appdelegate|application)\.(tsx?|jsx?|py|go|rs|c|cc|cpp|cxx|cs|java|kt|swift|dart|rb|php)$/i.test(path)) return 'entrypoint'
  if (/(^|\/)(components?|views?|pages?|screens?|ui)\//i.test(path) || /\.(tsx|jsx|vue|svelte)$/i.test(path)) return 'ui'
  if (/(^|\/)(routes?|controllers?|api|handlers?)\//i.test(path)) return 'api'
  if (/(^|\/)(services?|use-?cases?|domain)\//i.test(path)) return 'service'
  if (/(^|\/)(models?|entities|database|db|repositories|schema)\//i.test(path)) return 'data'
  if (/(^|\/)(config|settings)\//i.test(path) || /(?:config|\.env|tsconfig|package\.json)/i.test(path)) return 'config'
  if (/((^|\/)(__tests__|tests?|spec)\/|\.(test|spec)\.)/i.test(path)) return 'test'
  if (/Dockerfile|\.github\/workflows|docker-compose|\.gitlab-ci/i.test(path)) return 'infrastructure'
  if (/(^|\/)(platform|native|android|ios|windows|macos|linux)\//i.test(path)) return 'platform'
  if (/(^|\/)(drivers?|hal|bsp|firmware|boards?)\//i.test(path) || /\.ino$/i.test(path)) return 'hardware'
  if (/(^|\/)(tools?|scripts?|buildSrc)\//i.test(path)) return 'tooling'
  if (/(^|\/)(core|engine|kernel)\//i.test(path)) return 'core'
  return 'module'
}

function purposeFor(path: string, category: FileInsight['category'], symbols: CodeSymbol[]) {
  const labels: Record<FileInsight['category'], string> = {
    entrypoint: 'Bootstraps the application and connects its primary modules', ui: 'Renders user interface and handles presentation behavior',
    api: 'Accepts external requests and coordinates request handling', service: 'Implements application or domain behavior',
    data: 'Defines or accesses persistent application data', config: 'Configures build or runtime behavior',
    test: 'Verifies expected application behavior', infrastructure: 'Defines build, deployment, or runtime infrastructure',
    core: 'Implements central software behavior and shared runtime rules', platform: 'Connects shared behavior to a target operating system or platform',
    hardware: 'Interfaces with hardware, firmware, boards, or low-level device behavior', tooling: 'Automates development, generation, packaging, or maintenance tasks',
    module: 'Provides reusable application logic',
  }
  const named = symbols.slice(0, 3).map(s => s.name)
  return named.length ? `${labels[category]}. Key symbols: ${named.join(', ')}.` : labels[category]
}

function extractSymbols(path: string, text: string): CodeSymbol[] {
  const output: CodeSymbol[] = []
  const add = (name: string, kind: CodeSymbol['kind'], index: number, signature: string, exported = false) => {
    if (!output.some(x => x.name === name && x.line === lineAt(text, index)) && output.length < 150) output.push({ name, kind, file: path, line: lineAt(text, index), signature: signature.trim().slice(0, 180), exported })
  }
  if (/\.(tsx?|jsx?)$/i.test(path)) {
    for (const m of text.matchAll(/(^|\n)\s*(export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g)) add(m[3], /^[A-Z]/.test(m[3]) && /\.(tsx|jsx)$/.test(path) ? 'component' : 'function', m.index, `${m[3]}(${m[4]})`, Boolean(m[2]))
    for (const m of text.matchAll(/(^|\n)\s*(export\s+)?class\s+([A-Za-z_$][\w$]*)/g)) add(m[3], 'class', m.index, `class ${m[3]}`, Boolean(m[2]))
    for (const m of text.matchAll(/(^|\n)\s*(export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g)) add(m[3], /^[A-Z]/.test(m[3]) && /\.(tsx|jsx)$/.test(path) ? 'component' : 'function', m.index, `${m[3]}(${m[4]})`, Boolean(m[2]))
  } else if (/\.py$/i.test(path)) {
    for (const m of text.matchAll(/(^|\n)(\s*)(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/g)) add(m[3], m[2].length ? 'method' : 'function', m.index, `${m[3]}(${m[4]})`, !m[3].startsWith('_'))
    for (const m of text.matchAll(/(^|\n)\s*class\s+([A-Za-z_]\w*)(?:\(([^)]*)\))?/g)) add(m[2], 'class', m.index, `class ${m[2]}${m[3] ? `(${m[3]})` : ''}`, !m[2].startsWith('_'))
  } else if (/\.go$/i.test(path)) {
    for (const m of text.matchAll(/(^|\n)func\s+(?:\([^)]+\)\s*)?([A-Za-z_]\w*)\s*\(([^)]*)\)/g)) add(m[2], /^[A-Z]/.test(m[2]) ? 'function' : 'method', m.index, `${m[2]}(${m[3]})`, /^[A-Z]/.test(m[2]))
    for (const m of text.matchAll(/(^|\n)type\s+([A-Za-z_]\w*)\s+struct/g)) add(m[2], 'class', m.index, `struct ${m[2]}`, /^[A-Z]/.test(m[2]))
  } else if (/\.java$/i.test(path)) {
    for (const m of text.matchAll(/(?:public\s+)?(?:abstract\s+)?(?:class|interface|record)\s+([A-Za-z_]\w*)/g)) add(m[1], 'class', m.index, m[0], /public/.test(m[0]))
    for (const m of text.matchAll(/(?:public|protected|private)\s+(?:static\s+)?[\w<>?,.\[\]]+\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/g)) add(m[1], 'method', m.index, `${m[1]}(${m[2]})`, m[0].startsWith('public'))
  } else if (/\.(c|cc|cpp|cxx|h|hpp)$/i.test(path)) {
    for (const m of text.matchAll(/(?:^|\n)\s*(?:template\s*<[^>]+>\s*)?(?:static\s+|inline\s+|virtual\s+|constexpr\s+)*[\w:*&<>\[\]]+\s+([A-Za-z_]\w*(?:::\w+)?)\s*\(([^;{}]*)\)\s*(?:const\s*)?\{/g)) add(m[1], m[1].includes('::') ? 'method' : 'function', m.index, `${m[1]}(${m[2]})`, !/\bstatic\b/.test(m[0]))
    for (const m of text.matchAll(/(?:class|struct)\s+([A-Za-z_]\w*)/g)) add(m[1], 'class', m.index, m[0], /class/.test(m[0]))
  } else if (/\.(cs|fs)$/i.test(path)) {
    for (const m of text.matchAll(/(?:public\s+|internal\s+|private\s+|protected\s+)?(?:abstract\s+|sealed\s+|static\s+|partial\s+)*(?:class|interface|record|struct)\s+([A-Za-z_]\w*)/g)) add(m[1], 'class', m.index, m[0], /^public/.test(m[0]))
    for (const m of text.matchAll(/(?:public|internal|private|protected)\s+(?:static\s+|async\s+|virtual\s+|override\s+)*[\w<>?,.\[\]]+\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/g)) add(m[1], 'method', m.index, `${m[1]}(${m[2]})`, m[0].startsWith('public'))
  } else if (/\.(kt|kts)$/i.test(path)) {
    for (const m of text.matchAll(/(?:^|\n)\s*(?:public\s+|private\s+|internal\s+)?(?:data\s+|sealed\s+|abstract\s+)?(?:class|interface|object)\s+([A-Za-z_]\w*)/g)) add(m[1], 'class', m.index, m[0], !/private/.test(m[0]))
    for (const m of text.matchAll(/(?:^|\n)\s*(?:public\s+|private\s+|internal\s+|suspend\s+|override\s+)*fun\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/g)) add(m[1], 'function', m.index, `${m[1]}(${m[2]})`, !/private/.test(m[0]))
  } else if (/\.swift$/i.test(path)) {
    for (const m of text.matchAll(/(?:^|\n)\s*(?:(?:public|open|private|internal)\s+)?(?:class|struct|protocol|enum|actor)\s+([A-Za-z_]\w*)/g)) add(m[1], 'class', m.index, m[0], /public|open/.test(m[0]))
    for (const m of text.matchAll(/(?:^|\n)\s*(?:(?:public|open|private|internal)\s+)?func\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/g)) add(m[1], 'function', m.index, `${m[1]}(${m[2]})`, /public|open/.test(m[0]))
  } else if (/\.dart$/i.test(path)) {
    for (const m of text.matchAll(/(?:^|\n)\s*(?:abstract\s+)?class\s+([A-Za-z_]\w*)/g)) add(m[1], 'class', m.index, m[0], !m[1].startsWith('_'))
    for (const m of text.matchAll(/(?:^|\n)\s*(?:Future<[^>]+>|Future|void|int|String|bool|Widget|dynamic)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/g)) add(m[1], /^[A-Z]/.test(m[1]) ? 'component' : 'function', m.index, `${m[1]}(${m[2]})`, !m[1].startsWith('_'))
  } else if (/\.(rb|php)$/i.test(path)) {
    for (const m of text.matchAll(/(?:^|\n)\s*(?:class|module)\s+([A-Za-z_]\w*)/g)) add(m[1], 'class', m.index, m[0], true)
    for (const m of text.matchAll(/(?:^|\n)\s*(?:def|function)\s+([A-Za-z_]\w*)\s*(?:\(([^)]*)\))?/g)) add(m[1], 'function', m.index, `${m[1]}(${m[2] || ''})`, !m[1].startsWith('_'))
  } else if (/\.rs$/i.test(path)) {
    for (const m of text.matchAll(/(?:^|\n)\s*(pub\s+)?(?:async\s+)?fn\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/g)) add(m[2], 'function', m.index, `${m[2]}(${m[3]})`, Boolean(m[1]))
    for (const m of text.matchAll(/(?:^|\n)\s*(pub\s+)?(?:struct|enum|trait)\s+([A-Za-z_]\w*)/g)) add(m[2], 'class', m.index, m[0], Boolean(m[1]))
  }
  return output
}

function normalizePath(path: string) {
  const parts: string[] = []
  path.split('/').forEach(part => { if (part === '..') parts.pop(); else if (part !== '.') parts.push(part) })
  return parts.join('/')
}

function resolveImport(source: string, target: string, known: Set<string>) {
  const base = source.split('/').slice(0, -1).join('/')
  const clean = target.replace(/^crate::/, '').replace(/::/g, '/').replace(/\./g, '/')
  const candidate = normalizePath(`${base}/${target.startsWith('.') ? target : clean}`)
  const attempts = [candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.js`, `${candidate}.jsx`, `${candidate}.py`, `${candidate}.rs`, `${candidate}.go`, `${candidate}.java`, `${candidate}.kt`, `${candidate}.swift`, `${candidate}.dart`, `${candidate}.cs`, `${candidate}.c`, `${candidate}.cpp`, `${candidate}.h`, `${candidate}.hpp`, `${candidate}/index.ts`, `${candidate}/index.tsx`, `${candidate}/index.js`, `${candidate}/mod.rs`]
  const exact = attempts.find(x => known.has(x))
  if (exact) return exact
  if (target.startsWith('.')) return candidate
  const basename = clean.split('/').pop()?.toLowerCase()
  const matches = [...known].filter(x => x.split('/').pop()?.replace(/\.[^.]+$/, '').toLowerCase() === basename)
  return matches.length === 1 ? matches[0] : null
}

function extractRawImports(path: string, text: string) {
  const output = new Set<string>()
  const patterns = [/from\s+['"]([^'"]+)['"]/g, /import\s+['"]([^'"]+)['"]/g, /require\(['"]([^'"]+)['"]\)/g, /from\s+([\w.]+)\s+import/g, /#include\s+["<]([^">]+)[">]/g, /(?:^|\n)\s*using\s+([\w.]+)\s*;/g, /(?:^|\n)\s*import\s+([\w.]+)\s*;/g, /(?:^|\n)\s*use\s+([\w:]+)/g, /(?:^|\n)\s*mod\s+([A-Za-z_]\w*)\s*;/g]
  patterns.forEach(rx => { for (const m of text.matchAll(rx)) output.add(m[1]) })
  if (/\.py$/i.test(path)) for (const m of text.matchAll(/(?:^|\n)\s*import\s+([\w.]+)/g)) output.add(m[1])
  return [...output]
}

function topModule(path: string) { const parts = path.split('/'); return parts.length > 1 ? parts[0] : '(root)' }

export function analyzeRepository(meta: RepoMeta, tree: RepoFile[], fetched: RepoFile[]): Analysis {
  const counts = new Map<string, number>()
  tree.filter(f => f.type === 'blob').forEach(f => {
    const ext = f.path.split('.').pop()?.toLowerCase() || ''
    const lang = extensions[ext]
    if (lang) counts.set(lang, (counts.get(lang) || 0) + 1)
  })
  const total = [...counts.values()].reduce((a, b) => a + b, 0) || 1
  const languages = [...counts].map(([name, count]) => ({ name, count, percent: Math.round(count / total * 100) })).sort((a, b) => b.count - a.count).slice(0, 8)
  const textFiles = contents(fetched)
  const joined = textFiles.map(f => f.text).join('\n')
  const stack: Finding[] = []
  const addStack = (label: string, detail: string, regex: RegExp, fileRegex: RegExp, tone: Finding['tone'] = 'green') => {
    if (regex.test(joined) || has(tree, fileRegex).length) stack.push({ label, detail, evidence: evidence(fetched, fileRegex).length ? evidence(fetched, fileRegex) : textFiles.filter(f => regex.test(f.text)).slice(0, 2).map(f => f.path), tone })
  }
  addStack('React', 'Component-based web interface', /["']react["']|from\s+["']react/, /\.(tsx|jsx)$/i)
  addStack('Next.js', 'React application framework', /["']next["']/, /next\.config\./i, 'violet')
  addStack('Express', 'Node.js HTTP server', /["']express["']|express\(\)/, /package\.json$/i, 'amber')
  addStack('FastAPI', 'Typed Python API framework', /from\s+fastapi|FastAPI\(/, /requirements\.txt|pyproject\.toml/i, 'blue')
  addStack('Django', 'Python web framework', /django|DJANGO_SETTINGS_MODULE/, /manage\.py|settings\.py/i, 'green')
  addStack('Vite', 'Frontend build tooling', /["']vite["']/, /vite\.config\./i, 'violet')
  addStack('Electron', 'Cross-platform desktop runtime', /["']electron["']|BrowserWindow/, /electron-builder|package\.json/i, 'blue')
  addStack('Tauri', 'Rust-powered desktop application framework', /tauri::|["']@tauri-app\//, /src-tauri\/tauri\.conf/i, 'amber')
  addStack('Flutter', 'Cross-platform mobile and desktop UI toolkit', /package:flutter\//, /pubspec\.yaml$/i, 'blue')
  addStack('Android', 'Native Android application', /android\.app\.|androidx\.|@Composable/, /AndroidManifest\.xml$/i, 'green')
  addStack('SwiftUI', 'Apple platform declarative UI', /import\s+SwiftUI|@main\s+struct/, /\.xcodeproj\//i, 'violet')
  addStack('.NET', '.NET application platform', /using\s+System|Microsoft\.Extensions/, /\.(csproj|sln)$/i, 'violet')
  addStack('Spring', 'JVM application framework', /org\.springframework|@SpringBootApplication/, /pom\.xml|build\.gradle/i, 'green')
  addStack('Qt', 'Cross-platform native UI framework', /QApplication|#include\s+[<"]Q\w+/, /\.pro$|CMakeLists\.txt/i, 'blue')
  addStack('Unity', 'Real-time game engine', /UnityEngine|MonoBehaviour/, /ProjectSettings\/ProjectVersion\.txt/i, 'violet')
  addStack('Unreal Engine', 'Native game engine', /UnrealEngine|UCLASS\(|GENERATED_BODY/, /\.uproject$/i, 'blue')
  addStack('Godot', 'Cross-platform game engine', /extends\s+(Node|CharacterBody)|Godot\./, /project\.godot$/i, 'green')
  addStack('PyTorch', 'Machine learning framework', /import\s+torch|from\s+torch/, /requirements.*\.txt|pyproject\.toml/i, 'amber')
  addStack('TensorFlow', 'Machine learning framework', /import\s+tensorflow|from\s+tensorflow/, /requirements.*\.txt|pyproject\.toml/i, 'amber')
  addStack('Arduino', 'Microcontroller application framework', /#include\s+[<"]Arduino\.h|\bvoid\s+(setup|loop)\s*\(/, /\.ino$|platformio\.ini/i, 'blue')

  const dependencies = new Set<string>()
  textFiles.forEach(({ path, text }) => {
    if (path.endsWith('package.json')) try { const p = JSON.parse(text); Object.keys({ ...(p.dependencies || {}), ...(p.devDependencies || {}) }).forEach(x => dependencies.add(x)) } catch { /* ignore malformed manifests */ }
    if (/requirements[^/]*\.txt$/i.test(path)) text.split('\n').map(x => x.trim().split(/[=<>~!\[]/)[0]).filter(x => x && !x.startsWith('#')).forEach(x => dependencies.add(x))
    if (/Cargo\.toml$/i.test(path)) for (const m of text.matchAll(/^([A-Za-z][\w-]*)\s*=\s*(?:["'{])/gm)) if (!['name', 'version', 'edition', 'workspace'].includes(m[1])) dependencies.add(m[1])
    if (/go\.mod$/i.test(path)) for (const m of text.matchAll(/^\s*([\w.-]+\/[\w./-]+)\s+v\d/gm)) dependencies.add(m[1])
    if (/pubspec\.yaml$/i.test(path)) { const block = text.match(/dependencies:\s*\n([\s\S]*?)(?:\ndev_dependencies:|\n\S)/)?.[1] || ''; for (const m of block.matchAll(/^\s{2}([\w-]+):/gm)) dependencies.add(m[1]) }
    if (/\.(csproj|fsproj)$/i.test(path)) for (const m of text.matchAll(/PackageReference\s+Include=["']([^"']+)/g)) dependencies.add(m[1])
    if (/pom\.xml$/i.test(path)) for (const m of text.matchAll(/<dependency>[\s\S]*?<groupId>([^<]+)<\/groupId>[\s\S]*?<artifactId>([^<]+)<\/artifactId>/g)) dependencies.add(`${m[1]}:${m[2]}`)
  })
  const entrypoints = tree.filter(f => /(^|\/)(main|app|server|index|manage|program|__main__|cli|appdelegate|application)\.(tsx?|jsx?|py|go|rs|c|cc|cpp|cxx|cs|java|kt|swift|dart|rb|php)$/i.test(f.path) || /(^|\/)(main_activity|mainactivity)\.(java|kt)$/i.test(f.path) || /(^|\/)src\/main\.rs$/i.test(f.path)).slice(0, 40).map(f => f.path)
  const knownPaths = new Set(tree.map(f => f.path))
  const symbols = textFiles.flatMap(({ path, text }) => extractSymbols(path, text)).slice(0, 3000)
  const symbolMap = new Map<string, CodeSymbol[]>()
  symbols.forEach(symbol => symbolMap.set(symbol.file, [...(symbolMap.get(symbol.file) || []), symbol]))
  const imports: GraphLink[] = []
  const rawImports = new Map<string, string[]>()
  textFiles.forEach(({ path, text }) => {
    const found = extractRawImports(path, text)
    rawImports.set(path, found)
    found.forEach(target => {
      const resolved = resolveImport(path, target, knownPaths)
      if (resolved && imports.length < 500) imports.push({ source: path, target: resolved })
    })
  })
  const fileInsights: FileInsight[] = textFiles.map(({ path, text }) => {
    const fileSymbols = symbolMap.get(path) || []
    const category = categoryFor(path)
    const outgoing = imports.filter(x => x.source === path).map(x => x.target)
    const incoming = imports.filter(x => x.target === path).map(x => x.source)
    const branches = (text.match(/\b(if|else if|for|while|case|catch|except)\b/g) || []).length
    return { path, purpose: purposeFor(path, category, fileSymbols), category, lines: text.split('\n').length, symbols: fileSymbols, imports: outgoing, importedBy: incoming, complexity: Math.max(1, branches + fileSymbols.length) }
  }).sort((a, b) => b.importedBy.length - a.importedBy.length || b.symbols.length - a.symbols.length)

  const moduleMap = new Map<string, FileInsight[]>()
  fileInsights.forEach(file => { const key = topModule(file.path); moduleMap.set(key, [...(moduleMap.get(key) || []), file]) })
  const modules: ModuleInsight[] = [...moduleMap].map(([name, moduleFiles]) => {
    const deps = new Set<string>(); const dependents = new Set<string>()
    moduleFiles.flatMap(f => f.imports).forEach(target => { const module = topModule(target); if (module !== name) deps.add(module) })
    imports.filter(x => topModule(x.target) === name && topModule(x.source) !== name).forEach(x => dependents.add(topModule(x.source)))
    const dominant = [...new Set(moduleFiles.map(f => f.category))].slice(0, 3).join(', ')
    return { name, path: name, purpose: `Contains ${dominant || 'application'} concerns`, files: tree.filter(f => f.type === 'blob' && topModule(f.path) === name).length, sourceFiles: moduleFiles.length, symbols: moduleFiles.reduce((n, f) => n + f.symbols.length, 0), dependencies: [...deps], dependents: [...dependents] }
  }).sort((a, b) => b.sourceFiles - a.sourceFiles).slice(0, 80)
  const endpoints: Finding[] = []
  textFiles.forEach(({ path, text }) => {
    const routeRx = /(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)|@(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)/gi
    for (const m of text.matchAll(routeRx)) endpoints.push({ label: `${(m[1] || m[3]).toUpperCase()} ${m[2] || m[4]}`, detail: 'Detected route declaration', evidence: [path], tone: 'blue' })
  })
  const infrastructure: Finding[] = []
  if (has(tree, /(^|\/)Dockerfile$/i).length) infrastructure.push({ label: 'Docker', detail: 'Container image definition', evidence: evidence(tree, /Dockerfile$/i), tone: 'blue' })
  if (has(tree, /docker-compose\.ya?ml$/i).length) infrastructure.push({ label: 'Docker Compose', detail: 'Multi-service local environment', evidence: evidence(tree, /docker-compose\.ya?ml$/i), tone: 'violet' })
  if (has(tree, /^\.github\/workflows\/.*\.ya?ml$/i).length) infrastructure.push({ label: 'GitHub Actions', detail: 'Automated CI/CD workflows', evidence: evidence(tree, /^\.github\/workflows\//i), tone: 'green' })
  const security: Finding[] = []
  const securityRules: Array<[string, string, RegExp, Finding['tone']]> = [
    ['Authentication', 'Authentication or token handling is present', /jwt|oauth|passport|authenticate|authorization/i, 'green'],
    ['Environment secrets', 'Configuration reads from environment variables', /process\.env|os\.environ|getenv\(/i, 'amber'],
    ['Command execution', 'Review process-spawning boundaries', /child_process|exec\(|spawn\(|subprocess\.|os\.system/i, 'amber'],
    ['File system', 'Application reads or writes local files', /\bfs\.|readFile|writeFile|open\(/i, 'blue'],
    ['Database access', 'Persistent data access detected', /prisma|mongoose|sequelize|sqlalchemy|typeorm|postgres|mysql|sqlite/i, 'violet'],
  ]
  securityRules.forEach(([label, detail, rx, tone]) => { const hits = textFiles.filter(f => rx.test(f.text)).slice(0, 4).map(f => f.path); if (hits.length) security.push({ label, detail, evidence: hits, tone }) })

  const models: DataModel[] = []
  textFiles.forEach(({ path, text }) => {
    for (const m of text.matchAll(/model\s+([A-Za-z_]\w*)\s*\{([^}]+)\}/g)) models.push({ name: m[1], kind: 'Prisma model', file: path, fields: m[2].split('\n').map(x => x.trim().split(/\s+/)[0]).filter(x => x && !x.startsWith('//')).slice(0, 20) })
    for (const m of text.matchAll(/class\s+([A-Za-z_]\w*)\s*\((?:[^)]*(?:BaseModel|Model|DeclarativeBase)[^)]*)\)\s*:/g)) {
      const body = text.slice(m.index, m.index + 2500); const fields = [...body.matchAll(/^\s{4}([A-Za-z_]\w*)\s*(?::|=)/gm)].map(x => x[1]).slice(0, 20)
      models.push({ name: m[1], kind: /BaseModel/.test(m[0]) ? 'Pydantic model' : 'Python ORM model', file: path, fields })
    }
    for (const m of text.matchAll(/(?:interface|type)\s+([A-Za-z_]\w*(?:Model|Entity|Record|DTO|Data))\s*(?:=)?\s*\{([^}]+)\}/g)) models.push({ name: m[1], kind: 'TypeScript data shape', file: path, fields: [...m[2].matchAll(/([A-Za-z_]\w*)\??\s*:/g)].map(x => x[1]).slice(0, 20) })
    for (const m of text.matchAll(/(?:new\s+)?(?:mongoose\.)?Schema\s*\(\s*\{([^}]+)\}/g)) models.push({ name: path.split('/').pop()?.split('.')[0] || 'Schema', kind: 'Mongoose schema', file: path, fields: [...m[1].matchAll(/([A-Za-z_]\w*)\s*:/g)].map(x => x[1]).slice(0, 20) })
  })

  const configMap = new Map<string, Set<string>>()
  textFiles.forEach(({ path, text }) => {
    const vars = [
      ...[...text.matchAll(/(?:process\.env|import\.meta\.env)\.([A-Z][A-Z0-9_]*)/g)].map(m => m[1]),
      ...[...text.matchAll(/(?:getenv|environ\.get)\(\s*['"]([A-Z][A-Z0-9_]*)['"]/g)].map(m => m[1]),
      ...[...text.matchAll(/os\.environ\[\s*['"]([A-Z][A-Z0-9_]*)['"]\s*\]/g)].map(m => m[1]),
    ]
    vars.forEach(name => configMap.set(name, new Set([...(configMap.get(name) || []), path])))
  })
  const config: ConfigUsage[] = [...configMap].map(([name, paths]) => ({ name, files: [...paths], sensitive: /(SECRET|TOKEN|KEY|PASSWORD|CREDENTIAL|DATABASE_URL)/i.test(name) })).sort((a, b) => Number(b.sensitive) - Number(a.sensitive) || a.name.localeCompare(b.name))

  const flows: SystemFlow[] = []
  endpoints.slice(0, 30).forEach(endpoint => {
    const routeFile = endpoint.evidence[0]
    const insight = fileInsights.find(f => f.path === routeFile)
    const service = insight?.imports.map(x => fileInsights.find(f => f.path === x)).find(x => x?.category === 'service')
    const data = [...(service?.imports || []), ...(insight?.imports || [])].map(x => fileInsights.find(f => f.path === x)).find(x => x?.category === 'data')
    flows.push({ name: endpoint.label, description: `Request path inferred from route declaration and local imports in ${routeFile}`, confidence: service || data ? 'medium' : 'inferred', steps: [
      { label: 'External request', detail: 'Untrusted input enters the application', kind: 'input' },
      { label: endpoint.label, file: routeFile, detail: 'Route handler receives the request', kind: 'route' },
      ...(service ? [{ label: service.path.split('/').pop() || service.path, file: service.path, detail: service.purpose, kind: 'service' as const }] : []),
      ...(data ? [{ label: data.path.split('/').pop() || data.path, file: data.path, detail: data.purpose, kind: 'data' as const }] : []),
      { label: 'Response', detail: 'Result returns to the caller', kind: 'output' },
    ] })
  })
  if (!flows.length) entrypoints.slice(0, 10).forEach(entry => {
    const insight = fileInsights.find(f => f.path === entry); const downstream = insight?.imports.slice(0, 3) || []
    flows.push({ name: `Startup from ${entry.split('/').pop()}`, description: 'Application startup path inferred from local imports', confidence: 'inferred', steps: [
      { label: entry.split('/').pop() || entry, file: entry, detail: 'Application entry point', kind: 'input' },
      ...downstream.map(path => ({ label: path.split('/').pop() || path, file: path, detail: fileInsights.find(f => f.path === path)?.purpose || 'Imported module', kind: 'component' as const })),
      { label: 'Application ready', detail: 'Startup sequence completes', kind: 'output' },
    ] })
  })
  const universal = analyzeUniversalSoftware({ tree, textFiles, fileInsights, symbols, entrypoints, existingFlows: flows })
  const existingFlowNames = new Set(flows.map(x => x.name))
  universal.additionalFlows.forEach(flow => { if (!existingFlowNames.has(flow.name)) flows.push(flow) })
  const advanced = analyzeAdvanced({ tree, textFiles, files: fileInsights, symbols, imports, config, entrypoints })
  const primary = stack.slice(0, 3).map(s => s.label).join(', ') || languages.slice(0, 2).map(l => l.name).join(' and ')
  const summary = `${meta.name} is primarily a ${universal.profile.primaryKind}${primary ? ` built with ${primary}` : ''}. It contains ${tree.filter(f => f.type === 'blob').length.toLocaleString()} indexed files across ${modules.length} top-level modules. RepoLens extracted ${symbols.length.toLocaleString()} symbols and ${imports.length.toLocaleString()} local relationships${entrypoints.length ? ` from ${entrypoints.length} likely entry point${entrypoints.length === 1 ? '' : 's'}` : ''}.`
  const warnings = [fetched.length < 20 ? 'Few source files were available for deep analysis.' : '', tree.length >= 20000 ? 'Repository tree reached the 20,000 item browser limit.' : '', imports.length >= 500 ? 'Import relationships were capped at 500.' : ''].filter(Boolean)
  return { languages, stack, dependencies: [...dependencies].sort().slice(0, 300), entrypoints, imports, endpoints: endpoints.slice(0, 100), infrastructure, security, symbols, fileInsights, modules, models: models.slice(0, 150), config: config.slice(0, 200), flows: flows.slice(0, 60), profile: universal.profile, developerGuide: universal.guide, advanced, summary, fetchedFiles: fetched.length, diagnostics: { indexedFiles: tree.filter(f => f.type === 'blob').length, fetchedFiles: fetched.length, parsedFiles: textFiles.length, symbols: symbols.length, relationships: imports.length, warnings } }
}
