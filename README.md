# YanWanWan Blog

This repository is a generated static site plus a local Markdown writing workflow.

## Write A Post

Create a Markdown file under `posts/`:

```markdown
---
title: New Post
date: 2026-05-02 21:30
slug: new-post
excerpt: One sentence summary.
tags:
  - notes
categories:
  - life
---

Write the post body here.
```

Run:

```powershell
node scripts/build-site.js
```

Then commit the changed static files and source post.

## Posts With Images

Use a nested post folder:

```text
posts/my-post/
  index.md
  image.png
```

In `index.md`:

```markdown
![Alt text](image.png)
```

The build copies sidecar files into the generated article directory.

## Checks

```powershell
node tests/site-core.test.js
node scripts/build-site.js
git diff --check
```
