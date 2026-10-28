# Server application

This directory owns the single runnable application. `src/index.ts` composes environment configuration, persistence and transport; `src/app.ts` exposes the testable Fastify factory. `public/` holds native browser modules served through an explicit asset allowlist.

Use `src/AGENTS.md` for HTTP/backend changes and `public/AGENTS.md` for browser changes. Cross-boundary changes must align route schemas, response fields, bilingual UI copy and tests. Static filenames must also be allowed in `src/app.ts`. There is no frontend bundler or build output step: `npm start` runs TypeScript through tsx. Root Dockerfile/Compose and `.env.example` describe deployment and local database configuration.

Validate with `npm run check` and the relevant tests from the repository root.
