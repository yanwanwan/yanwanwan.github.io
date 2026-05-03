const fs = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_CONFIG = {
  title: 'YanWanWan',
  brand: 'Yww',
  author: 'YanWanWan',
  description: 'notes, logs, and unfinished thoughts',
  baseUrl: 'https://yanwanwan.github.io',
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(value) {
  return escapeHtml(value);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function cdata(value) {
  return String(value).replace(/\]\]>/g, ']]]]><![CDATA[>');
}

function parseFrontMatter(source) {
  const normalized = source.replace(/^\uFEFF/, '');
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new Error('Post is missing front matter');
  }

  const data = {};
  let currentListKey = null;
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim() || line.trimStart().startsWith('#')) {
      continue;
    }

    const listMatch = line.match(/^\s*-\s+(.+)$/);
    if (listMatch && currentListKey) {
      data[currentListKey].push(unquote(listMatch[1].trim()));
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyMatch) {
      throw new Error(`Invalid front matter line: ${line}`);
    }

    const key = keyMatch[1];
    const value = keyMatch[2].trim();
    if (value === '') {
      data[key] = [];
      currentListKey = key;
    } else {
      data[key] = unquote(value);
      currentListKey = null;
    }
  }

  return { data, body: match[2].trim() };
}

function unquote(value) {
  const text = String(value);
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map(String);
  }
  if (!value) {
    return [];
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseDateParts(dateValue) {
  const dateText = String(dateValue || '').trim();
  const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) {
    throw new Error(`Invalid post date: ${dateText}`);
  }

  return {
    year: match[1],
    month: match[2],
    day: match[3],
    hour: match[4] || '00',
    minute: match[5] || '00',
    second: match[6] || '00',
    dateText: `${match[1]}-${match[2]}-${match[3]}`,
    dateTime: `${match[1]}-${match[2]}-${match[3]} ${match[4] || '00'}:${match[5] || '00'}`,
    sortKey: `${match[1]}-${match[2]}-${match[3]}T${match[4] || '00'}:${match[5] || '00'}:${match[6] || '00'}`,
  };
}

function encodeUrlPathPart(value) {
  return encodeURIComponent(String(value)).replace(/%2F/gi, '/');
}

function makePostUrl(parts, slug) {
  return `/${parts.year}/${parts.month}/${parts.day}/${encodeUrlPathPart(slug)}/`;
}

function makeOutputDir(root, parts, slug) {
  return path.join(root, parts.year, parts.month, parts.day, slug);
}

function stripHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function deriveExcerpt(markdown) {
  const firstParagraph = String(markdown)
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .find((block) => block && !block.startsWith('#') && !block.startsWith('```'));
  if (!firstParagraph) {
    return '';
  }
  return stripHtml(renderMarkdown(firstParagraph, '/')).slice(0, 180);
}

