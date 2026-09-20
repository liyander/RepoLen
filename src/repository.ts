import type { AnalysisDepth, CommitInfo, RepoFile, RepoMeta, RepositoryIdentifier } from './types'

const API = 'https://api.github.com'
const ignored = /(^|\/)(node_modules|vendor|dist|build|coverage|\.next|target|venv|\.venv|__pycache__|generated|fixtures|snapshots)(\/|$)/i
const binary = /\.(png|jpe?g|gif|svg|pdf|zip|tar|gz|exe|dll|so|wasm|woff2?|mp4|mov|ico|lock)$/i
const source = /\.(tsx?|jsx?|py|go|rs|java|kt|kts|c|cc|cpp|cxx|h|hpp|cs|fs|swift|dart|rb|php|lua|scala|exs?|ino|css|scss|html|vue|svelte|json|ya?ml|toml|gradle|xml|sql|sh|cmake|csproj|fsproj|sln|pro|plist|godot)$/i

export function parseRepositoryUrl(input: string): RepositoryIdentifier {
  let url: URL
  try { url = new URL(input.trim()) } catch { throw new Error('Enter a complete GitHub URL, like https://github.com/org/project') }
  if (url.protocol !== 'https:') throw new Error('Only secure HTTPS repository URLs are supported.')
  if (url.hostname !== 'github.com') {
    if (url.hostname === 'gitlab.com') throw new Error('GitLab support is planned next. Try a public GitHub repository for now.')
    throw new Error('RepoLens currently supports public github.com repositories.')
  }
  const parts = url.pathname.replace(/\.git$/, '').split('/').filter(Boolean)
  if (parts.length !== 2) throw new Error('Use the repository root URL, like https://github.com/facebook/react')
  return { provider: 'github', owner: parts[0], repository: parts[1] }
}

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, { headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } })
  if (response.status === 404) throw new Error('Repository not found. Make sure it exists and is public.')
  if (response.status === 403 || response.status === 429) throw new Error('GitHub API rate limit reached. Try again later or from another network.')
  if (!response.ok) throw new Error(`GitHub returned ${response.status}. Please try again.`)
  return response.json() as Promise<T>
}

export async function getMetadata(id: RepositoryIdentifier): Promise<RepoMeta> {
  const r = await apiFetch<Record<string, unknown>>(`/repos/${id.owner}/${id.repository}`)
  return {
    name: String(r.name), fullName: String(r.full_name), description: String(r.description || 'No description provided.'),
    url: String(r.html_url), stars: Number(r.stargazers_count), forks: Number(r.forks_count),
    defaultBranch: String(r.default_branch), language: r.language ? String(r.language) : null, updatedAt: String(r.updated_at),
  }
}

export async function getTree(id: RepositoryIdentifier, branch: string): Promise<RepoFile[]> {
  const data = await apiFetch<{ tree: Array<{ path: string; type: 'blob' | 'tree'; size?: number; sha: string }>; truncated: boolean }>(
    `/repos/${id.owner}/${id.repository}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  )
  return data.tree.slice(0, 20000).map(f => ({ path: f.path, type: f.type, size: f.size || 0, sha: f.sha }))
}

export async function getRecentCommits(id: RepositoryIdentifier): Promise<CommitInfo[]> {
  try {
    const data = await apiFetch<Array<{ sha: string; html_url: string; commit: { message: string; author: { name: string; date: string } | null } }>>(`/repos/${id.owner}/${id.repository}/commits?per_page=50`)
    return data.map(item => ({ sha: item.sha, message: item.commit.message.split('\n')[0], author: item.commit.author?.name || 'Unknown', date: item.commit.author?.date || '', url: item.html_url }))
  } catch { return [] }
}

function score(path: string): number {
  const name = path.split('/').pop()?.toLowerCase() || ''
  let value = 0
  if (/^(readme(\.md)?|package\.json|requirements\.txt|pyproject\.toml|go\.mod|cargo\.toml|pom\.xml|build\.gradle(?:\.kts)?|settings\.gradle(?:\.kts)?|cmakelists\.txt|makefile|meson\.build|pubspec\.yaml|platformio\.ini|project\.godot|dockerfile|docker-compose\.ya?ml|\.gitlab-ci\.yml|\.env\.example)$/.test(name) || /\.(csproj|fsproj|sln|uproject)$/.test(name)) value += 1000
  if (/^(main|app|server|index|manage|program|__main__|cli|appdelegate|application)\.(tsx?|jsx?|py|go|rs|java|kt|c|cc|cpp|cxx|cs|swift|dart|rb|php)$/.test(name)) value += 700
  if (/\.github\/workflows\//.test(path)) value += 800
  if (/(routes?|controllers?|services?|models?|middleware|config|api|database|auth)\//i.test(path)) value += 400
  if (source.test(path)) value += 100
  value -= path.split('/').length * 5
  return value
}

export function prioritizeFiles(files: RepoFile[], limit = 180): RepoFile[] {
  return files.filter(f => f.type === 'blob' && !ignored.test(f.path) && !binary.test(f.path) && f.size <= 500_000)
    .sort((a, b) => score(b.path) - score(a.path) || a.size - b.size).slice(0, limit)
}

export async function fetchImportantFiles(id: RepositoryIdentifier, files: RepoFile[], onProgress: (done: number, total: number) => void, depth: AnalysisDepth = 'deep'): Promise<RepoFile[]> {
  const limits: Record<AnalysisDepth, { files: number; bytes: number }> = { quick: { files: 40, bytes: 5 * 1024 * 1024 }, standard: { files: 100, bytes: 12 * 1024 * 1024 }, deep: { files: 180, bytes: 20 * 1024 * 1024 } }
  const chosen = prioritizeFiles(files, limits[depth].files)
  const output: RepoFile[] = []
  const queue = [...chosen]
  let done = 0
  let downloadedBytes = 0
  const maxDownloadBytes = limits[depth].bytes
  async function worker() {
    while (queue.length) {
      const file = queue.shift()!
      if (downloadedBytes >= maxDownloadBytes) { done += 1; onProgress(done, chosen.length); continue }
      try {
        const response = await fetch(`https://raw.githubusercontent.com/${id.owner}/${id.repository}/HEAD/${file.path}`)
        if (response.ok) {
          const content = await response.text()
          const bytes = new TextEncoder().encode(content).length
          if (downloadedBytes + bytes <= maxDownloadBytes) { downloadedBytes += bytes; output.push({ ...file, content }) }
        }
      } catch { /* Partial results are intentional. */ }
      done += 1; onProgress(done, chosen.length)
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
  return output
}
