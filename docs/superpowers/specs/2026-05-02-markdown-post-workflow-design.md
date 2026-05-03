# Markdown Post Workflow Design

Date: 2026-05-02

## Goal

Restore a practical writing workflow for this static blog while preserving the current minimal frontend.

The project currently contains generated static pages only. The new workflow adds Markdown source posts and a local build script so future posts can be written in source files instead of hand-editing homepage, archive, post pages, and search XML.

## Requirements

- Keep the current visual style and `css/main.css` overrides.
- Add source posts under `posts/`.
- Generate static article pages, homepage, archive pages, and search indexes from Markdown.
- Use no external npm dependencies.
- Keep existing public URLs such as `/2025/10/11/第一篇文章/`.
- Preserve existing post-local assets, for example `2025/10/10/测试文章/test.png`.
- Do not commit local verification caches or Superpowers scratch files.

## Source Format

Each post is a Markdown file with front matter:

```markdown
---
title: 第一篇文章
date: 2025-10-11 19:07
slug: 第一篇文章
excerpt: 今天是2025年10月11日，希望3天后的ig加油，lpl加油，把冠军留在cn！
tags:
  - life
categories:
  - notes
---

正文内容。
```

The output URL is derived from `date` and `slug`: `/YYYY/MM/DD/<slug>/`.

## Architecture

Use a small Node.js build pipeline:

- `scripts/site-core.js`: parse front matter, render a conservative Markdown subset, render HTML layouts, and write output files.
- `scripts/build-site.js`: CLI entrypoint that builds the current repository.
- `tests/site-core.test.js`: Node test runner coverage for source parsing and generated output.
- `posts/*.md`: writing source files.

The generator emits static HTML that uses the existing CSS class names where visual styling depends on them: `navbar`, `container`, `index-info`, `index-header`, `index-btm`, `post-content`, `markdown-body`, and `post-prevnext`.

## Markdown Scope

Supported Markdown syntax:

- headings `#`, `##`, `###`
- paragraphs
- unordered and ordered lists
- blockquotes
- fenced code blocks
- images
- links
- inline code
- bold and italic text
- horizontal rules

This is intentionally small. The goal is reliable post writing without reintroducing a large theme toolchain.

## Verification

- Run `npm test`.
- Run `npm run build`.
- Confirm generated `index.html`, article pages, archive pages, and `local-search.xml` exist.
- Confirm `git diff --check` has no whitespace errors.
- Preview the site locally and check that the current minimal frontend remains intact.
