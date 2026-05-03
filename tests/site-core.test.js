const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  buildSite,
  parsePostSource,
  renderMarkdown,
} = require('../scripts/site-core');

test('parsePostSource reads metadata and derives the public URL', () => {
  const post = parsePostSource(`---
title: 第一篇文章
date: 2025-10-11 19:07
slug: 第一篇文章
excerpt: 第一段摘要
tags:
  - life
categories:
  - notes
---

正文内容。`, 'posts/first.md');

  assert.equal(post.title, '第一篇文章');
  assert.equal(post.dateText, '2025-10-11');
  assert.equal(post.url, '/2025/10/11/%E7%AC%AC%E4%B8%80%E7%AF%87%E6%96%87%E7%AB%A0/');
  assert.deepEqual(post.tags, ['life']);
  assert.deepEqual(post.categories, ['notes']);
  assert.equal(post.excerpt, '第一段摘要');
});

test('renderMarkdown supports common post syntax and rewrites relative images', () => {
  const html = renderMarkdown(`# Title

Some **bold** text with [a link](/about/).

![diagram](diagram.png)

\`\`\`js
console.log("ok");
\`\`\`
`, '/2025/10/10/test-post/');

  assert.match(html, /<h1 id="title">Title<\/h1>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<a href="\/about\/">a link<\/a>/);
  assert.match(html, /<img src="\/2025\/10\/10\/test-post\/diagram\.png" alt="diagram">/);
  assert.doesNotMatch(html, /<p><img/);
  assert.match(html, /<pre><code class="language-js">console\.log\(&quot;ok&quot;\);/);
});

test('buildSite generates static blog surfaces from Markdown sources', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-build-'));
  await fs.mkdir(path.join(root, 'posts'), { recursive: true });
  await fs.writeFile(path.join(root, 'posts', 'sample.md'), `---
title: Test Post
date: 2026-05-02 14:30
slug: test-post
excerpt: Generated excerpt
tags:
  - build
categories:
  - notes
---

This is generated from **Markdown**.
`, 'utf8');

  await buildSite({ root });

  const home = await fs.readFile(path.join(root, 'index.html'), 'utf8');
  const post = await fs.readFile(path.join(root, '2026', '05', '02', 'test-post', 'index.html'), 'utf8');
  const archive = await fs.readFile(path.join(root, 'archives', 'index.html'), 'utf8');
  const search = await fs.readFile(path.join(root, 'local-search.xml'), 'utf8');

  assert.match(home, /Test Post/);
  assert.match(home, /\/2026\/05\/02\/test-post\//);
  assert.match(post, /<h1 id="seo-header">Test Post<\/h1>/);
  assert.match(post, /This is generated from <strong>Markdown<\/strong>\./);
  assert.match(archive, /Test Post/);
  assert.match(search, /<title>Test Post<\/title>/);
  assert.match(search, /Generated excerpt/);
});

test('buildSite copies sidecar assets for nested post sources', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-assets-'));
  const postDir = path.join(root, 'posts', 'with-image');
  await fs.mkdir(postDir, { recursive: true });
  await fs.writeFile(path.join(postDir, 'index.md'), `---
title: With Image
date: 2026-05-03 09:00
slug: with-image
excerpt: Image post
---

![diagram](diagram.png)
`, 'utf8');
  await fs.writeFile(path.join(postDir, 'diagram.png'), 'fake image bytes', 'utf8');

  await buildSite({ root });

  const post = await fs.readFile(path.join(root, '2026', '05', '03', 'with-image', 'index.html'), 'utf8');
  const image = await fs.readFile(path.join(root, '2026', '05', '03', 'with-image', 'diagram.png'), 'utf8');

  assert.match(post, /<img src="\/2026\/05\/03\/with-image\/diagram\.png" alt="diagram">/);
  assert.equal(image, 'fake image bytes');
});
