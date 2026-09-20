import { describe, expect, it } from 'vitest'
import { parseRepositoryUrl, prioritizeFiles } from './repository'
import { analyzeRepository } from './analyzer'
import type { RepoFile, RepoMeta } from './types'

describe('parseRepositoryUrl', () => {
  it('parses a public GitHub repository', () => expect(parseRepositoryUrl('https://github.com/facebook/react')).toEqual({ provider: 'github', owner: 'facebook', repository: 'react' }))
  it('strips a git suffix', () => expect(parseRepositoryUrl('https://github.com/a/b.git').repository).toBe('b'))
  it('rejects arbitrary hosts', () => expect(() => parseRepositoryUrl('https://example.com/a/b')).toThrow(/github.com/))
})

describe('prioritizeFiles', () => {
  it('places manifests before ordinary source', () => {
    const files = [{ path: 'src/thing.ts', type: 'blob' as const, size: 12, sha: '1' }, { path: 'package.json', type: 'blob' as const, size: 12, sha: '2' }]
    expect(prioritizeFiles(files)[0].path).toBe('package.json')
  })
  it('skips build output and binary content', () => {
    const files = [{ path: 'dist/app.js', type: 'blob' as const, size: 12, sha: '1' }, { path: 'logo.png', type: 'blob' as const, size: 12, sha: '2' }]
    expect(prioritizeFiles(files)).toHaveLength(0)
  })
})

describe('deep repository analysis', () => {
  const meta: RepoMeta = { name: 'demo', fullName: 'test/demo', description: 'demo', url: 'https://github.com/test/demo', stars: 1, forks: 0, defaultBranch: 'main', language: 'TypeScript', updatedAt: '2026-01-01' }
  const source = (path: string, content: string): RepoFile => ({ path, type: 'blob', size: content.length, sha: path, content })
  const files = [
    source('src/index.ts', `import { getUser } from './services/user'\nimport express from 'express'\nconst app = express()\napp.get('/users/:id', getUser)\nexport function start() { return app }`),
    source('src/services/user.ts', `import { User } from '../models/user'\nimport { validateUser } from '../utils/validate'\nexport async function getUser(id: string) { if (validateUser(id)) return User.find(id) }`),
    source('src/utils/validate.ts', `export function validateUser(id: string) { return Boolean(id) }`),
    source('src/models/user.ts', `export interface UserModel { id: string; email: string }\nexport class User { static find(id: string) { return id } }`),
    source('src/components/Profile.tsx', `import { User } from '../models/user'\nexport function Profile() { return User }`),
    source('src/cycle/a.ts', `import { b } from './b'\nexport function a() { return b() }`),
    source('src/cycle/b.ts', `import { a } from './a'\nexport function b() { return a() }`),
    source('tests/user.test.ts', `import { getUser } from '../src/services/user'\ntest('user', () => getUser('1'))`),
    source('prisma/schema.prisma', `model Account {\n id String @id\n email String\n}`),
    source('src/config.ts', `export const token = process.env.API_SECRET`),
    source('package.json', `{"dependencies":{"express":"latest"}}`),
  ]
  const result = analyzeRepository(meta, files, files)

  it('extracts symbols and resolves local imports', () => {
    expect(result.symbols.some(x => x.name === 'getUser')).toBe(true)
    expect(result.imports).toContainEqual({ source: 'src/index.ts', target: 'src/services/user.ts' })
  })
  it('discovers models, configuration, and request flows', () => {
    expect(result.models.some(x => x.name === 'Account')).toBe(true)
    expect(result.config).toContainEqual(expect.objectContaining({ name: 'API_SECRET', sensitive: true }))
    expect(result.flows.some(x => x.name === 'GET /users/:id')).toBe(true)
  })
  it('builds component and module intelligence', () => {
    expect(result.fileInsights.find(x => x.path === 'src/services/user.ts')?.category).toBe('service')
    expect(result.modules.some(x => x.name === 'src')).toBe(true)
    expect(result.diagnostics.symbols).toBeGreaterThan(0)
  })
  it('builds developer impact and code-health intelligence', () => {
    expect(result.advanced.calls.some(x => x.callee.includes('#validateUser:'))).toBe(true)
    expect(result.advanced.cycles.some(x => x.includes('src/cycle/a.ts') && x.includes('src/cycle/b.ts'))).toBe(true)
    expect(result.advanced.testLinks).toContainEqual(expect.objectContaining({ source: 'src/services/user.ts', test: 'tests/user.test.ts' }))
    expect(result.advanced.violations).toContainEqual(expect.objectContaining({ rule: 'UI → data coupling' }))
    expect(result.advanced.metrics.maintainability).toBeGreaterThanOrEqual(0)
  })
})

describe('universal software profiling', () => {
  const meta: RepoMeta = { name: 'sample', fullName: 'test/sample', description: 'sample', url: 'https://github.com/test/sample', stars: 0, forks: 0, defaultBranch: 'main', language: null, updatedAt: '2026-01-01' }
  const source = (path: string, content = ''): RepoFile => ({ path, type: 'blob', size: content.length, sha: path, content })

  it('recognizes embedded C++ firmware and its toolchain', () => {
    const files = [source('platformio.ini', '[env:esp32]'), source('src/main.cpp', '#include <Arduino.h>\nvoid setup() {}\nvoid loop() { if (true) {} }')]
    const result = analyzeRepository(meta, files, files)
    expect(result.profile.primaryKind).toBe('embedded / firmware')
    expect(result.profile.platforms).toContain('Microcontroller')
    expect(result.developerGuide.commands).toContainEqual(expect.objectContaining({ command: 'pio run' }))
    expect(result.symbols.some(x => x.name === 'setup')).toBe(true)
  })

  it('recognizes Flutter mobile software and developer commands', () => {
    const files = [source('pubspec.yaml', 'dependencies:\n  flutter:\n    sdk: flutter'), source('lib/main.dart', `import 'package:flutter/widgets.dart';\nvoid main() { runApp(App()); }\nclass App extends Widget {}`)]
    const result = analyzeRepository(meta, files, files)
    expect(result.profile.kinds).toContain('mobile application')
    expect(result.profile.platforms).toContain('Flutter')
    expect(result.developerGuide.commands.map(x => x.command)).toEqual(expect.arrayContaining(['flutter run', 'flutter test']))
  })

  it('recognizes native games and .NET projects', () => {
    const gameFiles = [source('ProjectSettings/ProjectVersion.txt', 'm_EditorVersion: 2023'), source('Assets/Player.cs', 'using UnityEngine; public class Player : MonoBehaviour { public void Move() {} }')]
    expect(analyzeRepository(meta, gameFiles, gameFiles).profile.kinds).toContain('game')
    const dotnetFiles = [source('Tool.sln'), source('Tool/Tool.csproj', '<Project><ItemGroup><PackageReference Include="Spectre.Console" /></ItemGroup></Project>'), source('Tool/Program.cs', 'using System; public class Program { public static void Main(string[] args) {} }')]
    const dotnet = analyzeRepository(meta, dotnetFiles, dotnetFiles)
    expect(dotnet.profile.packageManagers).toContain('NuGet')
    expect(dotnet.developerGuide.commands.map(x => x.command)).toContain('dotnet build')
    expect(dotnet.entrypoints).toContain('Tool/Program.cs')
  })
})
