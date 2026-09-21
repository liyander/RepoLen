# RepoLens

> Understand the architecture, execution paths, components, risks, and development workflow of a public software repository directly in your browser.

RepoLens is a client-side code-intelligence application for public GitHub repositories. It retrieves a bounded set of high-signal files, performs deterministic static analysis, and turns the results into interactive architecture maps, system flows, component explanations, change-impact reports, and developer onboarding guidance.

RepoLens is not limited to websites. It recognizes backend services, native and desktop applications, mobile apps, CLI tools, libraries and SDKs, games, embedded firmware, data/ML projects, infrastructure repositories, and monorepos.

**Live application:** [https://repolen-957ab.web.app](https://repolen-957ab.web.app)

Additional pages:

- [About RepoLens](https://repolen-957ab.web.app/about)
- [RepoLens for Developers](https://repolen-957ab.web.app/developers)

## Recent updates

- Added persistent light and dark themes with a complete high-contrast light palette
- Increased typography and spacing throughout the analyzer and dashboard
- Added a collapsible, remembered desktop sidebar and improved mobile navigation
- Added dedicated About and Developer pages
- Added automatic jsDelivr fallback when the unauthenticated GitHub API quota is exhausted
- Added visible fallback diagnostics for unavailable live repository metadata
- Added Google Search Console verification and expanded technical SEO
- Added Firebase Hosting headers, caching rules, and SPA route support
- Added ESLint flat configuration and CDN-fallback regression coverage

## Core principles

- **Static analysis first:** conclusions come from repository structure and source evidence.
- **Evidence over guesses:** findings include the files that produced them.
- **Safe by design:** repository code is never executed or installed.
- **Useful partial results:** unsupported or oversized areas do not fail the entire analysis.
- **Resilient acquisition:** GitHub rate limits automatically trigger a public CDN fallback.
- **Client-side by default:** no permanent backend, account, or repository upload is required.

## Features

### Repository understanding

- Public GitHub URL validation and repository metadata
- Recursive repository-tree indexing
- Prioritized and resource-bounded source retrieval
- Searchable repository explorer and source viewer
- Language, framework, package manager, build system, and platform detection
- Entrypoint and local-import extraction
- Function, class, method, component, and public-symbol extraction
- Per-file purpose, complexity, dependencies, consumers, and symbol summaries
- Top-level module identification and dependency mapping

### Universal software profiling

RepoLens classifies repositories as web applications, backend services, native or desktop applications, mobile apps, CLI tools, libraries and SDKs, games, embedded firmware, data/ML projects, infrastructure repositories, monorepos, or general software.

It detects platforms and toolchains such as Android, Apple platforms, Flutter, Electron, Tauri, .NET, Arduino, CMake, Make, Gradle, Maven, Cargo, Go modules, Xcode, Bazel, and Meson.

### Interactive visualizations

- System-level architecture graph
- Module dependency graph
- Component and file relationship graph
- Symbol caller/callee graph
- API request flows
- Startup and initialization flows
- CLI, event, callback, native, and hardware-oriented flows
- Data-model and configuration views

Graphs are deliberately bounded and hierarchical so large repositories remain navigable.

### Developer Impact Explorer

Select a function, class, method, or component to inspect:

- Direct callers and callees
- Potentially affected files
- Transitive reverse dependencies
- Relevant tests to run
- Affected system flows
- Source location and signature
- Estimated change-risk score

Call relationships are conservative static approximations. Dynamic dispatch, reflection, generated code, and dependency injection may introduce runtime relationships that cannot be proven without executing the repository.

### Developer guide

RepoLens generates a practical onboarding guide containing:

- Suggested build, run, test, and lint commands
- Recommended code-reading order
- Important entrypoints
- Complexity and change-risk hotspots
- Likely extension points, providers, adapters, hooks, and interfaces
- Test and documentation inventory
- CI, licensing, and code-quality signals

Commands marked as inferred are conventional suggestions and should be reviewed before they are run locally.

### Code health

- Circular dependency detection
- Architecture boundary review
- UI-to-data and core-to-platform coupling signals
- Production-to-test dependency detection
- Possible dead or unreachable symbols
- Repeated-logic candidates
- Source-to-test relationships
- Untested core-file candidates
- Public API surface inventory
- Maintainability, test-ratio, complexity, and dependency-depth indicators

These are engineering signals, not definitive defect or vulnerability claims.

### Runtime and security surface

- Authentication and authorization signals
- Environment-variable and sensitive-name inventory
- Feature-flag detection
- Database and persistent-storage access
- Filesystem and command-execution boundaries
- External HTTP, cloud, messaging, and native/FFI integrations
- Logging, tracing, metrics, and error-reporting signals
- Async execution, threads, synchronization, queues, and channels
- Docker, Docker Compose, and CI/CD configuration

### Data and APIs

- Express- and FastAPI-style route detection
- Prisma model detection
- Pydantic and Python ORM model detection
- Mongoose schema detection
- TypeScript data-shape detection
- Environment configuration usage
- Exported and public symbol inventory

### Git history and exports

- Recent public commit timeline
- Contributor activity within the retrieved sample
- Commit cadence and message themes
- Commit links to GitHub
- Complete JSON analysis export
- Developer-friendly Markdown report export
- Local recent-repository history

### Interface and accessibility

- Persistent dark and light themes
- High-contrast light-theme text, icons, badges, code chips, and graph controls
- Collapsible desktop sidebar with a remembered preference
- Mobile navigation drawer with an overlay and independently scrolling navigation
- Larger typography and spacing across analysis views
- Responsive layouts for desktop, tablet, and mobile screens
- Accessible labels and tooltips for icon-only controls

### Product and developer documentation

- Dedicated About page explaining RepoLens, its purpose, and its creator
- Dedicated Developer page documenting the acquisition and analysis pipeline
- Supported-capability, resilience, safety, and analysis-boundary explanations
- Direct navigation between the analyzer, About page, and Developer page

### Search and discoverability

- Search-engine title and description metadata
- Canonical URL, robots directives, Open Graph, and Twitter metadata
- WebSite, WebApplication, and Person structured data
- `robots.txt`, XML sitemap, web manifest, favicon, and social preview image
- Google Search Console verification
- Sitemap entries for the home, About, and Developer pages

## Supported languages

RepoLens currently provides language-aware analysis for:

| Language | Symbols | Imports | Entrypoints |
| --- | :---: | :---: | :---: |
| JavaScript / TypeScript | Yes | Yes | Yes |
| Python | Yes | Yes | Yes |
| C / C++ | Yes | Partial | Yes |
| C# / F# | Yes | Partial | Yes |
| Java / Kotlin | Yes | Partial | Yes |
| Swift | Yes | Partial | Yes |
| Dart | Yes | Partial | Yes |
| Go | Yes | Partial | Yes |
| Rust | Yes | Partial | Yes |
| Ruby / PHP | Yes | Partial | Yes |

Other text-based languages still contribute to repository structure, file search, language composition, and configuration analysis.

## Analysis depths

| Mode | Prioritized files | Download ceiling | Intended use |
| --- | ---: | ---: | --- |
| Quick | 40 | About 5 MB | Fast repository orientation |
| Standard | 100 | About 12 MB | General architecture analysis |
| Deep | 180 | About 20 MB | Component, impact, and health analysis |

Additional limits include:

- Up to 20,000 indexed tree entries
- Up to 500 KB per fetched file
- Bounded symbols, imports, flows, cycles, and findings
- No binary-file parsing

Large repositories intentionally produce a representative analysis instead of attempting to download or render everything.

## How it works

```text
Public GitHub URL
        |
        v
GitHub metadata + recursive tree + recent commits
        |
        +---- rate limited ----> jsDelivr public file index + CDN source
        |
        v
File prioritization and browser resource limits
        |
        v
Bounded raw source retrieval
        |
        v
Language, symbol, dependency, model, route, and config analysis
        |
        v
Universal software profiling + advanced health analysis
        |
        v
Architecture graphs, flows, impact reports, and developer guidance
```

Important implementation areas:

```text
src/
|-- analyzer.ts              Core repository analysis pipeline
|-- advancedAnalyzer.ts      Calls, cycles, tests, health, and boundaries
|-- universalAnalyzer.ts     Software archetypes and developer guidance
|-- repository.ts            GitHub acquisition and file prioritization
|-- types.ts                 Normalized analysis model
|-- components/
|   |-- Home.tsx             Repository input and analysis depth
|   |-- Dashboard.tsx        Analysis workspaces and visualizations
|   `-- InfoPages.tsx        About and developer documentation pages
|-- storage.ts               Local recent-repository history
`-- styles.css               Responsive application design

public/
|-- robots.txt               Search crawler rules
|-- sitemap.xml              Search-engine route discovery
|-- site.webmanifest         Installable web metadata
|-- repolens-icon.svg        Application icon
`-- og-card.svg              Social sharing image
```

## Safety model

Repository content is untrusted input. RepoLens only performs text retrieval and static inspection.

It does **not**:

- Execute repository code
- Run package installation, builds, tests, or repository scripts
- Build Docker images
- Follow URLs discovered inside repository files
- Render unsanitized repository HTML
- Embed personal access tokens in the client bundle

Security findings identify areas that deserve review. They do not claim that a vulnerability exists.

## Local development

Requirements:

- Node.js 20 or newer
- npm

Install and start the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:5173` and submit a public GitHub repository URL.

### Available scripts

```bash
npm run dev       # Start the Vite development server
npm run lint      # Run ESLint
npm test          # Run the Vitest suite once
npm run build     # Type-check and create a production build
npm run preview   # Preview the production build locally
```

## Verification

The 13-test suite covers URL parsing, file prioritization, the public-CDN fallback, deep symbol and dependency analysis, models, configuration, flows, embedded firmware, Flutter, Unity, .NET, symbol calls, dependency cycles, test mapping, architecture rules, and maintainability metrics.

```bash
npm test
npm run lint
npm run build
```

Production output is generated in `dist/`. The dashboard and graph dependencies are lazy-loaded into a separate bundle to keep the landing-page payload smaller.

## Firebase Hosting deployment

The repository includes an SPA-compatible `firebase.json`.

```bash
npm run build
firebase deploy --only hosting
```

Firebase should publish the `dist/` directory. The included rewrite directs application routes back to `index.html`.

The hosting configuration also supplies cache behavior, MIME-safe delivery, referrer policy, permissions policy, and SPA routing for `/about`, `/developers`, and repository result URLs.

Current Firebase project and hosting URL:

```text
Project: repolen-957ab
URL:     https://repolen-957ab.web.app
```

## GitHub API limitations

RepoLens intentionally avoids shipping a GitHub token. Unauthenticated GitHub API access is rate-limited, so RepoLens automatically switches to a public jsDelivr file index and CDN source delivery when that quota is exhausted. Analysis continues, while the dashboard labels that live stars, forks, and recent commits may be unavailable.

The primary GitHub acquisition strategy uses:

1. One repository metadata request
2. One recursive tree request
3. One recent-commits request when available
4. Raw-content requests only for prioritized files

If metadata or the tree cannot be retrieved because of the GitHub quota, the token-free fallback obtains the repository file index and prioritized source from jsDelivr. The dashboard displays a **CDN FALLBACK** label and a diagnostic warning because live stars, forks, branch metadata, and commit history may be missing.

The fallback flow is:

```text
GitHub REST API
      |
      +-- available --> live metadata, tree, history, and raw source
      |
      `-- rate limited --> jsDelivr @HEAD file index and prioritized CDN source
```

Repositories that exceed jsDelivr's public GitHub-package limits may still need to wait for the GitHub quota to reset. RepoLens never embeds a shared personal access token in its client bundle.

## Current limitations

- Public GitHub repositories only
- GitLab URLs are recognized but not yet analyzed
- No private repository authentication
- Static call graphs are approximate rather than compiler-complete
- Generated files, reflection, macros, runtime plugins, and dynamic imports may hide relationships
- Analysis coverage is bounded by the selected mode and browser resources
- CDN fallback availability is subject to jsDelivr's public GitHub-package limits
- No persistent cloud workspace or team collaboration
- No AI repository chat without a secure model proxy

## Roadmap

Features that require additional infrastructure or authenticated provider access:

- GitLab and additional repository providers
- Private repository support using secure OAuth
- Branch, tag, commit, and pull-request comparison
- Full commit-to-file ownership and co-change analysis
- Saved analyses and shareable team workspaces
- User-defined architecture rules
- Compiler- or Tree-sitter-backed parsing for greater precision
- Evidence-backed repository question answering through a secure AI proxy
- Versioned architecture and complexity trends

## Technology

- React
- TypeScript
- Vite
- React Flow
- Lucide icons
- Vitest
- ESLint flat configuration
- jsDelivr public data and file CDN fallback
- Firebase Hosting configuration

## Contributing

When adding an analyzer:

1. Keep repository acquisition separate from analysis.
2. Never execute repository-controlled code.
3. Attach evidence paths to every user-facing finding.
4. Bound loops, graph sizes, downloaded bytes, and returned findings.
5. Preserve partial results when one detector fails.
6. Add a regression test for each new language, framework, or relationship.

## Disclaimer

RepoLens provides static-analysis indicators for developer understanding. Its inferred flows, risks, security surfaces, and maintainability scores require human review and should not be treated as formal security, correctness, or compliance guarantees.