function parsePostSource(source, sourcePath = '') {
  const { data, body } = parseFrontMatter(source);
  if (!data.title) {
    throw new Error(`${sourcePath || 'Post'} is missing title`);
  }
  if (!data.date) {
    throw new Error(`${sourcePath || 'Post'} is missing date`);
  }

  const parts = parseDateParts(data.date);
  const slug = String(data.slug || data.title).trim().replace(/[\\/:*?"<>|]+/g, '-');
  if (!slug) {
    throw new Error(`${sourcePath || 'Post'} has an empty slug`);
  }

  const url = makePostUrl(parts, slug);
  const html = renderMarkdown(body, url);
  return {
    title: String(data.title),
    slug,
    sourcePath,
    body,
    html,
    excerpt: data.excerpt ? String(data.excerpt) : deriveExcerpt(body),
    tags: normalizeList(data.tags),
    categories: normalizeList(data.categories),
    year: parts.year,
    month: parts.month,
    day: parts.day,
    dateText: parts.dateText,
    dateTime: parts.dateTime,
    sortKey: parts.sortKey,
    url,
    outputParts: parts,
  };
}

function slugifyHeading(text) {
  const slug = String(text)
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z0-9#]+;/gi, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'section';
}

function resolveContentUrl(url, postUrl) {
  const value = String(url).trim();
  if (/^(?:[a-z]+:)?\/\//i.test(value) || /^[a-z]+:/i.test(value) || value.startsWith('/') || value.startsWith('#')) {
    return value;
  }
  return `${postUrl}${value.split('/').map(encodeURIComponent).join('/')}`;
}

function renderInline(text, postUrl) {
  const codeSpans = [];
  let source = String(text).replace(/`([^`]+)`/g, (_, code) => {
    const token = `@@CODE${codeSpans.length}@@`;
    codeSpans.push(code);
    return token;
  });

  let html = escapeHtml(source);
  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, (_, alt, src, title) => {
    const attrs = [
      `src="${escapeAttribute(resolveContentUrl(src, postUrl))}"`,
      `alt="${escapeAttribute(alt)}"`,
    ];
    if (title) {
      attrs.push(`title="${escapeAttribute(title)}"`);
    }
    return `<img ${attrs.join(' ')}>`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    return `<a href="${escapeAttribute(resolveContentUrl(href, postUrl))}">${label}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  for (let index = 0; index < codeSpans.length; index += 1) {
    html = html.replace(`@@CODE${index}@@`, `<code>${escapeHtml(codeSpans[index])}</code>`);
  }
  return html;
}

function renderMarkdown(markdown, postUrl = '/') {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let paragraph = [];
  let list = null;
  let quote = [];
  let code = null;

  function flushParagraph() {
    if (paragraph.length) {
      const text = paragraph.join(' ');
      if (/^!\[[^\]]*]\([^)]+\)$/.test(text)) {
        html.push(renderInline(text, postUrl));
      } else {
        html.push(`<p>${renderInline(text, postUrl)}</p>`);
      }
      paragraph = [];
    }
  }

  function flushList() {
    if (list) {
      html.push(`<${list.type}>${list.items.map((item) => `<li>${renderInline(item, postUrl)}</li>`).join('')}</${list.type}>`);
      list = null;
    }
  }

  function flushQuote() {
    if (quote.length) {
      html.push(`<blockquote>${quote.map((item) => `<p>${renderInline(item, postUrl)}</p>`).join('')}</blockquote>`);
      quote = [];
    }
  }

  for (const line of lines) {
    const fenceMatch = line.match(/^```([A-Za-z0-9_-]*)\s*$/);
    if (code) {
      if (fenceMatch) {
        const className = code.lang ? ` class="language-${escapeAttribute(code.lang)}"` : '';
        html.push(`<pre><code${className}>${escapeHtml(code.lines.join('\n'))}</code></pre>`);
        code = null;
      } else {
        code.lines.push(line);
      }
      continue;
    }

    if (fenceMatch) {
      flushParagraph();
      flushList();
      flushQuote();
      code = { lang: fenceMatch[1], lines: [] };
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      flushQuote();
      const level = headingMatch[1].length;
      const content = renderInline(headingMatch[2].trim(), postUrl);
      html.push(`<h${level} id="${escapeAttribute(slugifyHeading(headingMatch[2]))}">${content}</h${level}>`);
      continue;
    }

    if (/^ {0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushParagraph();
      flushList();
      flushQuote();
      html.push('<hr>');
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quote.push(quoteMatch[1]);
      continue;
    }

    const unorderedMatch = line.match(/^\s*[-*+]\s+(.+)$/);
    const orderedMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (unorderedMatch || orderedMatch) {
      flushParagraph();
      flushQuote();
      const type = unorderedMatch ? 'ul' : 'ol';
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push((unorderedMatch || orderedMatch)[1]);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushQuote();
  if (code) {
    const className = code.lang ? ` class="language-${escapeAttribute(code.lang)}"` : '';
    html.push(`<pre><code${className}>${escapeHtml(code.lines.join('\n'))}</code></pre>`);
  }
  return html.join('\n');
}

async function readPosts(root) {
  const postsDir = path.join(root, 'posts');
  const files = await collectMarkdownFiles(postsDir).catch(() => []);
  const posts = [];
  for (const filePath of files) {
    const source = await fs.readFile(filePath, 'utf8');
    const post = parsePostSource(source, path.relative(root, filePath));
    post.sourceFile = filePath;
    post.sourceDir = path.dirname(filePath);
    post.postsDir = postsDir;
    posts.push(post);
  }
  posts.sort((a, b) => b.sortKey.localeCompare(a.sortKey) || a.title.localeCompare(b.title));
  return posts;
}

async function collectMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectMarkdownFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(entryPath);
    }
  }
  return files.sort();
}

async function copySidecarAssets(post, outputDir) {
  if (!post.sourceDir || !post.postsDir || path.resolve(post.sourceDir) === path.resolve(post.postsDir)) {
    return;
  }

  async function copyDir(sourceDir, targetDir) {
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });
    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const targetPath = path.join(targetDir, entry.name);
      if (entry.isDirectory()) {
        await copyDir(sourcePath, targetPath);
      } else if (entry.isFile() && !entry.name.endsWith('.md')) {
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.copyFile(sourcePath, targetPath);
      }
    }
  }

  await copyDir(post.sourceDir, outputDir);
}

function renderHead(config, page) {
  const pageTitle = page.title === config.title ? config.title : `${page.title} - ${config.title}`;
  const description = page.description || config.description;
  const canonical = `${config.baseUrl}${page.url || '/'}`;
  return `<!DOCTYPE html>
<html lang="zh-CN" data-default-color-scheme="light">
<head>
  <meta charset="UTF-8">
  <link rel="apple-touch-icon" sizes="76x76" href="/img/fluid.png">
  <link rel="icon" href="/img/fluid.png">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, shrink-to-fit=no">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="theme-color" content="#f7f7f2">
  <meta name="author" content="${escapeAttribute(config.author)}">
  <meta name="description" content="${escapeAttribute(description)}">
  <meta property="og:type" content="${page.type === 'post' ? 'article' : 'website'}">
  <meta property="og:title" content="${escapeAttribute(page.title)}">
  <meta property="og:url" content="${escapeAttribute(canonical)}">
  <meta property="og:site_name" content="${escapeAttribute(config.title)}">
  <meta property="og:description" content="${escapeAttribute(description)}">
  <meta property="og:locale" content="zh_CN">
  <meta name="twitter:card" content="summary_large_image">
  <title>${escapeHtml(pageTitle)}</title>
  <link rel="stylesheet" href="https://lib.baomitu.com/twitter-bootstrap/4.6.1/css/bootstrap.min.css">
  <link rel="stylesheet" href="//at.alicdn.com/t/c/font_1749284_5i9bdhy70f8.css">
  <link rel="stylesheet" href="//at.alicdn.com/t/c/font_1736178_k526ubmyhba.css">
  <link rel="stylesheet" href="/css/main.css">
  <link id="highlight-css" rel="stylesheet" href="/css/highlight.css">
  <link id="highlight-css-dark" rel="stylesheet" href="/css/highlight-dark.css">
  <script id="fluid-configs">
    var Fluid = window.Fluid || {};
    Fluid.ctx = Object.assign({}, Fluid.ctx);
    var CONFIG = {"hostname":"yanwanwan.github.io","root":"/","version":"local","typing":{"enable":false},"anchorjs":{"enable":true,"element":"h1,h2,h3,h4,h5,h6","placement":"left","visible":"hover","icon":""},"progressbar":{"enable":false},"code_language":{"enable":true,"default":"TEXT"},"copy_btn":true,"image_caption":{"enable":true},"image_zoom":{"enable":true,"img_url_replace":["",""]},"toc":{"enable":true,"placement":"right","headingSelector":"h1,h2,h3,h4,h5,h6","collapseDepth":0},"lazyload":{"enable":false,"loading_img":"/img/loading.gif","onlypost":false,"offset_factor":2},"web_analytics":{"enable":false,"follow_dnt":true},"search_path":"/local-search.xml","include_content_in_search":true};
  </script>
  <script src="/js/utils.js"></script>
  <script src="/js/color-schema.js"></script>
</head>`;
}

function renderNav(config) {
  const links = [
    ['/', '首页', 'icon-home-fill'],
    ['/archives/', '归档', 'icon-archive-fill'],
    ['/categories/', '分类', 'icon-category-fill'],
    ['/tags/', '标签', 'icon-tags-fill'],
    ['/about/', '关于', 'icon-user-fill'],
  ];
  const navItems = links.map(([href, label, icon]) => `          <li class="nav-item">
            <a class="nav-link" href="${href}" target="_self">
              <i class="iconfont ${icon}"></i>
              <span>${escapeHtml(label)}</span>
            </a>
          </li>`).join('\n');

  return `<header>
  <div class="header-inner" style="height: 100vh;">
    <nav id="navbar" class="navbar fixed-top navbar-expand-lg navbar-dark scrolling-navbar">
      <div class="container">
        <a class="navbar-brand" href="/">
          <strong>${escapeHtml(config.brand)}</strong>
        </a>
        <button id="navbar-toggler-btn" class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
          <div class="animated-icon"><span></span><span></span><span></span></div>
        </button>
        <div class="collapse navbar-collapse" id="navbarSupportedContent">
          <ul class="navbar-nav ml-auto text-center">
${navItems}
            <li class="nav-item" id="search-btn">
              <a class="nav-link" target="_self" href="javascript:;" data-toggle="modal" data-target="#modalSearch" aria-label="Search">
                <i class="iconfont icon-search"></i>
              </a>
            </li>
            <li class="nav-item" id="color-toggle-btn">
              <a class="nav-link" target="_self" href="javascript:;" aria-label="Color Toggle">
                <i class="iconfont icon-dark"></i>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  </div>
</header>`;
}

function renderSearchModal() {
  return `<div class="modal fade" id="modalSearch" tabindex="-1" role="dialog" aria-labelledby="ModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-scrollable modal-lg" role="document">
    <div class="modal-content">
      <div class="modal-header text-center">
        <h4 class="modal-title w-100 font-weight-bold">搜索</h4>
        <button type="button" id="local-search-close" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body mx-3">
        <div class="md-form mb-5">
          <input type="text" id="local-search-input" class="form-control validate">
          <label data-error="x" data-success="v" for="local-search-input">关键词</label>
        </div>
        <div class="list-group" id="local-search-result"></div>
      </div>
    </div>
  </div>
</div>`;
}

function renderScripts() {
  return `<script src="https://lib.baomitu.com/jquery/3.6.4/jquery.min.js"></script>
<script src="https://lib.baomitu.com/twitter-bootstrap/4.6.1/js/bootstrap.min.js"></script>
<script src="/js/events.js"></script>
<script src="/js/plugins.js"></script>
<script src="/js/local-search.js"></script>
<script src="/js/boot.js"></script>
<noscript>
  <div class="noscript-warning">博客在允许 JavaScript 运行的环境下浏览效果更佳</div>
</noscript>`;
}

function renderLayout(config, page, mainHtml) {
  return `${renderHead(config, page)}
<body>
${renderNav(config)}
<main>
${mainHtml}
</main>
<footer></footer>
${renderSearchModal()}
${renderScripts()}
</body>
</html>
`;
}

function renderBoard(content) {
  return `<div class="container nopadding-x-md">
  <div id="board">
    <div class="container">
      <div class="row">
        <div class="col-12 col-md-10 m-auto">
${content}
        </div>
      </div>
    </div>
  </div>
</div>`;
}

function renderHome(config, posts) {
  const items = posts.map((post) => `          <article class="col-12 col-md-12 mx-auto index-info">
            <h2 class="index-header">
              <a href="${post.url}" target="_self">${escapeHtml(post.title)}</a>
            </h2>
            <a class="index-excerpt index-excerpt__noimg" href="${post.url}" target="_self">
              <div>${escapeHtml(post.excerpt)}</div>
            </a>
            <div class="index-btm post-metas">
              <div class="post-meta mr-3">
                <i class="iconfont icon-date"></i>
                <time datetime="${escapeAttribute(post.dateTime)}" pubdate>${escapeHtml(post.dateText)}</time>
              </div>
            </div>
          </article>`).join('\n');
  return renderLayout(config, { title: config.title, description: config.description, url: '/' }, renderBoard(items));
}

function renderPost(config, post, prev, next) {
  const prevHtml = prev ? `<a href="${prev.url}" title="${escapeAttribute(prev.title)}">
                  <i class="iconfont icon-arrowleft"></i>
                  <span class="hidden-mobile">${escapeHtml(prev.title)}</span>
                </a>` : '';
  const nextHtml = next ? `<a href="${next.url}" title="${escapeAttribute(next.title)}">
                  <span class="hidden-mobile">${escapeHtml(next.title)}</span>
                  <i class="iconfont icon-arrowright"></i>
                </a>` : '';
  const prevNext = `<div class="post-prevnext my-3">
              <article class="post-prev col-6">
                ${prevHtml}
              </article>
              <article class="post-next col-6">
                ${nextHtml}
              </article>
            </div>`;
  const content = `<div class="container nopadding-x-md" id="board-ctn">
  <div id="board">
    <article class="post-content mx-auto">
      <h1 id="seo-header">${escapeHtml(post.title)}</h1>
      <div class="post-metas">
        <div class="post-meta mr-3">
          <i class="iconfont icon-date"></i>
          <time datetime="${escapeAttribute(post.dateTime)}" pubdate>${escapeHtml(post.dateText)}</time>
        </div>
      </div>
      <div class="markdown-body">
${post.html}
      </div>
      ${prevNext}
    </article>
  </div>
</div>`;
  return renderLayout(config, { title: post.title, description: post.excerpt, url: post.url, type: 'post' }, content);
}

function renderArchivePage(config, title, posts) {
  const items = posts.map((post) => `<li><time>${escapeHtml(post.dateText)}</time> <a href="${post.url}">${escapeHtml(post.title)}</a></li>`).join('\n');
  const content = `<article class="post-content mx-auto">
  <h1 id="seo-header">${escapeHtml(title)}</h1>
  <div class="markdown-body">
    <ul>
${items}
    </ul>
  </div>
</article>`;
  return renderLayout(config, { title, description: `${title} - ${config.title}`, url: '/archives/' }, renderBoard(content));
}

function groupBy(posts, keyFn) {
  const map = new Map();
  for (const post of posts) {
    const key = keyFn(post);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(post);
  }
  return map;
}

function renderTaxonomyPage(config, title, posts, field, url) {
  const grouped = new Map();
  for (const post of posts) {
    const terms = post[field];
    for (const term of terms) {
      if (!grouped.has(term)) {
        grouped.set(term, []);
      }
      grouped.get(term).push(post);
    }
  }

  let body = '<p>No entries yet.</p>';
  if (grouped.size) {
    body = Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([term, termPosts]) => `<h2>${escapeHtml(term)}</h2>
<ul>
${termPosts.map((post) => `  <li><time>${escapeHtml(post.dateText)}</time> <a href="${post.url}">${escapeHtml(post.title)}</a></li>`).join('\n')}
</ul>`).join('\n');
  }

  const content = `<article class="post-content mx-auto">
  <h1 id="seo-header">${escapeHtml(title)}</h1>
  <div class="markdown-body">
${body}
  </div>
</article>`;
  return renderLayout(config, { title, description: `${title} - ${config.title}`, url }, renderBoard(content));
}

function renderSearchXml(posts) {
  const entries = posts.map((post) => {
    const content = post.excerpt ? `<p>${escapeHtml(post.excerpt)}</p>\n${post.html}` : post.html;
    return `  <entry>
    <title>${escapeXml(post.title)}</title>
    <url>${escapeXml(post.url)}</url>
    <content type="html"><![CDATA[${cdata(content)}]]></content>
  </entry>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<search>
${entries}
</search>
`;
}

async function writeFile(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, String(content).replace(/[ \t]+$/gm, ''), 'utf8');
}

async function buildSite(options = {}) {
  const root = options.root || process.cwd();
  const config = { ...DEFAULT_CONFIG, ...(options.config || {}) };
  const posts = await readPosts(root);

  await writeFile(root, 'index.html', renderHome(config, posts));

  for (let index = 0; index < posts.length; index += 1) {
    const post = posts[index];
    const outputDir = makeOutputDir(root, post.outputParts, post.slug);
    const relativePath = path.relative(root, path.join(outputDir, 'index.html'));
    await writeFile(root, relativePath, renderPost(config, post, posts[index - 1], posts[index + 1]));
    await copySidecarAssets(post, outputDir);
  }

  await writeFile(root, path.join('archives', 'index.html'), renderArchivePage(config, 'archives', posts));
  for (const [year, yearPosts] of groupBy(posts, (post) => post.year)) {
    await writeFile(root, path.join('archives', year, 'index.html'), renderArchivePage(config, `archives: ${year}`, yearPosts));
    for (const [month, monthPosts] of groupBy(yearPosts, (post) => post.month)) {
      await writeFile(root, path.join('archives', year, month, 'index.html'), renderArchivePage(config, `archives: ${year}-${month}`, monthPosts));
    }
  }

  await writeFile(root, path.join('tags', 'index.html'), renderTaxonomyPage(config, 'tags', posts, 'tags', '/tags/'));
  await writeFile(root, path.join('categories', 'index.html'), renderTaxonomyPage(config, 'categories', posts, 'categories', '/categories/'));

  const searchXml = renderSearchXml(posts);
  await writeFile(root, 'local-search.xml', searchXml);
  await writeFile(root, path.join('xml', 'local-search.xml'), searchXml);

  return { posts };
}

module.exports = {
  buildSite,
  escapeHtml,
  parsePostSource,
  renderMarkdown,
};
