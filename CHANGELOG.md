# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.0] - 2026-05-07

### Added
- **User Authentication**: Registration, login, JWT token issuance, session management
  - PBKDF2 password hashing with timing-safe verification
  - 7-day JWT sessions stored in database
- **Billing System**: Credits-based billing
  - Credit rules: single 5pts, parallel 12pts, adaptive 8pts per image
  - Algorithm modifiers: 0.5x~2.0x multiplier by type
  - Auto-refund on task failure
- **Error Handling Middleware**: Standardized error codes (14 types)
- **Rate Limiting**: 60 req/min in-memory limiter (Redis recommended for production)
- **Unit Tests**: Coverage for algorithm routing, billing, error handling
- **CI/CD Pipeline**: GitHub Actions (lint → test → build → docker)
- **README**: Complete documentation with architecture and API reference
- **LICENSE**: Apache License 2.0
- **History API**: Paginated task list with stats
- **Export API**: Batch ZIP export with export list
- **PricingSection**: Landing page pricing display
- **AuthPage**: Login/registration UI at `/auth`
- **HistoryPage**: Task history at `/history`
- **ExportPage**: Batch ZIP download at `/export`
- **Navigation**: Dynamic user state (credits display when logged in)
- **Footer**: Updated with live links and GitHub links
- **SEO**: robots.txt, sitemap.xml, meta tags in index.html
- **JSZip**: Browser-side ZIP packing for batch downloads
- **Package name**: Updated to `EcomPicAIGen`

### Changed
- `vitest.config.ts`: Full test + coverage configuration
- `api/boot.ts`: Added errorMiddleware, rateLimit, CORS, JWT parsing
- `db/schema.ts`: New tables: users, user_sessions, billing_records
- `Dockerfile`: Multi-stage build with sharp deps + non-root user
- `.env.example`: Complete environment variable documentation

### Fixed
- `.env.example` line formatting

---

## [0.2.0] - 2026-05-05

### Added
- Multi-algorithm routing engine (7 built-in algorithms)
- 4-dimensional quality scoring system
- 5-step generation workflow
- Frontend landing page with GSAP animations
- Hono + tRPC backend architecture
- Drizzle ORM database with SQLite support
- Image post-processing engine (white background, scene composite, detail enhance)

---

## [0.1.0] - 2026-05-05

### Added
- Project initialization (React 19 + Vite + Tailwind CSS + shadcn/ui)
- Liquid gradient text component
- 50 sample product images
- Quality scoring proof-of-concept
