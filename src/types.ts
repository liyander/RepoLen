export type Provider = 'github' | 'gitlab'
export type AnalysisDepth = 'quick' | 'standard' | 'deep'

export interface RepositoryIdentifier {
  provider: Provider
  owner: string
  repository: string
}

export interface RepoFile {
  path: string
  type: 'blob' | 'tree'
  size: number
  sha: string
  content?: string
}

export interface RepoMeta {
  name: string
  fullName: string
  description: string
  url: string
  stars: number
  forks: number
  defaultBranch: string
  language: string | null
  updatedAt: string
  dataSource?: 'github' | 'cdn'
}

export interface CommitInfo {
  sha: string
  message: string
  author: string
  date: string
  url: string
}

export interface Finding {
  label: string
  detail: string
  evidence: string[]
  tone?: 'green' | 'amber' | 'violet' | 'blue'
}

export interface GraphLink { source: string; target: string }

export type SymbolKind = 'function' | 'class' | 'component' | 'method' | 'variable'

export interface CodeSymbol {
  name: string
  kind: SymbolKind
  file: string
  line: number
  signature?: string
  exported: boolean
}

export interface FileInsight {
  path: string
  purpose: string
  category: 'entrypoint' | 'ui' | 'api' | 'service' | 'data' | 'config' | 'test' | 'infrastructure' | 'core' | 'platform' | 'hardware' | 'tooling' | 'module'
  lines: number
  symbols: CodeSymbol[]
  imports: string[]
  importedBy: string[]
  complexity: number
}

export interface ModuleInsight {
  name: string
  path: string
  purpose: string
  files: number
  sourceFiles: number
  symbols: number
  dependencies: string[]
  dependents: string[]
}

export interface DataModel {
  name: string
  kind: string
  file: string
  fields: string[]
}

export interface ConfigUsage {
  name: string
  files: string[]
  sensitive: boolean
}

export interface FlowStep {
  label: string
  file?: string
  detail: string
  kind: 'input' | 'route' | 'component' | 'service' | 'data' | 'event' | 'command' | 'hardware' | 'output'
}

export interface SystemFlow {
  name: string
  description: string
  steps: FlowStep[]
  confidence: 'high' | 'medium' | 'inferred'
}

export type SoftwareKind = 'web application' | 'backend service' | 'native application' | 'desktop application' | 'mobile application' | 'CLI tool' | 'library / SDK' | 'game' | 'embedded / firmware' | 'data / ML' | 'infrastructure' | 'monorepo' | 'general software'

export interface ProjectProfile {
  primaryKind: SoftwareKind
  kinds: SoftwareKind[]
  platforms: string[]
  buildTools: Finding[]
  packageManagers: string[]
  architectureStyle: string[]
  confidence: 'high' | 'medium' | 'inferred'
}

export interface DevCommand {
  label: string
  command: string
  kind: 'install' | 'build' | 'run' | 'test' | 'lint' | 'package' | 'other'
  source: string
  inferred: boolean
}

export interface Hotspot {
  path: string
  reason: string
  score: number
  complexity: number
  consumers: number
  lines: number
}

export interface DeveloperGuide {
  commands: DevCommand[]
  readingOrder: Array<{ path: string; reason: string }>
  hotspots: Hotspot[]
  extensionPoints: Array<{ symbol: string; file: string; reason: string }>
  testFiles: string[]
  documentation: string[]
  qualitySignals: Finding[]
}

export interface SymbolCall {
  caller: string
  callee: string
  callerFile: string
  calleeFile?: string
  line: number
  confidence: 'resolved' | 'name-match' | 'inferred'
}

export interface TestLink {
  source: string
  test: string
  confidence: 'imported' | 'name-match' | 'directory'
}

export interface ArchitectureViolation {
  rule: string
  source: string
  target: string
  detail: string
  severity: 'warning' | 'review'
}

export interface DuplicationCluster {
  files: string[]
  sharedBlocks: number
  sample: string
}

export interface AdvancedAnalysis {
  calls: SymbolCall[]
  cycles: string[][]
  testLinks: TestLink[]
  untestedFiles: string[]
  deadCandidates: CodeSymbol[]
  violations: ArchitectureViolation[]
  duplications: DuplicationCluster[]
  publicApi: CodeSymbol[]
  externalBoundaries: Finding[]
  observability: Finding[]
  concurrency: Finding[]
  featureFlags: ConfigUsage[]
  metrics: {
    maintainability: number
    testRatio: number
    averageComplexity: number
    maxDependencyDepth: number
  }
}

export interface Analysis {
  languages: Array<{ name: string; count: number; percent: number }>
  stack: Finding[]
  dependencies: string[]
  entrypoints: string[]
  imports: GraphLink[]
  endpoints: Finding[]
  infrastructure: Finding[]
  security: Finding[]
  symbols: CodeSymbol[]
  fileInsights: FileInsight[]
  modules: ModuleInsight[]
  models: DataModel[]
  config: ConfigUsage[]
  flows: SystemFlow[]
  profile: ProjectProfile
  developerGuide: DeveloperGuide
  advanced: AdvancedAnalysis
  summary: string
  fetchedFiles: number
  diagnostics: {
    indexedFiles: number
    fetchedFiles: number
    parsedFiles: number
    symbols: number
    relationships: number
    warnings: string[]
  }
}

export interface RepoResult {
  meta: RepoMeta
  files: RepoFile[]
  analysis: Analysis
  history: CommitInfo[]
  analyzedAt: string
}

export type AnalysisStage = 'idle' | 'metadata' | 'tree' | 'prioritizing' | 'fetching' | 'analyzing' | 'complete' | 'error'
