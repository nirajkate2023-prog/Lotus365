/*
=============================================================================
  LOTUS365 - BLOG CORE
  File: js/blog-core.js
  Shared helpers for the blog index, single post view and Blog Studio.
  Markdown is escaped before rendering, so post bodies cannot inject HTML.
=============================================================================
*/
(function (window) {
  'use strict';

  var DATA_URL = 'content/blog/posts.json';

  /* ---------------------------------------------------------------- utils */

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeUrl(url, fallback) {
    var raw = String(url || '').trim();
    if (!raw) return fallback || '';
    // Allow relative paths, http(s) and mailto. Block javascript:, data:, vbscript: and friends.
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^(https?:|mailto:)/i.test(raw)) return fallback || '';
    if (raw.indexOf('//') === 0) return fallback || '';
    return escapeHtml(raw);
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 80);
  }

  function formatDate(value) {
    var date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function toDateTimeAttr(value) {
    var date = new Date(value);
    return isNaN(date.getTime()) ? '' : date.toISOString();
  }

  function readingTime(body) {
    var words = String(body || '')
      .replace(/[#>*`_~\-\[\]()!]/g, ' ')
      .split(/\s+/)
      .filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }

  /* ------------------------------------------------------------- markdown */

  function renderInline(source) {
    var text = escapeHtml(source);

    text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (match, alt, url) {
      var src = safeUrl(url);
      if (!src) return '';
      return '<img src="' + src + '" alt="' + alt + '" loading="lazy">';
    });

    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (match, label, url) {
      var href = safeUrl(url);
      if (!href) return label;
      var external = /^https?:\/\//i.test(String(url).trim());
      return '<a href="' + href + '"' + (external ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + label + '</a>';
    });

    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    text = text.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    text = text.replace(/(^|[\s(])_([^_\n]+)_/g, '$1<em>$2</em>');
    text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    return text;
  }

  function isBlockStart(line) {
    return /^\s*```/.test(line) ||
      /^\s*#{1,4}\s+/.test(line) ||
      /^\s*>\s?/.test(line) ||
      /^\s*[-*+]\s+/.test(line) ||
      /^\s*\d+[.)]\s+/.test(line) ||
      /^\s*([-*_])(\s*\1){2,}\s*$/.test(line);
  }

  function renderMarkdown(markdown) {
    if (!markdown) return '';
    var lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
    var html = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      if (/^\s*$/.test(line)) { i++; continue; }

      // Fenced code block
      if (/^\s*```/.test(line)) {
        var code = [];
        i++;
        while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
          code.push(lines[i]);
          i++;
        }
        i++;
        html.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
        continue;
      }

      // Horizontal rule
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
        html.push('<hr>');
        i++;
        continue;
      }

      // Heading: "#" and "##" both render as h2, "###" as h3, "####" as h4
      var heading = line.match(/^\s*(#{1,4})\s+(.*?)\s*#*\s*$/);
      if (heading) {
        var depth = heading[1].length;
        var level = depth <= 2 ? 2 : depth;
        html.push('<h' + level + '>' + renderInline(heading[2]) + '</h' + level + '>');
        i++;
        continue;
      }

      // Blockquote
      if (/^\s*>\s?/.test(line)) {
        var quote = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, ''));
          i++;
        }
        html.push('<blockquote><p>' + renderInline(quote.join(' ')) + '</p></blockquote>');
        continue;
      }

      // Lists
      var listMatch = line.match(/^\s*([-*+]|\d+[.)])\s+/);
      if (listMatch) {
        var ordered = /\d/.test(listMatch[1]);
        var pattern = ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*+]\s+/;
        var items = [];
        while (i < lines.length && pattern.test(lines[i])) {
          items.push(lines[i].replace(pattern, ''));
          i++;
        }
        var listHtml = items.map(function (item) {
          return '<li>' + renderInline(item) + '</li>';
        }).join('');
        html.push(ordered ? '<ol>' + listHtml + '</ol>' : '<ul>' + listHtml + '</ul>');
        continue;
      }

      // Paragraph
      var paragraph = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !isBlockStart(lines[i])) {
        paragraph.push(lines[i].trim());
        i++;
      }
      if (paragraph.length) {
        html.push('<p>' + renderInline(paragraph.join(' ')) + '</p>');
      } else {
        i++;
      }
    }

    return html.join('\n');
  }

  function plainText(markdown, limit) {
    var text = String(markdown || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[#>*_~`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (limit && text.length > limit) {
      text = text.slice(0, limit).replace(/\s+\S*$/, '') + '...';
    }
    return text;
  }

  /* ------------------------------------------------------------ post data */

  function normalizePost(raw) {
    var body = String(raw.body || '');
    var date = raw.date ? new Date(raw.date) : new Date();
    if (isNaN(date.getTime())) date = new Date();

    return {
      id: String(raw.id || raw.slug || ''),
      slug: String(raw.slug || '').trim(),
      title: String(raw.title || 'Untitled post').trim(),
      excerpt: String(raw.excerpt || '').trim() || plainText(body, 160),
      category: String(raw.category || 'Platform News').trim(),
      tags: Array.isArray(raw.tags) ? raw.tags.map(String) : String(raw.tags || '').split(',').map(function (tag) { return tag.trim(); }).filter(Boolean),
      author: String(raw.author || 'Lotus365 Editorial').trim(),
      date: date.toISOString(),
      cover: String(raw.cover || '').trim(),
      featured: raw.featured === true || raw.featured === 'true',
      published: raw.published !== false && raw.published !== 'false',
      body: body
    };
  }

  var cache = null;

  function loadPosts(force) {
    if (cache && !force) return Promise.resolve(cache);

    return fetch(DATA_URL + '?v=' + Date.now(), { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('Unable to load the blog feed (' + response.status + ')');
        return response.json();
      })
      .then(function (data) {
        var posts = Array.isArray(data) ? data : (data && data.posts) || [];
        posts = posts
          .filter(function (post) { return post && post.slug; })
          .map(normalizePost)
          .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
        cache = posts;
        return posts;
      });
  }

  function publishedPosts(posts) {
    return (posts || []).filter(function (post) { return post.published; });
  }

  function findPost(slug, posts) {
    var wanted = String(slug || '').toLowerCase();
    return (posts || []).filter(function (post) {
      return post.slug.toLowerCase() === wanted;
    })[0] || null;
  }

  function postUrl(post) {
    return '/blog-post?slug=' + encodeURIComponent(typeof post === 'string' ? post : post.slug);
  }

  function categories(posts) {
    var seen = {};
    (posts || []).forEach(function (post) {
      if (post.category) seen[post.category] = true;
    });
    return Object.keys(seen).sort();
  }

  window.LotusBlog = {
    DATA_URL: DATA_URL,
    escapeHtml: escapeHtml,
    safeUrl: safeUrl,
    slugify: slugify,
    formatDate: formatDate,
    toDateTimeAttr: toDateTimeAttr,
    readingTime: readingTime,
    renderInline: renderInline,
    renderMarkdown: renderMarkdown,
    plainText: plainText,
    normalizePost: normalizePost,
    loadPosts: loadPosts,
    publishedPosts: publishedPosts,
    findPost: findPost,
    postUrl: postUrl,
    categories: categories
  };
})(window);
