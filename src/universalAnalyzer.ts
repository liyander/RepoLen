import type { CodeSymbol, DeveloperGuide, DevCommand, FileInsight, Finding, ProjectProfile, RepoFile, SoftwareKind, SystemFlow } from './types'

interface UniversalContext {
  tree: RepoFile[]
  textFiles: Array<{ path: string; text: string }>
  fileInsights: FileInsight[]
  symbols: CodeSymbol[]
  entrypoints: string[]
  existingFlows: SystemFlow[]
}

const pathEvidence = (tree: RepoFile[], rx: RegExp) => tree.filter(x => rx.test(x.path)).slice(0, 4).map(x => x.path)
const hasPath = (tree: RepoFile[], rx: RegExp) => tree.some(x => rx.test(x.path))

export function analyzeUniversalSoftware(ctx: UniversalContext): { profile: ProjectProfile; guide: DeveloperGuide; additionalFlows: SystemFlow[] } {
  const { tree, textFiles, fileInsights, symbols, entrypoints } = ctx
  const joined = textFiles.map(x => x.text).join('\n')
  const kinds = new Set<SoftwareKind>()
  const platforms = new Set<string>()
  const packageManagers = new Set<string>()
  const buildTools: Finding[] = []
  const architecture = new Set<string>()
  const addBuild = (label: string, detail: string, rx: RegExp, tone: Finding['tone'] = 'green') => {
    const evidence = pathEvidence(tree, rx); if (evidence.length) buildTools.push({ label, detail, evidence, tone })
  }

  if (hasPath(tree, /package\.json$/i)) packageManagers.add('npm-compatible')
  if (hasPath(tree, /pnpm-lock\.yaml|pnpm-workspace\.yaml/i)) packageManagers.add('pnpm')
  if (hasPath(tree, /yarn\.lock/i)) packageManagers.add('Yarn')
  if (hasPath(tree, /requirements.*\.txt|pyproject\.toml|Pipfile/i)) packageManagers.add('Python package manager')
  if (hasPath(tree, /Cargo\.toml$/i)) packageManagers.add('Cargo')
  if (hasPath(tree, /go\.mod$/i)) packageManagers.add('Go modules')
  if (hasPath(tree, /pom\.xml$/i)) packageManagers.add('Maven')
  if (hasPath(tree, /build\.gradle|settings\.gradle/i)) packageManagers.add('Gradle')
  if (hasPath(tree, /\.csproj$|\.fsproj$|\.sln$/i)) packageManagers.add('NuGet')
  if (hasPath(tree, /Gemfile$/i)) packageManagers.add('Bundler')
  if (hasPath(tree, /composer\.json$/i)) packageManagers.add('Composer')
  if (hasPath(tree, /pubspec\.yaml$/i)) packageManagers.add('Dart pub')
  if (hasPath(tree, /Package\.swift$/i)) packageManagers.add('Swift Package Manager')

  addBuild('CMake', 'Cross-platform native build configuration', /(^|\/)CMakeLists\.txt$|\.cmake$/i, 'blue')
  addBuild('Make', 'Make-based build automation', /(^|\/)Makefile$|\.mk$/i, 'amber')
  addBuild('Gradle', 'JVM or Android build system', /build\.gradle(?:\.kts)?$/i, 'green')
  addBuild('Maven', 'JVM build and dependency management', /pom\.xml$/i, 'amber')
  addBuild('.NET', 'MSBuild solution or project', /\.(sln|csproj|fsproj|vbproj)$/i, 'violet')
  addBuild('Cargo', 'Rust package and build configuration', /Cargo\.toml$/i, 'amber')
  addBuild('Go', 'Go module build', /go\.mod$/i, 'blue')
  addBuild('Xcode', 'Apple platform project', /\.xcodeproj\/|\.xcworkspace\//i, 'blue')
  addBuild('Flutter', 'Cross-platform Dart application', /pubspec\.yaml$/i, 'blue')
  addBuild('Bazel', 'Hermetic multi-language build', /(^|\/)(WORKSPACE|MODULE\.bazel|BUILD\.bazel)$/i, 'green')
  addBuild('Meson', 'Native build configuration', /meson\.build$/i, 'green')

  const web = hasPath(tree, /(^|\/)(index\.html|next\.config\.|vite\.config\.|angular\.json|src\/pages\/)/i) || /\b(react|vue|svelte|angular)\b/i.test(joined)
  const backend = /\b(express|fastapi|flask|django|springframework|aspnet|actix_web|gin\.Default|grpc)\b/i.test(joined)
  if (web) kinds.add('web application')
  if (backend) kinds.add('backend service')
  if (hasPath(tree, /electron-builder|src-tauri\/|\.xcodeproj\//i) || /\b(Electron|tauri|QApplication|GtkApplication|WindowBuilder|WPF|UseWindowsForms|UseWPF|Microsoft\.UI\.Xaml)\b/.test(joined)) kinds.add('desktop application')
  if (hasPath(tree, /AndroidManifest\.xml|\.xcodeproj\/|pubspec\.yaml$/i) || /\b(Flutter|ReactNative|android\.app\.Application|UIApplicationDelegate)\b/.test(joined)) kinds.add('mobile application')
  if (/\b(argparse|click\.command|typer\.Typer|commander|yargs|cobra\.Command|clap::|System\.CommandLine|Console\.Write|std::cout|fmt\.Print|println!)\b/.test(joined) || hasPath(tree, /(^|\/)(cli|cmd)\.(tsx?|js|py|rs|go)$/i)) kinds.add('CLI tool')
  if (hasPath(tree, /(^|\/)(lib|include)\/|\.podspec$|Package\.swift$|setup\.py$/i) || /"(main|module|exports|types)"\s*:/.test(joined)) kinds.add('library / SDK')
  if (hasPath(tree, /project\.godot$|\.uproject$|ProjectSettings\/ProjectVersion\.txt/i) || /\b(UnityEngine|Godot|MonoBehaviour|UnrealEngine)\b/.test(joined)) kinds.add('game')
  if (hasPath(tree, /platformio\.ini$|\.ino$|west\.yml$|sdkconfig|prj\.conf$/i) || /\b(Arduino|HAL_GPIO|FreeRTOS|Zephyr|ESP_IDF)\b/.test(joined)) kinds.add('embedded / firmware')
  if (hasPath(tree, /\.ipynb$|dbt_project\.yml$|dvc\.yaml$/i) || /\b(torch|tensorflow|sklearn|pandas|airflow|spark)\b/i.test(joined)) kinds.add('data / ML')
  if (hasPath(tree, /\.tf$|Chart\.yaml$|kustomization\.yaml|ansible|pulumi/i)) kinds.add('infrastructure')
  if (hasPath(tree, /pnpm-workspace\.yaml|lerna\.json|nx\.json|turbo\.json/i) || (hasPath(tree, /Cargo\.toml$/i) && /\[workspace\]/.test(joined))) kinds.add('monorepo')
  if (!kinds.size && entrypoints.length && hasPath(tree, /\.(c|cc|cpp|cxx|cs|fs|rs|go|java|kt|swift)$/i)) kinds.add('native application')
  if (!kinds.size) kinds.add('general software')

  if (hasPath(tree, /AndroidManifest\.xml/i)) platforms.add('Android')
  if (hasPath(tree, /\.xcodeproj\/|Info\.plist$/i)) platforms.add('Apple platforms')
  if (hasPath(tree, /pubspec\.yaml$/i)) platforms.add('Flutter')
  if (hasPath(tree, /\.csproj$/i)) platforms.add('.NET')
  if (hasPath(tree, /src-tauri\//i)) platforms.add('Tauri desktop')
  if (/electron/i.test(joined)) platforms.add('Electron desktop')
  if (hasPath(tree, /platformio\.ini|\.ino$/i)) platforms.add('Microcontroller')
  if (web) platforms.add('Web browser')
  if (backend) platforms.add('Server')

  if (fileInsights.some(x => x.category === 'ui') && fileInsights.some(x => x.category === 'service')) architecture.add('Layered architecture')
  if (hasPath(tree, /(^|\/)(packages|apps)\//i)) architecture.add('Workspace / packages')
  if (hasPath(tree, /(^|\/)(domain|application|infrastructure)\//i)) architecture.add('Domain-oriented architecture')
  if (/\b(event|emit|publish|subscribe|listener|handler)\b/i.test(joined)) architecture.add('Event-driven behavior')
  if (hasPath(tree, /plugins?\/|extensions?\//i)) architecture.add('Plugin architecture')
  if (!architecture.size) architecture.add('Module-based architecture')

  const orderedKinds = [...kinds]
  const primaryKind = orderedKinds.find(x => x !== 'monorepo' && x !== 'infrastructure') || orderedKinds[0]
  const strongEvidence = buildTools.length + platforms.size + Math.min(orderedKinds.length, 3)
  const profile: ProjectProfile = { primaryKind, kinds: orderedKinds, platforms: [...platforms], buildTools, packageManagers: [...packageManagers], architectureStyle: [...architecture], confidence: strongEvidence >= 4 ? 'high' : strongEvidence >= 2 ? 'medium' : 'inferred' }

  const commands = extractCommands(ctx, profile)
  const testFiles = tree.filter(x => x.type === 'blob' && /((^|\/)(tests?|specs?|__tests__)\/|\.(test|spec)\.|_test\.(go|py)$|Test\.java$)/i.test(x.path)).slice(0, 200).map(x => x.path)
  const documentation = tree.filter(x => x.type === 'blob' && /(^|\/)(README|CONTRIBUTING|ARCHITECTURE|DEVELOPMENT|CHANGELOG|docs?\/).*/i.test(x.path)).slice(0, 100).map(x => x.path)
  const readingCandidates: Array<{ path: string; reason: string; rank: number }> = []
  documentation.slice(0, 4).forEach((path, i) => readingCandidates.push({ path, reason: i === 0 ? 'Start with project intent and usage' : 'Understand project conventions and design', rank: i }))
  buildTools.flatMap(x => x.evidence).slice(0, 4).forEach(path => readingCandidates.push({ path, reason: 'Learn dependencies and the build lifecycle', rank: 10 }))
  entrypoints.slice(0, 5).forEach(path => readingCandidates.push({ path, reason: 'Trace application startup and composition', rank: 20 }))
  fileInsights.slice().sort((a, b) => b.importedBy.length - a.importedBy.length).slice(0, 6).forEach(path => readingCandidates.push({ path: path.path, reason: `${path.importedBy.length} analyzed components depend on this file`, rank: 30 }))
  testFiles.slice(0, 3).forEach(path => readingCandidates.push({ path, reason: 'See expected behavior expressed as tests', rank: 40 }))
  const seen = new Set<string>(); const readingOrder = readingCandidates.sort((a, b) => a.rank - b.rank).filter(x => !seen.has(x.path) && seen.add(x.path)).slice(0, 15).map(({ path, reason }) => ({ path, reason }))

  const hotspots = fileInsights.map(file => ({ path: file.path, complexity: file.complexity, consumers: file.importedBy.length, lines: file.lines, score: file.complexity * 2 + file.importedBy.length * 4 + Math.min(file.lines / 50, 10), reason: hotspotReason(file) })).filter(x => x.complexity > 5 || x.consumers > 2 || x.lines > 400).sort((a, b) => b.score - a.score).slice(0, 20)
  const extensionPoints = symbols.filter(s => /^(I[A-Z]|.*(?:Plugin|Provider|Adapter|Factory|Strategy|Hook|Extension|Handler|Driver))$/.test(s.name) || /abstract|interface|trait|protocol/i.test(s.signature || '')).slice(0, 40).map(s => ({ symbol: s.name, file: s.file, reason: `${s.kind} appears designed for substitution or extension` }))
  const qualitySignals: Finding[] = []
  if (testFiles.length) qualitySignals.push({ label: 'Automated tests', detail: `${testFiles.length} test files indexed`, evidence: testFiles.slice(0, 4), tone: 'green' })
  if (hasPath(tree, /^\.github\/workflows\/|\.gitlab-ci\.yml|Jenkinsfile/i)) qualitySignals.push({ label: 'Continuous integration', detail: 'Automated validation configuration is present', evidence: pathEvidence(tree, /^\.github\/workflows\/|\.gitlab-ci\.yml|Jenkinsfile/i), tone: 'blue' })
  if (hasPath(tree, /(^|\/)(LICENSE|COPYING)(\.|$)/i)) qualitySignals.push({ label: 'License', detail: 'Repository licensing information is present', evidence: pathEvidence(tree, /(^|\/)(LICENSE|COPYING)(\.|$)/i), tone: 'violet' })
  if (hasPath(tree, /eslint|prettier|ruff|black|clippy|golangci|checkstyle|editorconfig/i)) qualitySignals.push({ label: 'Code quality tooling', detail: 'Formatting or static-check configuration detected', evidence: pathEvidence(tree, /eslint|prettier|ruff|black|clippy|golangci|checkstyle|editorconfig/i), tone: 'amber' })

  return { profile, guide: { commands, readingOrder, hotspots, extensionPoints, testFiles, documentation, qualitySignals }, additionalFlows: buildNonWebFlows(ctx, profile) }
}

function extractCommands(ctx: UniversalContext, profile: ProjectProfile): DevCommand[] {
  const commands: DevCommand[] = []; const add = (label: string, command: string, kind: DevCommand['kind'], source: string, inferred = false) => { if (!commands.some(x => x.command === command)) commands.push({ label, command, kind, source, inferred }) }
  ctx.textFiles.forEach(({ path, text }) => {
    if (path.endsWith('package.json')) try { const scripts = JSON.parse(text).scripts || {}; Object.entries(scripts).forEach(([name, value]) => add(name, `npm run ${name}`, /test/i.test(name) ? 'test' : /build|compile/i.test(name) ? 'build' : /lint|format|check/i.test(name) ? 'lint' : /start|dev|serve/i.test(name) ? 'run' : 'other', path)) } catch { /* malformed manifest */ }
    if (/(^|\/)Makefile$/i.test(path)) for (const m of text.matchAll(/^([A-Za-z][\w.-]*):(?:\s|$)/gm)) if (!/^(all|default)$/.test(m[1])) add(`make ${m[1]}`, `make ${m[1]}`, /test|check/.test(m[1]) ? 'test' : /build|release/.test(m[1]) ? 'build' : /run|start/.test(m[1]) ? 'run' : 'other', path)
  })
  const paths = ctx.tree.map(x => x.path)
  if (paths.some(x => /Cargo\.toml$/.test(x))) { add('Build', 'cargo build', 'build', 'Cargo.toml', true); add('Test', 'cargo test', 'test', 'Cargo.toml', true); add('Run', 'cargo run', 'run', 'Cargo.toml', true) }
  if (paths.some(x => /go\.mod$/.test(x))) { add('Build', 'go build ./...', 'build', 'go.mod', true); add('Test', 'go test ./...', 'test', 'go.mod', true) }
  if (paths.some(x => /pyproject\.toml|requirements.*\.txt/.test(x))) add('Test', 'pytest', 'test', paths.find(x => /pyproject\.toml|requirements.*\.txt/.test(x)) || 'Python manifest', true)
  if (paths.some(x => /\.sln$|\.csproj$/.test(x))) { add('Build', 'dotnet build', 'build', paths.find(x => /\.sln$|\.csproj$/.test(x)) || '.NET project', true); add('Test', 'dotnet test', 'test', '.NET project', true) }
  if (paths.some(x => /pom\.xml$/.test(x))) { add('Build', 'mvn package', 'build', 'pom.xml', true); add('Test', 'mvn test', 'test', 'pom.xml', true) }
  if (paths.some(x => /build\.gradle/.test(x))) { add('Build', './gradlew build', 'build', 'build.gradle', true); add('Test', './gradlew test', 'test', 'build.gradle', true) }
  if (paths.some(x => /CMakeLists\.txt$/.test(x))) add('Configure and build', 'cmake -S . -B build && cmake --build build', 'build', 'CMakeLists.txt', true)
  if (paths.some(x => /pubspec\.yaml$/.test(x))) { add('Install', 'flutter pub get', 'install', 'pubspec.yaml', true); add('Run', 'flutter run', 'run', 'pubspec.yaml', true); add('Test', 'flutter test', 'test', 'pubspec.yaml', true) }
  if (profile.primaryKind === 'embedded / firmware' && paths.some(x => /platformio\.ini$/.test(x))) add('Build firmware', 'pio run', 'build', 'platformio.ini', true)
  return commands.slice(0, 60)
}

function hotspotReason(file: FileInsight) {
  const reasons = []
  if (file.complexity > 12) reasons.push('high branching/symbol complexity')
  if (file.importedBy.length > 4) reasons.push(`${file.importedBy.length} consumers`)
  if (file.lines > 500) reasons.push(`${file.lines} lines`)
  return reasons.join(', ') || 'central implementation file'
}

function buildNonWebFlows(ctx: UniversalContext, profile: ProjectProfile): SystemFlow[] {
  const flows: SystemFlow[] = []
  const files = ctx.fileInsights
  const entry = ctx.entrypoints[0] ? files.find(x => x.path === ctx.entrypoints[0]) : undefined
  const stepsFrom = (file?: FileInsight) => (file?.imports || []).slice(0, 5).map(path => files.find(x => x.path === path)).filter((x): x is FileInsight => Boolean(x))
  if (entry && !ctx.existingFlows.some(x => x.name.includes(entry.path.split('/').pop() || entry.path))) flows.push({ name: `${profile.primaryKind} startup`, description: `Startup sequence inferred from ${entry.path} and its direct local dependencies`, confidence: 'inferred', steps: [{ label: entry.path.split('/').pop() || entry.path, file: entry.path, detail: entry.purpose, kind: profile.primaryKind === 'CLI tool' ? 'command' : 'input' }, ...stepsFrom(entry).map(x => ({ label: x.path.split('/').pop() || x.path, file: x.path, detail: x.purpose, kind: x.category === 'data' ? 'data' as const : x.category === 'service' ? 'service' as const : 'component' as const })), { label: profile.primaryKind === 'library / SDK' ? 'Public API ready' : 'Software ready', detail: 'Initialization path completes', kind: 'output' }] })
  const eventFiles = ctx.textFiles.filter(x => /\b(addEventListener|onClick|onPressed|subscribe|addListener|NSNotificationCenter|EventHandler|on_message|interrupt)\b/.test(x.text)).slice(0, 8)
  eventFiles.forEach(({ path }) => { const insight = files.find(x => x.path === path); flows.push({ name: `Event handling in ${path.split('/').pop()}`, description: 'Event-driven path inferred from handler registration and local dependencies', confidence: 'inferred', steps: [{ label: 'Event or callback', file: path, detail: 'External or internal event is received', kind: profile.primaryKind === 'embedded / firmware' ? 'hardware' : 'event' }, { label: path.split('/').pop() || path, file: path, detail: insight?.purpose || 'Event handler', kind: 'component' }, ...stepsFrom(insight).slice(0, 2).map(x => ({ label: x.path.split('/').pop() || x.path, file: x.path, detail: x.purpose, kind: x.category === 'data' ? 'data' as const : 'service' as const })), { label: 'State or output updated', detail: 'Handler side effects complete', kind: 'output' }] }) })
  return flows.slice(0, 12)
}
