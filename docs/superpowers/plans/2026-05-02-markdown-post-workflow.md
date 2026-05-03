# Markdown Post Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Markdown-based writing workflow that regenerates the static blog while preserving the current frontend style.

**Architecture:** Add a zero-dependency Node.js generator with tests. Source posts live in `posts/`; generated output continues to be checked in as static HTML for GitHub Pages.

**Tech Stack:** Node.js built-in modules, Node test runner, static HTML/CSS, current `css/main.css`.

---

### Task 1: Add Generator Tests

**Files:**
- Create: `tests/site-core.test.js`

- [ ] **Step 1: Write failing tests**

Create Node tests that import `scripts/site-core.js`, build a temporary fixture site from one Markdown post, and assert that the homepage, post page, archive page, and search XML are produced.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: failure because `package.json`, `scripts/site-core.js`, and the test target do not exist yet.

### Task 2: Implement Build Pipeline

**Files:**
- Create: `package.json`
- Create: `scripts/site-core.js`
- Create: `scripts/build-site.js`

- [ ] **Step 1: Implement post parsing and Markdown rendering**

Implement front matter parsing, date/slug URL generation, relative image URL rewriting, XML escaping, and a conservative Markdown renderer.

- [ ] **Step 2: Implement static page generation**

Generate homepage, post pages, archive pages, category/tag pages, and both search XML files.

- [ ] **Step 3: Run tests**

Run: `npm test`

Expected: all tests pass.

### Task 3: Backfill Existing Posts

**Files:**
- Create: `posts/2025-10-11-first-post.md`
- Create: `posts/2025-10-10-test-post.md`
- Create: `posts/2025-10-10-hello-world.md`

- [ ] **Step 1: Convert existing generated post content to Markdown sources**

Use the current three post pages as source evidence and keep their current public URLs.

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: generated static files update successfully.

### Task 4: Verify Site Output

**Files:**
- Generated static files under repository root.

- [ ] **Step 1: Static checks**

Run: `npm test`, `npm run build`, and `git diff --check`.

- [ ] **Step 2: Browser preview**

Serve the site locally and inspect the homepage plus one article page.

Expected: the minimal frontend remains intact and post content is generated from `posts/*.md`.
