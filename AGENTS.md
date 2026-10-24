# Repository Guidelines

## Project Structure & Module Organization

Word Pedigree is a React and TypeScript application built with Vite. `src/App.tsx` coordinates search, navigation, dialogs, and the saved-word cabinet. Reusable interface components live in `src/components/`; `src/lexicon.ts` interprets Wiktionary responses. Prepared, source-linked pedigrees are in `src/data/words.ts`, with shared interfaces in `src/types.ts`.

Global styling lives in `src/styles.css`. Original SVG artwork resides in `public/ornaments/`; regenerate it from `scripts/generate_ornaments.py`. Production output goes to ignored `dist/`, and browser screenshots to ignored `test-results/`.

## Build, Test, and Development Commands

Use Node.js 22.12 or newer.

- `npm install`: install dependencies from the lockfile.
- `npm run dev`: serve locally at `http://127.0.0.1:5173`.
- `npm run build`: run TypeScript checks and create the production bundle.
- `npm run preview`: inspect the production bundle locally.
- `npm test`: run Vitest tests.
- `node scripts/verify-browser.mjs`: check browser interactions and responsive screenshots with the development server running.
- `python3 scripts/generate_ornaments.py`: rebuild original vector ornaments.

## Coding Style & Naming Conventions

Use two-space indentation, single quotes, semicolons, and strict TypeScript. Name React components in PascalCase, functions and variables in camelCase, and CSS classes in kebab-case. Keep source data separate from presentation. No formatter or linter is configured; follow existing conventions and run the build before delivery.

Preserve the historical visual language: serif typography, gilt relief, parchment, engraved ornament, and restrained rose accents. Use SVG, CSS, and rendering libraries; do not use image generation or the Sites skill. Retain keyboard access, reduced-motion support, and the CSS fallback for WebGL.

## Testing Guidelines

Place meaningful parser tests beside the implementation as `*.test.ts`. Vitest uses jsdom for DOM parsing. Cover language scoping, uncertain ancestry, missing evidence, and network failures. No numeric coverage threshold is established. Verify desktop and mobile layouts after visual changes.

## Commit & Pull Request Guidelines

No local Git history existed at project setup. Use concise imperative commit messages, such as `Refine pedigree branch ornaments`. PR descriptions should explain behavior, sources affected, validation, and relevant desktop/mobile screenshots; link an issue when applicable.

Commit or publish to `wildfellhall/WordPedigree` only after the owner approves the design, using the GitHub CLI. Never fabricate etymologies or first-use dates; retain source links and Wiktionary attribution.
