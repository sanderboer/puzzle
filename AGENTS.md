AGENTS: Puzzle game repo (TypeScript + SCSS, HTML5 Canvas); simple tsc+sass build.
Run dev: npm run dev (parallel TS & SCSS watch + local server at http://localhost:5173). If port busy set PORT.
Build once: npm run build (outputs dist/index.js, dist/styles.css). Optional: npm i -D eslint prettier jest.
Lint: npx eslint 'src/**/*.ts' ; Format: npx prettier --write src
Tests: none yet; add __tests__/*.test.ts with Jest; run all: npx jest
Single test file: npx jest path/to/file.test.ts ; name: npx jest -t "piece path"
Style: 4-space indent, single quotes, semicolons, ~120 char lines; keep spacing.
Imports: ES modules; order external > internal; no wildcard; relative paths short.
Classes: PascalCase (Game, PuzzlePiece); methods/vars camelCase; constants UPPER_SNAKE for true immutables.
Booleans prefixed is/has/can; functions verbs; avoid abbreviations except ctx (canvas context).
Functions ~<60 lines; extract helpers for collision, geometry, animation if growing.
Types: Use TS types/interfaces; JSDoc only for complex algorithms/edge cases.
Objects: Prefer const for references; avoid mutating shared arrays outside Game except via methods.
Error handling: Use try/catch around image/file operations; log with console.error('context:', err); user-facing via overlay (avoid blocking alert in new code).
Performance: Use requestAnimationFrame; keep draw throttling (16ms) intact; avoid layout thrash in loops.
DOM: Cache elements once; use dataset for indices; avoid querySelector inside animation frames.
Image: Revoke blob URLs after use (see legacy cleanup); optimize piece tiles via toDataURL/Blob.
Testing focus (when added): geometry generation, snapping logic, scoring; mock canvas via jest-canvas-mock.
No .cursor or Copilot rule files present; if added later, merge their directives here.
Agents: Keep edits minimal; no frameworks unless requested; update this file on convention changes.